import { authConfig } from '@/auth'
import { prisma } from '@/lib/prisma'
import { cache } from '@/lib/redis'
import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authConfig)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 获取分页参数
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const skip = (page - 1) * limit

    // 使用缓存获取信件列表
    const cacheKey = `user:letters:${session.user.id}:${page}:${limit}`
    const letters = await cache(
      cacheKey,
      async () => {
        const [letters, total] = await Promise.all([
          prisma.letter.findMany({
            where: { userId: session.user.id },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
            select: {
              id: true,
              content: true,
              imageUrl: true,
              createdAt: true,
              prompt: true,
              language: true,
            },
          }),
          prisma.letter.count({
            where: { userId: session.user.id },
          }),
        ])

        return {
          letters,
          pagination: {
            total,
            pages: Math.ceil(total / limit),
            current: page,
            limit,
          },
        }
      },
      60 // 缓存60秒
    )

    return NextResponse.json(letters)
  } catch (error) {
    console.error('[LETTERS_API_ERROR]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authConfig)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { name, loverName, story, imageUrl, metadata } = body

    // 验证必填字段
    if (!name || !loverName || !story || !imageUrl) {
      return NextResponse.json(
        {
          error: 'Missing required fields',
        },
        { status: 400 }
      )
    }

    // 创建信件记录
    const letter = await prisma.letter.create({
      data: {
        userId: session.user.id,
        content: '',
        imageUrl,
        prompt: `From ${name} to ${loverName}: ${story}`,
        status: 'pending',
        language: 'en',
        metadata,
      },
    })

    return NextResponse.json({
      success: true,
      id: letter.id,
    })
  } catch (error) {
    console.error('[CREATE_LETTER_ERROR]', error)
    return NextResponse.json({ error: 'Failed to create letter' }, { status: 500 })
  }
}
