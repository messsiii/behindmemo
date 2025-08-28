import { authConfig } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const session = await getServerSession(authConfig)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 暂时绕过缓存，直接查询数据库
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        credits: true,
        isVIP: true,
        vipExpiresAt: true,
        totalUsage: true,
      },
    })

    // 如果找不到用户，返回默认值
    if (!user) {
      console.warn(`User not found: ${session.user.id}`)
      return NextResponse.json({
        credits: 0,
        isVIP: false,
        vipExpiresAt: null,
        totalUsage: 0,
      })
    }

    const creditsInfo = {
      credits: user.credits,
      isVIP: user.isVIP,
      vipExpiresAt: user.vipExpiresAt,
      totalUsage: user.totalUsage,
    }

    return NextResponse.json(creditsInfo)
  } catch (error) {
    console.error('[CREDITS_API_ERROR]', error)
    return NextResponse.json(
      { error: 'Failed to fetch credits info' },
      { status: 500 }
    )
  }
}
