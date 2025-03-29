import { generateLetter } from '@/lib/minimax'
import { prisma } from '@/lib/prisma'
import { setGenerationStatus } from '@/lib/redis'
import type { Prisma } from '@prisma/client'
import { NextResponse } from 'next/server'

interface LetterWithStatus {
  id: string
  content: string
  imageUrl: string | null
  userId: string
  prompt: string
  status: 'pending' | 'generating' | 'completed' | 'failed'
  metadata: Prisma.JsonValue | null
  language: string
  createdAt: Date
  updatedAt: Date
}

export const runtime = 'nodejs'
export const maxDuration = 60 // 设置为60秒以符合 hobby 计划限制

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 55000) // 55秒超时，留5秒缓冲

  try {
    const { id } = await params

    // 获取信件信息
    const letter = (await prisma.letter.findUnique({
      where: { id },
    })) as LetterWithStatus

    if (!letter) {
      clearTimeout(timeoutId)
      return NextResponse.json({ error: 'Letter not found' }, { status: 404 })
    }

    // 检查是否为匿名信件
    const isAnonymous = letter.metadata ? (letter.metadata as any).isAnonymous === true : false;
    
    if (!isAnonymous) {
      clearTimeout(timeoutId)
      return NextResponse.json({ error: 'Not an anonymous letter' }, { status: 403 })
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
      console.log('[ANONYMOUS_GENERATE] Letter metadata before generation:', letter.metadata)
      
      // 创建metadata对象，确保包含imageUrl
      const generationMetadata = letter.metadata ? JSON.parse(JSON.stringify(letter.metadata)) : {};
      
      // 确保将imageUrl添加到metadata中
      if (letter.imageUrl && !generationMetadata.imageUrl) {
        generationMetadata.imageUrl = letter.imageUrl;
        console.log('[ANONYMOUS_GENERATE] Added image URL to metadata:', letter.imageUrl);
      }
      
      const content = await generateLetter({
        prompt: letter.prompt,
        language: letter.language,
        metadata: generationMetadata,
      });

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
      console.error('[ANONYMOUS_GENERATION_ERROR]', error instanceof Error ? error.message : String(error))
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
    console.error('[ANONYMOUS_LETTER_GENERATE_ERROR]', error instanceof Error ? error.message : String(error))
    return NextResponse.json({ error: 'Failed to generate letter' }, { status: 500 })
  }
} 