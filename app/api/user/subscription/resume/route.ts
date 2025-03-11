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

    // 查询用户的已取消订阅
    const subscription = await prisma.subscription.findFirst({
      where: {
        userId: user.id,
        status: 'active',
        canceledAt: { not: null },
      },
      orderBy: { createdAt: 'desc' },
    });

    // 检查用户是否有已取消的订阅
    if (!subscription) {
      return NextResponse.json(
        { error: '没有找到已取消的活跃订阅' },
        { status: 404 }
      );
    }

    try {
      // 初始化Paddle客户端
      const paddleClient = new PaddleClient();
      
      // 调用Paddle API恢复订阅
      console.log(`尝试恢复订阅: ${subscription.paddleSubscriptionId}`);
      
      // 根据Paddle API文档，恢复订阅可能需要PATCH请求来更新订阅状态
      const response = await fetch(
        `${paddleClient.getBaseUrl()}/subscriptions/${subscription.paddleSubscriptionId}`, 
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${process.env.PADDLE_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            scheduled_change: null  // 移除计划的更改
          })
        }
      );
      
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Paddle API错误: ${response.status} ${errorData}`);
      }
      
      const responseData = await response.json();
      console.log('Paddle API响应:', responseData);
      
      // 使用事务确保数据一致性
      await prisma.$transaction(async (tx) => {
        // 更新订阅记录
        await tx.subscription.update({
          where: { id: subscription.id },
          data: {
            canceledAt: null,
            endedAt: null,
            // 更多字段更新可以根据 Paddle API 响应数据添加
          }
        });
        
        // 更新用户 VIP 状态 - 与 webhook 处理保持一致
        await tx.user.update({
          where: { id: user.id },
          data: {
            isVIP: true,
            // 确保 VIP 到下一个计费周期结束
            vipExpiresAt: subscription.nextBillingAt,
            paddleSubscriptionStatus: 'active'
          }
        });
      });
      
      return NextResponse.json({ 
        success: true,
        message: '订阅已成功恢复，自动续费已重新开启。' 
      });
    } catch (apiError: any) {
      console.error('Paddle API调用出错:', apiError);
      
      return NextResponse.json({ 
        error: '恢复订阅失败，请稍后再试或联系客服。',
        details: apiError.message
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('恢复订阅时出错:', error);
    return NextResponse.json(
      { error: '服务器错误', details: error.message },
      { status: 500 }
    );
  }
} 