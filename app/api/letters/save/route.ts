import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authConfig } from '@/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authConfig)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { content, imageUrl, prompt, language } = await request.json()

    if (!content || !imageUrl || !prompt) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const letter = await prisma.letter.create({
      data: {
        content,
        imageUrl,
        prompt,
        language,
        userId: session.user.id,
      },
    })

    return NextResponse.json(letter)
  } catch (error) {
    console.error('[SAVE_LETTER_API_ERROR]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
