import { authConfig } from '@/auth'
import { CREDITS_PER_GENERATION } from '@/lib/constants'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'
import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authConfig)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 获取请求ID
    const requestId = req.headers.get('X-Request-Id')
    if (!requestId) {
      return NextResponse.json({ error: 'Missing request ID' }, { status: 400 })
    }

    // 检查用户配额
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { credits: true, isVIP: true, vipExpiresAt: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // 检查用户是否是有效的VIP
    const isActiveVIP = user.isVIP && (!user.vipExpiresAt || user.vipExpiresAt > new Date())

    // 如果不是VIP，检查配额是否足够
    if (!isActiveVIP && user.credits < CREDITS_PER_GENERATION) {
      return NextResponse.json({ 
        error: 'Insufficient credits',
        required: CREDITS_PER_GENERATION,
        available: user.credits,
        isVIP: isActiveVIP
      }, { status: 400 })
    }

    // 只有非VIP用户才扣除配额
    if (!isActiveVIP) {
      await prisma.user.update({
        where: { id: session.user.id },
        data: {
          credits: { decrement: CREDITS_PER_GENERATION },
          totalUsage: { increment: CREDITS_PER_GENERATION },
        },
      })
      
      // 清除用户配额缓存
      await redis.del(`user:credits:${session.user.id}`)
    }

    return NextResponse.json({ 
      success: true,
      creditsUsed: isActiveVIP ? 0 : CREDITS_PER_GENERATION,
      creditsRemaining: isActiveVIP ? user.credits : user.credits - CREDITS_PER_GENERATION,
      isVIP: isActiveVIP
    })
  } catch (error) {
    console.error('Error in consume-credits:', error)
    return NextResponse.json(
      { error: 'Failed to consume credits' },
      { status: 500 }
    )
  }
}
