import { authConfig } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { NextResponse } from 'next/server';

/**
 * 恢复订阅状态的API
 * 注意: 此API仅用于开发和测试目的，不应在生产环境中使用
 */
export async function POST() {
  try {
    // 仅允许在非生产环境使用
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: '此API仅供开发测试使用' },
        { status: 403 }
      );
    }

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

    // 查询用户的所有订阅，包括已取消的
    const subscriptions = await prisma.subscription.findMany({
      where: {
        userId: user.id,
      },
      orderBy: { createdAt: 'desc' },
    });

    // 如果没有订阅记录
    if (subscriptions.length === 0) {
      return NextResponse.json(
        { error: '没有找到任何订阅记录' },
        { status: 404 }
      );
    }

    // 获取最新的订阅记录
    const latestSubscription = subscriptions[0];
    
    console.log(`正在恢复订阅 ${latestSubscription.id} (Paddle ID: ${latestSubscription.paddleSubscriptionId}) 的状态`);
    console.log(`当前状态: ${latestSubscription.status}, 取消时间: ${latestSubscription.canceledAt}`);
    
    // 更新订阅状态为活跃
    await prisma.subscription.update({
      where: { id: latestSubscription.id },
      data: {
        status: 'active',
        canceledAt: null,
      }
    });
    
    // 确保用户VIP状态有效，并设置到下一个计费周期结束
    await prisma.user.update({
      where: { id: user.id },
      data: {
        isVIP: true,
        vipExpiresAt: latestSubscription.nextBillingAt,
        paddleSubscriptionStatus: 'active'
      }
    });
    
    console.log(`订阅状态已恢复为active，已移除canceledAt标记`);
    
    return NextResponse.json({ 
      success: true,
      message: '订阅状态已成功恢复，可以继续测试取消功能',
      subscription: {
        id: latestSubscription.id,
        paddleSubscriptionId: latestSubscription.paddleSubscriptionId,
        status: 'active',
        nextBillingAt: latestSubscription.nextBillingAt
      }
    });
  } catch (error) {
    console.error('恢复订阅状态时出错:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
} 