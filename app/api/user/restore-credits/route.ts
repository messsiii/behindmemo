import { authConfig } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'

export async function POST(_req: Request) {
  try {
    const session = await getServerSession(authConfig)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 恢复配额
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        credits: 2,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in restore-credits:', error)
    return NextResponse.json(
      { error: 'Failed to restore credits' },
      { status: 500 }
    )
  }
}
