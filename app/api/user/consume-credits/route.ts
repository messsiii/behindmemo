import { authConfig } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'
import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'

const CREDITS_PER_GENERATION = 10 // 每次生成消耗的点数

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

    // 检查配额是否足够
    if (user.credits < CREDITS_PER_GENERATION) {
      return NextResponse.json({ 
        error: 'Insufficient credits',
        required: CREDITS_PER_GENERATION,
        available: user.credits,
        isVIP: user.isVIP && (!user.vipExpiresAt || user.vipExpiresAt > new Date())
      }, { status: 400 })
    }

    // 扣除配额
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        credits: { decrement: CREDITS_PER_GENERATION },
        totalUsage: { increment: CREDITS_PER_GENERATION },
      },
    })

    // 清除用户配额缓存
    await redis.del(`user:credits:${session.user.id}`)

    return NextResponse.json({ 
      success: true,
      creditsUsed: CREDITS_PER_GENERATION,
      creditsRemaining: user.credits - CREDITS_PER_GENERATION,
      isVIP: user.isVIP && (!user.vipExpiresAt || user.vipExpiresAt > new Date())
    })
  } catch (error) {
    console.error('Error in consume-credits:', error)
    return NextResponse.json(
      { error: 'Failed to consume credits' },
      { status: 500 }
    )
  }
}
