import { authConfig } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

// 使用原生 SQL 查询来避免 Prisma 的查询构建开销
async function getGenerationHistoryOptimized(userId: string, limit: number, offset: number) {
  // 重试机制
  let retries = 2
  let lastError: any = null

  while (retries > 0) {
    try {
      // 优化查询：检测并处理 Base64 数据
      // 如果 URL 字段以 'data:image' 开头，返回简化的占位符
      const records = await prisma.$queryRaw`
        SELECT 
          id, 
          prompt, 
          CASE 
            WHEN "inputImageUrl" LIKE 'data:image%' THEN 'data:image/placeholder'
            WHEN "inputImageUrl" IS NULL THEN NULL
            WHEN LENGTH("inputImageUrl") > 1000 THEN 'data:too-large'
            ELSE "inputImageUrl"
          END as "inputImageUrl",
          CASE 
            WHEN "outputImageUrl" LIKE 'data:image%' THEN 'data:image/placeholder'
            WHEN "outputImageUrl" IS NULL THEN NULL
            WHEN LENGTH("outputImageUrl") > 1000 THEN 'data:too-large'
            ELSE "outputImageUrl"
          END as "outputImageUrl",
          CASE 
            WHEN "localOutputImageUrl" LIKE 'data:image%' THEN 'data:image/placeholder'
            WHEN "localOutputImageUrl" IS NULL THEN NULL
            WHEN LENGTH("localOutputImageUrl") > 1000 THEN 'data:too-large'
            ELSE "localOutputImageUrl"
          END as "localOutputImageUrl",
          status, 
          "creditsUsed" as "creditsUsed",
          "errorMessage" as "errorMessage",
          "createdAt" as "createdAt",
          "updatedAt" as "updatedAt",
          model,
          CASE
            WHEN metadata IS NULL THEN NULL
            WHEN LENGTH(metadata::text) > 1000 THEN '{"truncated": true}'::jsonb
            ELSE metadata
          END as metadata
        FROM image_generations
        WHERE "userId" = ${userId}
        ORDER BY "createdAt" DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `

      return records as any[]
    } catch (error: any) {
      lastError = error
      console.error(`[GENERATION_HISTORY] Query attempt ${3 - retries} failed:`, error.message)

      // 如果是超时错误，立即重试
      if (error.message?.includes('timeout') || error.code === 'P2024') {
        retries--
        if (retries > 0) {
          // 短暂延迟后重试
          await new Promise(resolve => setTimeout(resolve, 100))
          continue
        }
      }

      // 其他错误直接抛出
      throw error
    }
  }

  // 如果所有重试都失败了，使用简化的 Prisma 查询
  console.error('[GENERATION_HISTORY] All retries failed, using fallback query')
  try {
    return await prisma.imageGeneration.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      select: {
        id: true,
        prompt: true,
        inputImageUrl: true,
        outputImageUrl: true,
        localOutputImageUrl: true,
        status: true,
        creditsUsed: true,
        errorMessage: true,
        createdAt: true,
        updatedAt: true,
        model: true,
        metadata: true,
      },
    })
  } catch (fallbackError) {
    console.error('[GENERATION_HISTORY] Fallback query also failed:', fallbackError)
    throw lastError || fallbackError
  }
}

// 优化的计数查询
async function getGenerationCountOptimized(userId: string) {
  try {
    const result = await prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*)::bigint as count 
      FROM image_generations 
      WHERE "userId" = ${userId}
    `
    return Number(result[0].count)
  } catch (error) {
    console.error('[GENERATION_HISTORY] Count query error:', error)
    // 回退到 Prisma ORM 计数
    return await prisma.imageGeneration.count({
      where: { userId },
    })
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('[GENERATION_HISTORY] Starting request processing')
    const session = await getServerSession(authConfig)

    console.log('[GENERATION_HISTORY] Session check:', {
      hasSession: !!session,
      hasUser: !!session?.user,
      userId: session?.user?.id,
    })

    if (!session?.user?.id) {
      console.log('[GENERATION_HISTORY] Unauthorized: no valid session')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 从查询参数获取分页信息
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50)
    const offset = parseInt(searchParams.get('offset') || '0')
    const skipCount = searchParams.get('skipCount') === 'true'

    console.log(
      `[GENERATION_HISTORY] Fetching ${limit} records for user ${session.user.id} with offset ${offset}`
    )

    const startTime = Date.now()

    try {
      // 使用优化的查询方法，设置更短的超时
      const records = await Promise.race([
        getGenerationHistoryOptimized(session.user.id, limit, offset),
        new Promise<never>(
          (_, reject) => setTimeout(() => reject(new Error('Query timeout')), 10000) // 10秒超时
        ),
      ])

      console.log(`[GENERATION_HISTORY] Query completed in ${Date.now() - startTime}ms`)
      console.log(`[GENERATION_HISTORY] Retrieved ${records.length} records`)

      // 如果不需要count，直接返回
      if (skipCount) {
        return NextResponse.json({
          records,
          pagination: {
            offset,
            limit,
            hasMore: records.length === limit,
          },
        })
      }

      // 并行执行计数查询，但不等待它完成
      let totalCount = 0
      const countPromise = getGenerationCountOptimized(session.user.id)
        .then(count => {
          totalCount = count
          console.log(`[GENERATION_HISTORY] Total count: ${count}`)
        })
        .catch(error => {
          console.warn('[GENERATION_HISTORY] Count query failed:', error)
        })

      // 等待最多3秒获取计数
      await Promise.race([countPromise, new Promise(resolve => setTimeout(resolve, 3000))])

      return NextResponse.json({
        records,
        pagination: {
          offset,
          limit,
          totalCount,
          hasMore: totalCount > 0 ? offset + records.length < totalCount : records.length === limit,
        },
      })
    } catch (queryError) {
      console.error('[GENERATION_HISTORY] Query error:', queryError)

      // 如果是超时错误，返回缓存友好的响应
      if (queryError instanceof Error && queryError.message === 'Query timeout') {
        // 尝试使用更小的批次
        try {
          const smallBatchRecords = await Promise.race([
            getGenerationHistoryOptimized(session.user.id, 3, offset), // 只获取3条
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('Small batch timeout')), 5000)
            ),
          ])

          return NextResponse.json({
            records: smallBatchRecords,
            pagination: {
              offset,
              limit: 3,
              totalCount: 0,
              hasMore: smallBatchRecords.length === 3,
            },
            warning: 'Reduced batch size due to performance issues',
          })
        } catch (smallBatchError) {
          // 如果小批次也失败，尝试直接连接而不是通过连接池
          console.error('[GENERATION_HISTORY] Small batch also failed, trying direct connection')
          try {
            // 创建一个新的 Prisma 客户端实例，使用非池化连接
            const directPrisma = new PrismaClient({
              datasources: {
                db: {
                  url:
                    process.env.DATABASE_URL_UNPOOLED ||
                    process.env.POSTGRES_URL_NON_POOLING ||
                    process.env.DATABASE_URL,
                },
              },
            })

            const emergencyRecords = await directPrisma.imageGeneration.findMany({
              where: { userId: session.user.id },
              orderBy: { createdAt: 'desc' },
              take: 3,
              skip: offset,
              select: {
                id: true,
                prompt: true,
                inputImageUrl: true,
                outputImageUrl: true,
                localOutputImageUrl: true,
                status: true,
                creditsUsed: true,
                errorMessage: true,
                createdAt: true,
                updatedAt: true,
                model: true,
                metadata: true,
              },
            })

            await directPrisma.$disconnect()

            return NextResponse.json({
              records: emergencyRecords,
              pagination: {
                offset,
                limit: 3,
                totalCount: 0,
                hasMore: emergencyRecords.length === 3,
              },
              warning: 'Using emergency connection due to performance issues',
            })
          } catch (emergencyError) {
            console.error('[GENERATION_HISTORY] Emergency connection also failed:', emergencyError)
            // 如果所有方法都失败，返回空结果
            return NextResponse.json({
              records: [],
              pagination: {
                offset,
                limit,
                totalCount: 0,
                hasMore: false,
              },
              error: 'Database connection issue. Please try again later.',
            })
          }
        }
      }

      throw queryError
    }
  } catch (error) {
    console.error('[GENERATION_HISTORY_ERROR]', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
