import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authConfig } from '@/auth'
import { prisma } from '@/lib/prisma'

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

    // 检查用户状态
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { quota: true, isVIP: true, vipExpiresAt: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // VIP 用户不消耗配额，只增加使用次数
    if (user.isVIP && user.vipExpiresAt && user.vipExpiresAt > new Date()) {
      await prisma.user.update({
        where: { id: session.user.id },
        data: {
          totalUsage: { increment: 1 },
        },
      })
      return NextResponse.json({ success: true })
    }

    // 检查普通用户配额
    if (user.quota <= 0) {
      return NextResponse.json({ error: 'Insufficient quota' }, { status: 400 })
    }

    // 消耗配额并增加使用次数
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        quota: { decrement: 1 },
        totalUsage: { increment: 1 },
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in consume-quota:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
