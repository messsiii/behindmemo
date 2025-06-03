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

    // 获取用户的生成历史，按创建时间倒序
    const records = await prisma.imageGeneration.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
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
      },
    })

    return NextResponse.json({ records })
  } catch (error) {
    console.error('Error fetching generation history:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 