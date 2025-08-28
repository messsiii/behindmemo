import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'
import { NextResponse } from 'next/server'

export async function GET() {
  const checks = {
    database: false,
    redis: false,
    timestamp: new Date().toISOString()
  }

  // 检查数据库连接
  try {
    await prisma.$queryRaw`SELECT 1`
    checks.database = true
  } catch (error) {
    console.error('[HEALTH_CHECK] Database failed:', error)
  }

  // 检查 Redis 连接
  try {
    await redis.ping()
    checks.redis = true
  } catch (error) {
    console.error('[HEALTH_CHECK] Redis failed:', error)
  }

  const isHealthy = checks.database && checks.redis
  const status = isHealthy ? 200 : 503

  return NextResponse.json(checks, { status })
}