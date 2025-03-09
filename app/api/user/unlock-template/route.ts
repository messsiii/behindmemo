import { authConfig } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'
import crypto from 'crypto'
import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'

// 定义每次解锁模板需要的点数
const CREDITS_PER_TEMPLATE_UNLOCK = 5

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authConfig)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 获取要解锁的模板ID和信件ID
    const { templateId, letterId } = await req.json()
    
    if (!templateId || !letterId) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 })
    }

    // 检查用户配额
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { credits: true, isVIP: true, vipExpiresAt: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // 检查用户是否是有效的VIP
    const isActiveVIP = user.isVIP && (!user.vipExpiresAt || user.vipExpiresAt > new Date())

    // 如果是VIP，则不需要消耗积分就可以使用所有模板
    if (isActiveVIP) {
      return NextResponse.json({
        success: true,
        isVIP: true,
        message: '您是VIP用户，可以无限使用所有模板',
      })
    }

    // 如果积分不足，返回错误
    if (user.credits < CREDITS_PER_TEMPLATE_UNLOCK) {
      return NextResponse.json({
        error: '积分不足',
        required: CREDITS_PER_TEMPLATE_UNLOCK,
        available: user.credits,
        isVIP: false
      }, { status: 400 })
    }

    // 获取当前信件的解锁记录
    const existingUnlock = await prisma.$queryRaw`
      SELECT * FROM template_unlocks 
      WHERE "userId" = ${session.user.id} 
      AND "letterId" = ${letterId} 
      AND "templateId" = ${templateId}
      LIMIT 1
    `;

    // 如果已经解锁过这个模板，则不需要再次扣除积分
    if (existingUnlock && Array.isArray(existingUnlock) && existingUnlock.length > 0) {
      return NextResponse.json({
        success: true,
        alreadyUnlocked: true,
        message: '该模板已解锁'
      })
    }

    // 扣除用户积分并记录解锁
    await prisma.$transaction([
      // 扣除积分
      prisma.user.update({
        where: { id: session.user.id },
        data: {
          credits: { decrement: CREDITS_PER_TEMPLATE_UNLOCK },
          totalUsage: { increment: CREDITS_PER_TEMPLATE_UNLOCK },
        },
      }),
      // 记录解锁 - 使用原始SQL
      prisma.$executeRaw`
        INSERT INTO template_unlocks ("id", "userId", "letterId", "templateId", "createdAt", "updatedAt")
        VALUES (
          ${crypto.randomUUID()}, 
          ${session.user.id}, 
          ${letterId}, 
          ${templateId}, 
          CURRENT_TIMESTAMP, 
          CURRENT_TIMESTAMP
        )
      `
    ])
    
    // 清除用户配额缓存
    await redis.del(`user:credits:${session.user.id}`)

    return NextResponse.json({ 
      success: true,
      creditsUsed: CREDITS_PER_TEMPLATE_UNLOCK,
      creditsRemaining: user.credits - CREDITS_PER_TEMPLATE_UNLOCK,
      message: '模板解锁成功'
    })
  } catch (error) {
    console.error('Error in unlock-template:', error)
    return NextResponse.json(
      { error: '解锁模板失败' },
      { status: 500 }
    )
  }
} 