import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

/**
 * GET /api/anonymous/letters/[id]
 * 获取匿名信件详情，无需登录验证
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    
    if (!id) {
      return NextResponse.json(
        { error: '参数错误', message: '缺少信件ID' }, 
        { status: 400 }
      )
    }
    
    // 查询信件
    const letter = await prisma.letter.findUnique({
      where: {
        id: id,
      },
      select: {
        id: true,
        content: true,
        imageUrl: true,
        status: true,
        metadata: true,
        createdAt: true,
      },
    })
    
    if (!letter) {
      return NextResponse.json(
        { error: '信件不存在', message: '无法找到指定的信件' },
        { status: 404 }
      )
    }
    
    // 从metadata中检查信件是否为匿名信件
    const isAnonymous = letter.metadata ? (letter.metadata as any).isAnonymous === true : false
    
    if (!isAnonymous) {
      return NextResponse.json(
        { error: '访问受限', message: '此信件不是匿名信件，无法通过此API访问' },
        { status: 403 }
      )
    }
    
    // 检查匿名信件是否过期（超过24小时）
    const createdAt = new Date(letter.createdAt)
    const now = new Date()
    const diff = now.getTime() - createdAt.getTime()
    const hours = diff / (1000 * 60 * 60)
    
    if (hours > 24) {
      return NextResponse.json(
        { error: '信件已过期', message: '此匿名信件已超过24小时，已不再可访问' },
        { status: 410 }
      )
    }
    
    return NextResponse.json({
      letter: {
        id: letter.id,
        content: letter.content,
        imageUrl: letter.imageUrl,
        status: letter.status,
        metadata: letter.metadata,
      },
    })
    
  } catch (error) {
    console.error('获取匿名信件失败:', error)
    return NextResponse.json(
      { error: '服务器错误', message: '获取信件过程中发生错误，请稍后重试' },
      { status: 500 }
    )
  }
} 