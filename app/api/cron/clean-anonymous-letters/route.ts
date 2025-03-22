import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

// 防止未授权访问的密钥验证
const CRON_SECRET = process.env.CRON_SECRET || 'default-secret-key-change-me'

/**
 * 自动清理过期的匿名信件(超过24小时)
 * 这个API端点应该由定时任务触发，例如通过Vercel Cron Jobs
 */
export async function POST(req: Request) {
  try {
    // 安全验证：验证请求中的密钥
    const authorization = req.headers.get('authorization')
    
    if (authorization !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // 计算24小时前的时间点
    const expirationTime = new Date()
    expirationTime.setHours(expirationTime.getHours() - 24)
    
    // 查找需要清理的匿名信件
    const expiredLetters = await prisma.letter.findMany({
      where: {
        metadata: {
          path: ['isAnonymous'],
          equals: true
        },
        createdAt: {
          lt: expirationTime
        }
      },
      select: {
        id: true
      }
    })
    
    if (expiredLetters.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No expired anonymous letters to clean',
        cleaned: 0
      })
    }
    
    // 批量删除过期信件
    const idsToDelete = expiredLetters.map(letter => letter.id)
    
    const deleteResult = await prisma.letter.deleteMany({
      where: {
        id: {
          in: idsToDelete
        }
      }
    })
    
    return NextResponse.json({
      success: true,
      message: `Cleaned ${deleteResult.count} expired anonymous letters`,
      cleaned: deleteResult.count,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('[CLEAN_ANONYMOUS_LETTERS_ERROR]', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      {
        error: 'Failed to clean anonymous letters',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

/**
 * 支持GET请求来检查清理服务的状态
 */
export async function GET() {
  return NextResponse.json({
    status: 'active',
    service: 'anonymous-letters-cleaner',
    description: 'This endpoint cleans expired anonymous letters (older than 24 hours)'
  })
} 