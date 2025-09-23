import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authConfig } from '@/auth'
import { prisma } from '@/lib/prisma'

type Params = Promise<{ id: string }>

// 获取收集详情
export async function GET(_request: NextRequest, { params }: { params: Params }) {
  try {
    const { id } = await params
    const session = await getServerSession(authConfig)

    const collection = await prisma.collection.findUnique({
      where: { id },
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
      return NextResponse.json({ error: '收集不存在' }, { status: 404 })
    }

    // 记录访问
    if (session?.user?.id) {
      await prisma.collectionAccess.upsert({
        where: {
          collectionId_userId: {
            collectionId: id,
            userId: session.user.id,
          },
        },
        update: {
          accessCount: { increment: 1 },
        },
        create: {
          collectionId: id,
          userId: session.user.id,
        },
      })
    }

    return NextResponse.json(collection)
  } catch (error) {
    console.error('获取收集详情失败:', error)
    return NextResponse.json({ error: '获取失败' }, { status: 500 })
  }
}

// 删除收集
export async function DELETE(_request: NextRequest, { params }: { params: Params }) {
  try {
    const { id } = await params
    const session = await getServerSession(authConfig)
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 })
    }

    // 检查权限
    const collection = await prisma.collection.findUnique({
      where: { id },
      select: { creatorId: true },
    })

    if (!collection) {
      return NextResponse.json({ error: '收集不存在' }, { status: 404 })
    }

    if (collection.creatorId !== session.user.id) {
      return NextResponse.json({ error: '无权删除' }, { status: 403 })
    }

    // 删除收集（消息会级联删除）
    await prisma.collection.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('删除收集失败:', error)
    return NextResponse.json({ error: '删除失败' }, { status: 500 })
  }
}
