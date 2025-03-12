import { authConfig } from '@/auth'
import { PaddleClient } from '@/lib/paddle'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth/next'
import { NextResponse } from 'next/server'

// 同步 Paddle 订阅到本地系统
async function syncPaddleSubscription(userId: string, paddleSubscription: any) {
  try {
    await prisma.$transaction(async (tx) => {
      // 创建订阅记录
      await tx.subscription.create({
        data: {
          userId: userId,
          paddleSubscriptionId: paddleSubscription.id,
          status: paddleSubscription.status,
          planType: 'monthly',
          priceId: paddleSubscription.items[0]?.price.id || '',
          startedAt: new Date(paddleSubscription.current_billing_period.starts_at),
          nextBillingAt: new Date(paddleSubscription.current_billing_period.ends_at),
          metadata: paddleSubscription
        }
      })
      
      // 更新用户 VIP 状态
      await tx.user.update({
        where: { id: userId },
        data: {
          isVIP: true,
          vipExpiresAt: new Date(paddleSubscription.current_billing_period.ends_at),
          paddleSubscriptionId: paddleSubscription.id,
          paddleSubscriptionStatus: paddleSubscription.status
        }
      })
    })
    
    console.log(`成功同步 Paddle 订阅 ${paddleSubscription.id} 到用户 ${userId}`)
    return true
  } catch (error) {
    console.error('同步 Paddle 订阅失败:', error)
    return false
  }
}

export async function GET() {
  try {
    // 验证用户授权
    const session = await getServerSession(authConfig)
    if (!session?.user) {
      return NextResponse.json({ error: '未授权' }, { status: 401 })
    }
    
    console.log(`检查用户 ${session.user.id} 的订阅状态`)
    
    // 检查本地系统中的订阅
    const localSubscription = await prisma.subscription.findFirst({
      where: {
        userId: session.user.id,
        status: { in: ['active', 'past_due'] }
      }
    })
    
    if (localSubscription) {
      console.log(`在本地系统找到活跃订阅: ${localSubscription.paddleSubscriptionId}`)
      return NextResponse.json({
        hasActiveSubscription: true,
        subscription: localSubscription,
        source: 'local'
      })
    }
    
    // 检查用户是否有 Paddle 客户 ID
    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    })
    
    if (user?.paddleCustomerId) {
      console.log(`尝试从 Paddle 获取用户 ${user.paddleCustomerId} 的订阅`)
      
      // 查询 Paddle API 获取用户的订阅
      const paddleClient = new PaddleClient()
      
      try {
        const paddleSubscriptions = await paddleClient.getCustomerSubscriptions(user.paddleCustomerId)
        
        // 检查是否有活跃订阅
        const activeSubscription = paddleSubscriptions.data.find(
          (sub: any) => ['active', 'past_due'].includes(sub.status)
        )
        
        if (activeSubscription) {
          console.log(`在 Paddle 找到活跃订阅: ${activeSubscription.id}，正在同步到本地系统`)
          
          // 将 Paddle 订阅同步到本地
          const synced = await syncPaddleSubscription(session.user.id, activeSubscription)
          
          return NextResponse.json({
            hasActiveSubscription: true,
            subscription: activeSubscription,
            source: 'paddle',
            synced
          })
        } else {
          console.log(`在 Paddle 未找到用户 ${user.paddleCustomerId} 的活跃订阅`)
        }
      } catch (paddleError) {
        console.error('Paddle API 查询失败:', paddleError)
        // 即使 Paddle 查询失败，仍然继续流程
      }
    } else {
      console.log(`用户 ${session.user.id} 没有关联的 Paddle 客户 ID`)
    }
    
    // 没有找到活跃订阅
    return NextResponse.json({ hasActiveSubscription: false })
  } catch (error) {
    console.error('检查订阅状态出错:', error)
    return NextResponse.json({ 
      error: '服务器错误', 
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
} 