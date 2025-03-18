import { authConfig } from '@/auth'
import { generateLetter } from '@/lib/minimax'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth/next'
import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'

// 最大请求限制配置
const MAX_REQUESTS_PER_IP = process.env.NODE_ENV === 'development' ? 50 : 5 // 开发环境提高限制
const RATE_LIMIT_DURATION_HOURS = 24 // 限制周期（小时）

/**
 * 匿名生成信件API
 * 支持登录和未登录用户
 */
export async function POST(req: Request) {
  // 获取客户端IP，开发环境使用特殊值
  const clientIp = process.env.NODE_ENV === 'development' 
    ? 'dev-environment'
    : (req.headers.get('x-forwarded-for')?.split(',')[0] || 
       req.headers.get('x-real-ip') || 
       'unknown-ip')

  console.log('Client IP for rate limiting:', clientIp)
  
  try {
    // 检查用户是否已登录
    const session = await getServerSession(authConfig)
    const isAuthenticated = !!session?.user?.id
    
    let body
    try {
      body = await req.json()
    } catch (error) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const { name, loverName, story, blobUrl, metadata } = body

    // 验证所有必填字段
    const requiredFields = {
      name: name?.trim(),
      loverName: loverName?.trim(),
      story: story?.trim(),
      blobUrl: blobUrl?.trim(),
    }

    const missingFields = Object.entries(requiredFields)
      .filter(([_, value]) => !value)
      .map(([key]) => key)

    if (missingFields.length > 0) {
      console.warn('Missing fields:', missingFields)
      return NextResponse.json(
        {
          error: 'Missing required fields',
          missingFields,
        },
        { status: 400 }
      )
    }
    
    // 决定使用哪个用户ID
    let userId
    
    if (isAuthenticated) {
      // 已登录用户使用自己的ID
      userId = session.user.id
      console.log('使用已登录用户ID:', userId)
    } else {
      // 未登录用户查找匿名用户ID
      const anonymousUserId = process.env.ANONYMOUS_USER_ID
      console.log('查找匿名用户ID:', anonymousUserId)
      
      if (!anonymousUserId) {
        // 如果环境变量中没有设置匿名用户ID，尝试查找已有的匿名用户
        const existingAnonymousUser = await prisma.user.findFirst({
          where: {
            OR: [
              { name: 'Anonymous User' },
              { email: 'anonymous@behindmemory.com' }
            ]
          }
        });
        
        if (existingAnonymousUser) {
          userId = existingAnonymousUser.id;
          console.log('找到现有匿名用户:', userId);
        } else {
          // 创建一个新的匿名用户，使用随机邮箱避免冲突
          const randomEmail = `anonymous-${uuidv4()}@behindmemory.com`;
          
          const newAnonymousUser = await prisma.user.create({
            data: {
              name: 'Anonymous User',
              email: randomEmail,
              credits: 999999,
              isVIP: true
            }
          });
          
          userId = newAnonymousUser.id;
          console.log('创建新匿名用户:', userId);
          console.log('请将此ID添加到环境变量: ANONYMOUS_USER_ID=', userId);
        }
      } else {
        // 使用环境变量中的匿名用户ID
        const anonymousUser = await prisma.user.findUnique({
          where: { id: anonymousUserId }
        });
        
        if (anonymousUser) {
          userId = anonymousUser.id;
          console.log('使用配置的匿名用户:', userId);
        } else {
          // 如果配置的匿名用户不存在，创建一个新的
          const randomEmail = `anonymous-${uuidv4()}@behindmemory.com`;
          
          const newAnonymousUser = await prisma.user.create({
            data: {
              name: 'Anonymous User',
              email: randomEmail,
              credits: 999999,
              isVIP: true
            }
          });
          
          userId = newAnonymousUser.id;
          console.log('配置的匿名用户不存在，创建新用户:', userId);
          console.log('请更新环境变量: ANONYMOUS_USER_ID=', userId);
        }
      }
    }
    
    // 生成唯一匿名ID
    const anonymousId = `anon_${uuidv4()}`

    // 如果是未登录用户，检查IP请求频率限制
    if (!isAuthenticated) {
      const rateWindow = new Date()
      rateWindow.setHours(rateWindow.getHours() - RATE_LIMIT_DURATION_HOURS)
      
      // 计算该IP的请求次数
      const requestCount = await prisma.letter.count({
        where: {
          AND: [
            {
              metadata: {
                path: ['clientIp'],
                equals: clientIp
              }
            },
            {
              metadata: {
                path: ['isAnonymous'],
                equals: true
              }
            },
            {
              createdAt: {
                gte: rateWindow
              }
            }
          ]
        }
      })
      
      // 如果超过限制，返回错误
      if (requestCount >= MAX_REQUESTS_PER_IP) {
        return NextResponse.json(
          { 
            error: 'Rate limit exceeded', 
            message: 'You have reached the maximum number of requests for today. Please try again tomorrow.' 
          }, 
          { status: 429 }
        )
      }
    }

    // 创建信件记录
    const letter = await prisma.letter.create({
      data: {
        id: `letter_${uuidv4()}`,
        content: '',
        imageUrl: blobUrl,
        prompt: `From ${name} to ${loverName}: ${story}`,
        language: metadata?.language || 'en',
        userId: userId,
        status: 'pending',
        metadata: {
          ...metadata,
          name: name || '',
          loverName: loverName || '',
          isAnonymous: !isAuthenticated, // 只有未登录用户才是匿名
          anonymousId: !isAuthenticated ? anonymousId : undefined,
          clientIp: !isAuthenticated ? clientIp : undefined,
          createdAt: new Date().toISOString(),
        },
      },
    })
    
    // 先返回结果，让用户可以立即跳转到结果页面
    const responseData = {
      success: true,
      letterId: letter.id
    }
    
    // 如果是匿名用户，添加匿名ID
    if (!isAuthenticated) {
      Object.assign(responseData, { anonymousId });
    }
    
    const headers: HeadersInit = {}
    headers['X-Letter-ID'] = letter.id
    
    if (!isAuthenticated) {
      headers['X-Anonymous-ID'] = anonymousId
    }
    
    // 在后台生成信件内容，不阻塞API响应
    generateLetterInBackground(letter.id, name, loverName, story, metadata)
    
    return NextResponse.json(responseData, { headers })
  } catch (error) {
    console.error('[LETTER_GENERATION_ERROR]', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

// 后台生成信件内容的函数
async function generateLetterInBackground(
  letterId: string, 
  name: string, 
  loverName: string, 
  story: string, 
  metadata?: any
) {
  try {
    console.log(`开始在后台生成信件内容... (ID: ${letterId})`)
    
    // 更新信件状态为生成中
    await prisma.letter.update({
      where: { id: letterId },
      data: { status: 'generating' }
    })
    
    const content = await generateLetter({
      prompt: `From ${name} to ${loverName}: ${story}`,
      language: metadata?.language || 'en',
      metadata: {
        ...metadata,
        name: name || '',
        loverName: loverName || '',
      },
    })

    // 更新信件内容
    await prisma.letter.update({
      where: { id: letterId },
      data: {
        content: content,
        status: 'completed'
      }
    })
    
    console.log(`信件内容生成完成! (ID: ${letterId})`)
  } catch (error) {
    console.error(`生成信件内容失败: (ID: ${letterId})`, error)
    
    // 更新信件状态为失败
    await prisma.letter.update({
      where: { id: letterId },
      data: {
        status: 'failed'
      }
    })
  }
} 