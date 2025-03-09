import { authConfig } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authConfig)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 获取URL参数
    const url = new URL(req.url)
    const letterId = url.searchParams.get('letterId')
    
    if (!letterId) {
      return NextResponse.json({ error: '缺少信件ID参数' }, { status: 400 })
    }

    // 检查用户配额和VIP状态
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isVIP: true, vipExpiresAt: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // 检查用户是否是有效的VIP
    const isActiveVIP = user.isVIP && (!user.vipExpiresAt || user.vipExpiresAt > new Date())

    // 如果是VIP用户，不需要检查解锁记录，所有模板都可用
    if (isActiveVIP) {
      return NextResponse.json({
        isVIP: true,
        unlockedTemplates: [] // VIP用户不需要解锁记录，因为可以使用所有模板
      })
    }

    // 获取用户已解锁的模板 - 使用原始SQL
    const unlocks = await prisma.$queryRaw`
      SELECT "templateId" FROM template_unlocks 
      WHERE "userId" = ${session.user.id} 
      AND "letterId" = ${letterId}
    `;

    // 提取模板ID列表
    const unlockedTemplates = Array.isArray(unlocks) 
      ? unlocks.map((unlock: { templateId: string }) => unlock.templateId)
      : [];

    return NextResponse.json({
      isVIP: false,
      unlockedTemplates
    })
  } catch (error) {
    console.error('Error in check-unlocked-templates:', error)
    return NextResponse.json(
      { error: '检查解锁记录失败' },
      { status: 500 }
    )
  }
} 