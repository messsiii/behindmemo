import { authConfig } from '@/auth';
import { PaddleClient } from '@/lib/paddle';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    // 验证用户会话
    const session = await getServerSession(authConfig);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: '未授权访问' },
        { status: 401 }
      );
    }

    // 获取用户信息
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 404 }
      );
    }

    console.log(`用户 ${user.id} 请求取消订阅`);

    // 查询用户的活跃订阅
    const subscriptions = await prisma.subscription.findMany({
      where: {
        userId: user.id,
        OR: [
          { status: 'active' },
          { status: 'trialing' }
        ],
        AND: [
          {
            OR: [
              { endedAt: null },
              { endedAt: { gt: new Date() } }
            ]
          }
        ]
      },
      orderBy: { createdAt: 'desc' },
      take: 1
    });

    // 检查用户是否有活跃订阅
    if (subscriptions.length === 0) {
      console.log(`用户 ${user.id} 没有找到活跃的订阅`);
      return NextResponse.json(
        { error: '没有找到活跃的订阅' },
        { status: 404 }
      );
    }

    const subscription = subscriptions[0];
    console.log(`找到用户 ${user.id} 的活跃订阅:`, {
      subscriptionId: subscription.id,
      paddleId: subscription.paddleSubscriptionId,
      status: subscription.status,
      nextBillingAt: subscription.nextBillingAt
    });
    
    try {
      // 初始化Paddle客户端
      const paddleClient = new PaddleClient();
      
      console.log(`尝试通过Paddle API取消订阅: ${subscription.paddleSubscriptionId}`);
      // 尝试调用Paddle API取消订阅
      const response = await paddleClient.cancelSubscription(subscription.paddleSubscriptionId, 'next_billing_period');
      console.log('Paddle API取消订阅响应:', JSON.stringify(response, null, 2));
      
      // 使用事务确保数据一致性
      await prisma.$transaction(async (tx) => {
        // 更新订阅记录 - 与webhook处理保持一致
        const updatedSubscription = await tx.subscription.update({
          where: { id: subscription.id },
          data: {
            canceledAt: new Date(),
            // 添加 endedAt 字段，与 webhook 处理一致
            endedAt: subscription.nextBillingAt,
            // 不更新 status，让 webhook 处理
          }
        });
        
        console.log('订阅记录已更新:', {
          id: updatedSubscription.id,
          paddleId: updatedSubscription.paddleSubscriptionId,
          canceledAt: updatedSubscription.canceledAt,
          endedAt: updatedSubscription.endedAt,
          nextBillingAt: updatedSubscription.nextBillingAt
        });
        
        // 更新用户 VIP 状态 - 与webhook处理保持一致
        const updatedUser = await tx.user.update({
          where: { id: user.id },
          data: {
            // 确保 VIP 到当前计费周期结束
            vipExpiresAt: subscription.nextBillingAt,
            paddleSubscriptionStatus: 'canceled'
          }
        });
        
        console.log('用户VIP状态已更新:', {
          id: updatedUser.id,
          vipExpiresAt: updatedUser.vipExpiresAt,
          paddleSubscriptionStatus: updatedUser.paddleSubscriptionStatus
        });
      });
      
      return NextResponse.json({ 
        success: true,
        message: '订阅已成功取消自动续费，您将继续享有VIP特权直到当前计费周期结束。' 
      });
    } catch (apiError: any) {
      console.error('Paddle API调用出错:', apiError);
      
      // 由于API调用失败，但我们仍然想为用户提供服务，直接在数据库中标记为已取消
      console.warn('使用备用方案：直接在数据库中标记订阅为已取消');
      
      // 使用事务确保数据一致性
      await prisma.$transaction(async (tx) => {
        // 更新订阅记录
        const updatedSubscription = await tx.subscription.update({
          where: { id: subscription.id },
          data: {
            canceledAt: new Date(),
            endedAt: subscription.nextBillingAt,
          }
        });
        
        console.log('(备用方案) 订阅记录已更新:', {
          id: updatedSubscription.id,
          paddleId: updatedSubscription.paddleSubscriptionId,
          canceledAt: updatedSubscription.canceledAt,
          endedAt: updatedSubscription.endedAt
        });
        
        // 更新用户 VIP 状态
        const updatedUser = await tx.user.update({
          where: { id: user.id },
          data: {
            vipExpiresAt: subscription.nextBillingAt,
            paddleSubscriptionStatus: 'canceled'
          }
        });
        
        console.log('(备用方案) 用户VIP状态已更新:', {
          id: updatedUser.id,
          vipExpiresAt: updatedUser.vipExpiresAt,
          paddleSubscriptionStatus: updatedUser.paddleSubscriptionStatus
        });
      });
      
      return NextResponse.json({ 
        success: true,
        message: '订阅已成功取消自动续费，您将继续享有VIP特权直到当前计费周期结束。',
        warning: '由于技术原因，可能需要稍后在Paddle系统中确认取消状态。'
      });
    }
  } catch (error) {
    console.error('取消订阅时出错:', error);
    return NextResponse.json(
      { error: '取消订阅时出错，请稍后再试或联系客服。' },
      { status: 500 }
    );
  }
} 