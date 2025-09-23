import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authConfig } from '@/auth'
import { prisma } from '@/lib/prisma'

type Params = Promise<{ id: string }>

// 更新收集主图
export async function PATCH(request: NextRequest, { params }: { params: Params }) {
  try {
    const { id } = await params
    const session = await getServerSession(authConfig)
    if (!session?.user?.id) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 })
    }

    const body = await request.json()
    const { mainImage } = body

    if (!mainImage) {
      return NextResponse.json({ error: '图片URL不能为空' }, { status: 400 })
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
      return NextResponse.json({ error: '无权修改' }, { status: 403 })
    }

    // 更新主图
    const updated = await prisma.collection.update({
      where: { id },
      data: { mainImage },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('更新主图失败:', error)
    return NextResponse.json({ error: '更新失败' }, { status: 500 })
  }
}
