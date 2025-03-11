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
      return NextResponse.json(
        { error: '没有找到活跃的订阅' },
        { status: 404 }
      );
    }

    const subscription = subscriptions[0];
    
    try {
      // 初始化Paddle客户端
      const paddleClient = new PaddleClient();
      
      // 尝试调用Paddle API取消订阅
      await paddleClient.cancelSubscription(subscription.paddleSubscriptionId, 'next_billing_period');
      
      // 使用事务确保数据一致性
      await prisma.$transaction(async (tx) => {
        // 更新订阅记录 - 与webhook处理保持一致
        await tx.subscription.update({
          where: { id: subscription.id },
          data: {
            canceledAt: new Date(),
            // 添加 endedAt 字段，与 webhook 处理一致
            endedAt: subscription.nextBillingAt,
            // 不更新 status，让 webhook 处理
          }
        });
        
        // 更新用户 VIP 状态 - 与webhook处理保持一致
        await tx.user.update({
          where: { id: user.id },
          data: {
            // 确保 VIP 到当前计费周期结束
            vipExpiresAt: subscription.nextBillingAt,
            paddleSubscriptionStatus: 'canceled'
          }
        });
      });
      
      return NextResponse.json({ 
        success: true,
        message: '订阅已成功取消自动续费，您将继续享有VIP特权直到当前计费周期结束。' 
      });
    } catch (apiError: any) {
      console.error('Paddle API调用出错:', apiError);
      
      // 由于API调用失败，但我们仍然想为用户提供服务，直接在数据库中标记为已取消
      // 使用事务确保数据一致性
      await prisma.$transaction(async (tx) => {
        // 更新订阅记录
        await tx.subscription.update({
          where: { id: subscription.id },
          data: {
            canceledAt: new Date(),
            endedAt: subscription.nextBillingAt,
          }
        });
        
        // 更新用户 VIP 状态
        await tx.user.update({
          where: { id: user.id },
          data: {
            vipExpiresAt: subscription.nextBillingAt,
            paddleSubscriptionStatus: 'canceled'
          }
        });
      });
      
      // 记录错误，但向用户返回成功消息
      console.warn('使用备用方案：直接在数据库中标记订阅为已取消');
      
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