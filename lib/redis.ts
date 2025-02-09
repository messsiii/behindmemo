import { Redis } from '@upstash/redis'

// 创建 Redis 客户端实例
export const redis = new Redis({
  url: process.env.KV_REST_API_URL || '',
  token: process.env.KV_REST_API_TOKEN || '',
})

// 通用缓存函数
export async function cache<T>(
  key: string,
  fn: () => Promise<T>,
  ttl: number = 60 // 默认缓存60秒
): Promise<T> {
  try {
    // 尝试从缓存获取
    const cached = await redis.get<T>(key)
    if (cached) {
      console.log(`Cache hit for key: ${key}`)
      return cached
    }

    console.log(`Cache miss for key: ${key}`)
    // 如果缓存不存在，执行函数
    const data = await fn()

    // 存入缓存
    await redis.set(key, data, { ex: ttl })
    console.log(`Cached data for key: ${key} with TTL: ${ttl}s`)

    return data
  } catch (error) {
    console.error('Redis cache error:', error)
    // 如果缓存出错，直接执行函数并返回结果
    return fn()
  }
}

// 生成状态类型
export type GenerationStatus = {
  status: 'pending' | 'completed' | 'failed'
  progress: number
  error?: string
}

// 设置生成状态
export async function setGenerationStatus(
  letterId: string,
  status: GenerationStatus['status'],
  progress: number = 0,
  error?: string
) {
  const key = `letter:status:${letterId}`
  await redis.set(
    key,
    { status, progress, error },
    { ex: 3600 } // 1小时过期
  )
  console.log(`Set generation status for letter ${letterId}:`, { status, progress, error })
}

// 获取生成状态
export async function getGenerationStatus(letterId: string): Promise<GenerationStatus | null> {
  const key = `letter:status:${letterId}`
  return redis.get<GenerationStatus>(key)
}

// 删除生成状态
export async function deleteGenerationStatus(letterId: string) {
  const key = `letter:status:${letterId}`
  await redis.del(key)
  console.log(`Deleted generation status for letter ${letterId}`)
}
