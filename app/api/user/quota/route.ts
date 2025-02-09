import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authConfig } from '@/auth'
import { prisma } from '@/lib/prisma'
import { cache } from '@/lib/redis'

export async function GET() {
  try {
    const session = await getServerSession(authConfig)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 使用缓存获取用户配额
    const quotaInfo = await cache(
      `user:quota:${session.user.id}`,
      async () => {
        const user = await prisma.user.findUnique({
          where: { id: session.user.id },
          select: {
            quota: true,
            totalUsage: true,
            isVIP: true,
            vipExpiresAt: true,
          },
        })

        // 如果找不到用户，返回默认值而不是抛出错误
        if (!user) {
          console.warn(`User not found: ${session.user.id}`)
          return {
            quota: 0,
            totalUsage: 0,
            isVIP: false,
            vipExpiresAt: null,
            unlimited: false,
          }
        }

        return {
          quota: user.quota,
          totalUsage: user.totalUsage,
          isVIP: user.isVIP,
          vipExpiresAt: user.vipExpiresAt,
          unlimited: user.isVIP && user.vipExpiresAt && user.vipExpiresAt > new Date(),
        }
      },
      30 // 缓存30秒
    )

    return NextResponse.json(quotaInfo)
  } catch (error) {
    console.error('[QUOTA_API_ERROR]', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
