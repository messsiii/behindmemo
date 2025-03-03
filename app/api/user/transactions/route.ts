import { authConfig } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authConfig)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权' }, { status: 401 })
    }
    
    const userId = session.user.id
    
    const transactions = await prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        createdAt: true,
        amount: true,
        currency: true,
        status: true,
        type: true,
        paddleOrderId: true,
        pointsAdded: true,
      }
    })
    
    return NextResponse.json(transactions)
  } catch (error) {
    console.error('获取交易记录失败:', error)
    return NextResponse.json({ error: '获取交易记录失败' }, { status: 500 })
  }
} 