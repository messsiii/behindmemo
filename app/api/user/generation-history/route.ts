import { authConfig } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 从查询参数获取分页信息
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100) // 最大100条
    const offset = parseInt(searchParams.get('offset') || '0')


    // 获取用户的生成历史，按创建时间倒序
    const records = await prisma.imageGeneration.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      skip: offset,
      select: {
        id: true,
        prompt: true,
        inputImageUrl: true,
        outputImageUrl: true,
        localOutputImageUrl: true,
        status: true,
        creditsUsed: true,
        errorMessage: true,
        createdAt: true,
        updatedAt: true,
        model: true,
        metadata: true,
      },
    })


    // 获取总数（用于判断是否还有更多数据）
    const totalCount = await prisma.imageGeneration.count({
      where: {
        userId: session.user.id,
      },
    })


    return NextResponse.json({ 
      records,
      pagination: {
        offset,
        limit,
        totalCount,
        hasMore: offset + records.length < totalCount
      }
    })
  } catch (error) {
    console.error('[GENERATION_HISTORY_ERROR]', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 