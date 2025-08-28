import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'
import { NextResponse } from 'next/server'

export async function GET() {
  const checks = {
    database: false,
    redis: false,
    databaseError: null as string | null,
    redisError: null as string | null,
    env: {
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      hasRedisUrl: !!process.env.KV_REST_API_URL,
      hasRedisToken: !!process.env.KV_REST_API_TOKEN,
      databaseUrlPrefix: process.env.DATABASE_URL?.substring(0, 20) || 'not found'
    },
    timestamp: new Date().toISOString()
  }

  // 检查数据库连接
  try {
    console.log('[HEALTH_CHECK] Testing database connection...')
    await prisma.$queryRaw`SELECT 1`
    checks.database = true
    console.log('[HEALTH_CHECK] Database connection successful')
  } catch (error) {
    console.error('[HEALTH_CHECK] Database failed:', error)
    checks.databaseError = error instanceof Error ? error.message : String(error)
  }

  // 检查 Redis 连接
  try {
    console.log('[HEALTH_CHECK] Testing Redis connection...')
    await redis.ping()
    checks.redis = true
    console.log('[HEALTH_CHECK] Redis connection successful')
  } catch (error) {
    console.error('[HEALTH_CHECK] Redis failed:', error)
    checks.redisError = error instanceof Error ? error.message : String(error)
  }

  const isHealthy = checks.database && checks.redis
  const status = isHealthy ? 200 : 503

  return NextResponse.json(checks, { status })
}