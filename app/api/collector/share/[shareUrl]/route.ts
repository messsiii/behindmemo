import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

type Params = Promise<{ shareUrl: string }>

// 通过分享链接获取收集
export async function GET(_request: NextRequest, { params }: { params: Params }) {
  try {
    const { shareUrl } = await params

    const collection = await prisma.collection.findUnique({
      where: { shareUrl },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        messages: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
            tempUser: {
              select: {
                id: true,
                randomName: true,
                randomAvatar: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    })

    if (!collection) {
      return NextResponse.json({ error: '收集不存在或链接无效' }, { status: 404 })
    }

    return NextResponse.json(collection)
  } catch (error) {
    console.error('获取分享收集失败:', error)
    return NextResponse.json({ error: '获取失败' }, { status: 500 })
  }
}
