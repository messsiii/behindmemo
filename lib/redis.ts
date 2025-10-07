import { Redis } from '@upstash/redis'

// 根据环境选择Redis实例
function createRedisClient() {
  // 中国站使用本地Redis
  if (process.env.STORAGE_PROVIDER === 'tencent-cos' || process.env.USE_LOCAL_REDIS === 'true') {
    // 返回一个模拟的Upstash接口，实际使用本地Redis
    return {
      get: async <T>(key: string): Promise<T | null> => {
        // 这里暂时返回null，实际部署时会使用local-redis-adapter
        return null
      },
      set: async (key: string, value: any, options?: { ex?: number }): Promise<void> => {
        // 暂时为空实现
      },
      setex: async (key: string, seconds: number, value: any): Promise<void> => {
        // 暂时为空实现
      },
      del: async (key: string): Promise<void> => {
        // 暂时为空实现
      },
      incr: async (key: string): Promise<number> => {
        return 1
      },
      expire: async (key: string, seconds: number): Promise<void> => {
        // 暂时为空实现
      },
    }
  }

  // 国际站使用Upstash
  return new Redis({
    url: process.env.KV_REST_API_URL!,
    token: process.env.KV_REST_API_TOKEN!,
  })
}

// 创建 Redis 客户端实例
export const redis = createRedisClient()

// 缓存函数的类型定义
type CacheFunction<T> = () => Promise<T>

// 缓存包装器
export async function cache<T>(
  key: string,
  fn: CacheFunction<T>,
  ttl: number = 60 // 默认缓存 60 秒
): Promise<T> {
  // 跳过不需要缓存的路径
  if (key.includes('auth:session') || key.includes('redirect')) {
    return fn()
  }

  try {
    // 尝试从缓存获取数据
    const cached = await redis.get<T>(key)
    if (cached !== null) {
      console.debug(`Cache hit: ${key}`)
      return cached
    }

    // 如果缓存未命中，执行函数获取数据
    const data = await fn()

    // 确保数据不为 null，如果是 null 则存储空对象
    const payload = data === null ? {} : data

    // 将数据存入缓存
    await redis.setex(key, ttl, payload)
    console.debug(`Cache stored: ${key}`)

    return data
  } catch (error) {
    console.error('Cache error:', error)
    // 如果缓存出错，直接执行函数并返回结果
    return fn()
  }
}

// 清除缓存
export async function clearCache(key: string): Promise<void> {
  try {
    await redis.del(key)
    console.debug(`Cache cleared: ${key}`)
  } catch (error) {
    console.error('Cache clear failed:', error)
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
  console.debug(`Letter ${letterId}: ${status}`)
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
  console.debug(`Letter ${letterId}: status cleared`)
}
