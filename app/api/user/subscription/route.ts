import { authConfig } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const session = await getServerSession(authConfig)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权' }, { status: 401 })
    }
    
    const userId = session.user.id
    
    // 查询用户最新的活跃订阅
    const subscription = await prisma.subscription.findFirst({
      where: { 
        userId,
        status: {
          in: ['active', 'trialing']
        },
        OR: [
          { endedAt: null },
          { endedAt: { gt: new Date() } }
        ]
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        paddleSubscriptionId: true,
        status: true,
        planType: true,
        startedAt: true,
        nextBillingAt: true,
        canceledAt: true,
        endedAt: true,
        metadata: true
      }
    })
    
    // 如果没有活跃订阅，返回 null
    return NextResponse.json(subscription)
  } catch (error) {
    console.error('获取订阅信息失败:', error)
    return NextResponse.json({ error: '获取订阅信息失败' }, { status: 500 })
  }
} 