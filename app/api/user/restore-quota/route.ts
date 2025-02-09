import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authConfig } from '@/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST() {
  try {
    const session = await getServerSession(authConfig)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 恢复一个配额
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        quota: { increment: 1 },
        totalUsage: { decrement: 1 },
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[RESTORE_QUOTA_API_ERROR]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
