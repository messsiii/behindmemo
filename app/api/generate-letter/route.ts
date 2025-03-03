import { authConfig } from '@/auth'
import { CREDITS_PER_GENERATION } from '@/lib/constants'
import { prisma } from '@/lib/prisma'
import { letterQueue } from '@/lib/queue'
import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 60 // 设置为60秒以符合 hobby 计划限制

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authConfig)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 获取请求ID
    const requestId = req.headers.get('X-Request-Id')
    if (!requestId) {
      return NextResponse.json({ error: 'Missing request ID' }, { status: 400 })
    }

    let body
    try {
      body = await req.json()
    } catch (error) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const { name, loverName, story, blobUrl, metadata } = body

    // 验证所有必填字段
    const requiredFields = {
      name: name?.trim(),
      loverName: loverName?.trim(),
      story: story?.trim(),
      blobUrl: blobUrl?.trim(),
    }

    const missingFields = Object.entries(requiredFields)
      .filter(([_, value]) => !value)
      .map(([key]) => key)

    if (missingFields.length > 0) {
      console.warn('Missing fields:', missingFields)
      return NextResponse.json(
        {
          error: 'Missing required fields',
          missingFields,
        },
        { status: 400 }
      )
    }

    // 消耗配额
    const consumeResponse = await fetch(new URL('/api/user/consume-credits', req.url).toString(), {
      method: 'POST',
      headers: {
        'X-Request-Id': requestId,
        Cookie: req.headers.get('cookie') || '',
      },
    })

    if (!consumeResponse.ok) {
      throw new Error('Failed to consume credits')
    }

    // 解析consumeResponse获取VIP状态和实际消耗的点数
    const consumeData = await consumeResponse.json()
    const isVIP = consumeData.isVIP || false
    const creditsUsed = consumeData.creditsUsed || CREDITS_PER_GENERATION

    // 创建信件记录，并保存VIP状态到metadata
    const letter = await prisma.letter.create({
      data: {
        userId: session.user.id,
        content: '',
        imageUrl: blobUrl,
        prompt: `From ${name} to ${loverName}: ${story}`,
        language: 'en',
        metadata: {
          ...metadata,
          isVIP: isVIP,
          creditsUsed: creditsUsed
        },
        status: 'pending',
      },
    })

    // 将任务添加到队列
    await letterQueue.enqueue(letter.id)

    // 获取队列状态
    const queueStatus = await letterQueue.getStatus()

    // 返回信件 ID 和预估等待时间
    return NextResponse.json(
      {
        success: true,
        letterId: letter.id,
        estimatedWaitMinutes: queueStatus.estimatedWaitMinutes,
      },
      {
        headers: {
          'X-Letter-ID': letter.id,
        },
      }
    )
  } catch (error) {
    console.error('[GENERATE_LETTER_ERROR]', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

// 获取信件状态应该通过 /api/letters/[id] 路由
