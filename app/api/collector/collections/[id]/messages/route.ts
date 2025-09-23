import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authConfig } from '@/auth'
import { prisma } from '@/lib/prisma'

type Params = Promise<{ id: string }>

// 发送消息
export async function POST(request: NextRequest, { params }: { params: Params }) {
  try {
    const { id } = await params
    const session = await getServerSession(authConfig)
    const body = await request.json()
    const { type, content, imageUrl, audioUrl, duration, tempUserId } = body

    // 验证收集是否存在
    const collection = await prisma.collection.findUnique({
      where: { id },
    })

    if (!collection) {
      return NextResponse.json({ error: '收集不存在' }, { status: 404 })
    }

    // 构建消息数据
    const messageData: any = {
      collectionId: id,
      type,
      content,
      imageUrl,
      audioUrl,
      duration,
    }

    // 处理用户身份
    if (session?.user?.id) {
      // 登录用户
      messageData.userId = session.user.id
      messageData.userAvatar = session.user.image
      messageData.userName = session.user.name
    } else if (tempUserId) {
      // 临时用户
      const tempUser = await prisma.tempUser.findUnique({
        where: { id: tempUserId },
      })
      if (tempUser) {
        messageData.tempUserId = tempUserId
        messageData.userAvatar = tempUser.randomAvatar
        messageData.userName = tempUser.randomName
      }
    }

    // 创建消息
    const message = await prisma.collectionMessage.create({
      data: messageData,
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
    })

    // 更新收集的更新时间
    await prisma.collection.update({
      where: { id },
      data: {
        updatedAt: new Date(),
        // 如果是第一张图片，设为主图
        ...(type === 'IMAGE' && !collection.mainImage && imageUrl ? { mainImage: imageUrl } : {}),
      },
    })

    return NextResponse.json(message)
  } catch (error) {
    console.error('发送消息失败:', error)
    return NextResponse.json({ error: '发送失败' }, { status: 500 })
  }
}

// 获取消息列表
export async function GET(request: NextRequest, { params }: { params: Params }) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const cursor = searchParams.get('cursor')
    const limit = parseInt(searchParams.get('limit') || '50')

    const messages = await prisma.collectionMessage.findMany({
      where: { collectionId: id },
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
      orderBy: { createdAt: 'asc' },
      take: limit,
      ...(cursor
        ? {
            skip: 1,
            cursor: { id: cursor },
          }
        : {}),
    })

    return NextResponse.json(messages)
  } catch (error) {
    console.error('获取消息失败:', error)
    return NextResponse.json({ error: '获取失败' }, { status: 500 })
  }
}
