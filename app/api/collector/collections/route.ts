import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authConfig } from '@/auth'
import { prisma } from '@/lib/prisma'
import { nanoid } from 'nanoid'

// 创建新收集
export async function POST() {
  try {
    const session = await getServerSession(authConfig)
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 })
    }

    // 创建收集，生成唯一的分享链接
    const shareUrl = nanoid(10)
    const collection = await prisma.collection.create({
      data: {
        creatorId: session.user.id,
        shareUrl,
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    })

    return NextResponse.json(collection)
  } catch (error) {
    console.error('创建收集失败:', error)
    return NextResponse.json({ error: '创建失败' }, { status: 500 })
  }
}

// 获取用户的收集列表
export async function GET() {
  try {
    const session = await getServerSession(authConfig)
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 })
    }

    const collections = await prisma.collection.findMany({
      where: {
        creatorId: session.user.id,
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        _count: {
          select: {
            messages: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    })

    return NextResponse.json(collections)
  } catch (error) {
    console.error('获取收集列表失败:', error)
    return NextResponse.json({ error: '获取失败' }, { status: 500 })
  }
}
