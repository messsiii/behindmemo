import { authConfig } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    let session = null
    try {
      session = await getServerSession(authConfig)
    } catch (sessionError) {
      console.error('[GET_LETTER_SESSION_ERROR]', sessionError)
      // 继续处理，但 session 为 null
    }
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const letter = await prisma.letter.findUnique({
      where: { id },
      include: { user: true },
    })

    if (!letter) {
      return NextResponse.json({ error: 'Letter not found' }, { status: 404 })
    }

    // 验证权限 - 允许查看自己的信件或匿名信件
    const isAnonymous = letter.metadata && (letter.metadata as any).isAnonymous === true
    if (letter.userId !== session.user.id && !isAnonymous) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({
      success: true,
      letter,
    })
  } catch (error) {
    console.error('[GET_LETTER_ERROR]', error)
    return NextResponse.json({ error: 'Failed to get letter' }, { status: 500 })
  }
}
