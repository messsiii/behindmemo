import { authConfig } from '@/auth'
import { prisma } from '@/lib/prisma'
import { cache } from '@/lib/redis'
import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const session = await getServerSession(authConfig)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 使用缓存获取用户配额，缓存时间缩短到10秒
    const creditsInfo = await cache(
      `user:credits:${session.user.id}`,
      async () => {
        const user = await prisma.user.findUnique({
          where: { id: session.user.id },
          select: {
            credits: true,
            isVIP: true,
            vipExpiresAt: true,
            totalUsage: true,
          },
        })

        // 如果找不到用户，返回默认值而不是抛出错误
        if (!user) {
          console.warn(`User not found: ${session.user.id}`)
          return {
            credits: 0,
            isVIP: false,
            vipExpiresAt: null,
            totalUsage: 0,
          }
        }

        return {
          credits: user.credits,
          isVIP: user.isVIP,
          vipExpiresAt: user.vipExpiresAt,
          totalUsage: user.totalUsage,
        }
      },
      10 // 缓存10秒
    )

    return NextResponse.json(creditsInfo)
  } catch (error) {
    console.error('[CREDITS_API_ERROR]', error)
    return NextResponse.json(
      { error: 'Failed to fetch credits info' },
      { status: 500 }
    )
  }
}
