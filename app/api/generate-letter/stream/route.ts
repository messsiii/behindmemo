import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authConfig } from '@/auth'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const maxDuration = 300 // 设置为5分钟

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authConfig)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const letterId = searchParams.get('id')
    if (!letterId) {
      return NextResponse.json({ error: 'Missing letter ID' }, { status: 400 })
    }

    // 创建流式响应
    const encoder = new TextEncoder()
    const stream = new TransformStream()
    const writer = stream.writable.getWriter()

    // 每秒检查一次信件内容
    const interval = setInterval(async () => {
      try {
        const letter = await prisma.letter.findUnique({
          where: {
            id: letterId,
            userId: session.user.id,
          },
        })

        if (!letter) {
          clearInterval(interval)
          writer.write(encoder.encode('event: error\ndata: Letter not found\n\n'))
          writer.close()
          return
        }

        if (letter.content) {
          writer.write(encoder.encode(`data: ${letter.content}\n\n`))
          if (letter.content.length > 0) {
            clearInterval(interval)
            writer.write(encoder.encode('data: [DONE]\n\n'))
            writer.close()
          }
        }
      } catch (error) {
        clearInterval(interval)
        writer.write(
          encoder.encode(
            `event: error\ndata: ${error instanceof Error ? error.message : 'Unknown error'}\n\n`
          )
        )
        writer.close()
      }
    }, 1000)

    // 5分钟后自动关闭
    setTimeout(() => {
      clearInterval(interval)
      writer.write(encoder.encode('event: error\ndata: Generation timeout\n\n'))
      writer.close()
    }, 300000)

    return new Response(stream.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (error) {
    console.warn('[STREAM_WARNING]', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
