import { authConfig } from '@/auth'
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

    // VIP 用户不消耗配额
    if (user.isVIP) {
      if (!user.vipExpiresAt || user.vipExpiresAt > new Date()) {
        return NextResponse.json({ success: true })
      }
    }

    // 检查配额是否足够
    if (user.credits <= 0) {
      return NextResponse.json({ error: 'Insufficient credits' }, { status: 400 })
    }

    // 扣除配额
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        credits: { decrement: 1 },
        totalUsage: { increment: 1 },
      },
    })

    // 清除用户配额缓存
    await redis.del(`user:credits:${session.user.id}`)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in consume-credits:', error)
    return NextResponse.json(
      { error: 'Failed to consume credits' },
      { status: 500 }
    )
  }
}
