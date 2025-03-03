import { authConfig } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'

// 每次生成情书消耗的点数
const CREDITS_PER_GENERATION = 10

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authConfig)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权' }, { status: 401 })
    }
    
    const userId = session.user.id
    
    // 获取用户语言偏好
    const userLanguagePreference = req.headers.get('x-language-preference') || 'zh'
    
    // 从信件生成记录中获取使用记录，包含生成时的VIP状态信息
    const letters = await prisma.letter.findMany({
      where: { 
        userId,
        status: 'completed' // 只获取成功生成的信件
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        createdAt: true,
        language: true,
        metadata: true, // 包含创建时的VIP状态
      }
    })
    
    // 将信件记录转换为使用记录格式
    const usageRecords = letters.map(letter => {
      // 检查元数据中是否包含VIP信息
      const metadata = letter.metadata as any || {}
      // 从元数据中获取生成时的VIP状态，如果没有则假设为非VIP
      const wasVipWhenGenerated = metadata.isVIP === true
      
      return {
        id: letter.id,
        createdAt: letter.createdAt,
        // 根据用户语言偏好返回本地化的类型
        type: userLanguagePreference === 'en' ? 'Letter Generation' : '生成情书',
        // 根据生成时的VIP状态决定点数消耗
        pointsUsed: wasVipWhenGenerated ? 0 : CREDITS_PER_GENERATION,
        // 根据用户语言偏好和信件语言返回本地化的描述
        description: userLanguagePreference === 'en' 
          ? `Generated ${letter.language === 'en' ? 'English' : 'Chinese'} love letter${wasVipWhenGenerated ? ' (VIP)' : ''}` 
          : `${letter.language === 'en' ? '英文' : '中文'}情书生成${wasVipWhenGenerated ? ' (VIP)' : ''}`
      }
    })
    
    return NextResponse.json(usageRecords)
  } catch (error) {
    console.error('获取使用记录失败:', error)
    return NextResponse.json({ error: '获取使用记录失败' }, { status: 500 })
  }
} 