/**
 * 本地Redis适配器 - 兼容Upstash Redis接口
 * 用于中国站使用本地Redis替代Upstash
 */

import { createClient } from 'redis'

class LocalRedisAdapter {
  private client: ReturnType<typeof createClient>
  private connected: boolean = false

  constructor() {
    // 根据环境选择连接地址
    const redisHost = process.env.LOCAL_REDIS_HOST || '172.17.0.1'
    const redisPort = process.env.LOCAL_REDIS_PORT || '6379'

    this.client = createClient({
      url: `redis://${redisHost}:${redisPort}`,
      socket: {
        reconnectStrategy: retries => {
          if (retries > 10) {
            console.error('Redis connection failed after 10 retries')
            return new Error('Max retries reached')
          }
          return Math.min(retries * 100, 3000)
        },
      },
    })

    this.client.on('error', err => {
      console.error('Redis Client Error:', err)
    })

    this.client.on('connect', () => {
      console.log('Redis connected successfully')
      this.connected = true
    })

    // 自动连接
    this.connect()
  }

  private async connect() {
    if (!this.connected) {
      try {
        await this.client.connect()
      } catch (error) {
        console.error('Failed to connect to Redis:', error)
      }
    }
  }

  private async ensureConnected() {
    if (!this.connected) {
      await this.connect()
    }
  }

  // Upstash兼容接口
  async get<T>(key: string): Promise<T | null> {
    await this.ensureConnected()
    try {
      const value = await this.client.get(key)
      return value ? JSON.parse(value) : null
    } catch (error) {
      console.error('Redis get error:', error)
      return null
    }
  }

  async set(key: string, value: any, options?: { ex?: number }): Promise<void> {
    await this.ensureConnected()
    try {
      const serialized = JSON.stringify(value)
      if (options?.ex) {
        await this.client.setEx(key, options.ex, serialized)
      } else {
        await this.client.set(key, serialized)
      }
    } catch (error) {
      console.error('Redis set error:', error)
    }
  }

  async setex(key: string, seconds: number, value: any): Promise<void> {
    await this.ensureConnected()
    try {
      const serialized = JSON.stringify(value)
      await this.client.setEx(key, seconds, serialized)
    } catch (error) {
      console.error('Redis setex error:', error)
    }
  }

  async del(key: string): Promise<void> {
    await this.ensureConnected()
    try {
      await this.client.del(key)
    } catch (error) {
      console.error('Redis del error:', error)
    }
  }

  async incr(key: string): Promise<number> {
    await this.ensureConnected()
    try {
      return await this.client.incr(key)
    } catch (error) {
      console.error('Redis incr error:', error)
      return 0
    }
  }

  async expire(key: string, seconds: number): Promise<void> {
    await this.ensureConnected()
    try {
      await this.client.expire(key, seconds)
    } catch (error) {
      console.error('Redis expire error:', error)
    }
  }

  async ttl(key: string): Promise<number> {
    await this.ensureConnected()
    try {
      return await this.client.ttl(key)
    } catch (error) {
      console.error('Redis ttl error:', error)
      return -1
    }
  }
}

// 导出单例
export const localRedis = new LocalRedisAdapter()
