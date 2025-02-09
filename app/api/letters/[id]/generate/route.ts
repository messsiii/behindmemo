import { authConfig } from '@/auth'
import { generateLetter } from '@/lib/minimax'
import { prisma } from '@/lib/prisma'
import { setGenerationStatus } from '@/lib/redis'
import { Letter, Prisma } from '@prisma/client'
import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'

interface LetterWithStatus extends Letter {
  status: 'pending' | 'generating' | 'completed' | 'failed'
  metadata: Prisma.JsonValue | null
}

export const runtime = 'nodejs'
export const maxDuration = 300 // 设置为5分钟

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 280000) // 4分40秒超时

  try {
    const session = await getServerSession(authConfig)
    if (!session?.user?.email) {
      clearTimeout(timeoutId)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // 获取用户信息
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, quota: true, isVIP: true },
    })

    if (!user) {
      clearTimeout(timeoutId)
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // 获取信件信息
    const letter = (await prisma.letter.findUnique({
      where: { id },
    })) as LetterWithStatus

    if (!letter) {
      clearTimeout(timeoutId)
      return NextResponse.json({ error: 'Letter not found' }, { status: 404 })
    }

    // 检查权限
    if (letter.userId !== user.id) {
      clearTimeout(timeoutId)
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    // 检查信件状态
    if (letter.status === 'completed' && letter.content) {
      return NextResponse.json({
        success: true,
        content: letter.content,
      })
    }

    // 更新信件状态为生成中
    await prisma.$executeRaw`
      UPDATE letters 
      SET status = 'generating' 
      WHERE id = ${id}
    `

    // 设置生成状态
    await setGenerationStatus(id, 'pending')

    try {
      // 生成信件内容
      const content = await generateLetter({
        prompt: letter.prompt,
        language: letter.language,
        metadata: letter.metadata ? JSON.parse(JSON.stringify(letter.metadata)) : undefined,
      })

      // 验证生成的内容
      if (!content || content.trim() === '') {
        await prisma.$executeRaw`
          UPDATE letters 
          SET status = 'failed' 
          WHERE id = ${id}
        `
        await setGenerationStatus(id, 'failed', 0, 'Generated content is empty')
        throw new Error('Generated content is empty')
      }

      // 更新信件
      await prisma.$executeRaw`
        UPDATE letters 
        SET content = ${content.trim()}, status = 'completed' 
        WHERE id = ${id}
      `

      // 设置完成状态
      await setGenerationStatus(id, 'completed', 100)

      clearTimeout(timeoutId)
      return NextResponse.json({
        success: true,
        content: content.trim(),
      })
    } catch (error) {
      // 设置失败状态
      await setGenerationStatus(
        id,
        'failed',
        0,
        error instanceof Error ? error.message : 'Generation failed'
      )

      // 更新信件状态
      await prisma.$executeRaw`
        UPDATE letters 
        SET status = 'failed' 
        WHERE id = ${id}
      `

      clearTimeout(timeoutId)
      console.error('[GENERATION_ERROR]', error instanceof Error ? error.message : String(error))
      return NextResponse.json(
        {
          error: 'Generation failed',
          details: error instanceof Error ? error.message : String(error),
        },
        { status: 500 }
      )
    }
  } catch (error) {
    clearTimeout(timeoutId)
    console.error('[LETTER_GENERATE_ERROR]', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: 'Failed to generate letter' }, { status: 500 })
  }
}
