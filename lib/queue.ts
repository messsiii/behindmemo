import { generateLetter } from './minimax'
import { prisma } from './prisma'
import { redis } from './redis'

// 队列配置
const QUEUE_KEY = 'letter_queue'
const PROCESSING_KEY = 'letter_processing'
const RPM_LIMIT = 120
const PROCESS_INTERVAL = Math.ceil(60000 / RPM_LIMIT) // 确保每次处理间隔至少 500ms

export class Queue {
  private processing = false
  private lastProcessTime = 0

  // 入队
  async enqueue(letterId: string): Promise<void> {
    await redis.lpush(QUEUE_KEY, letterId)
    console.debug(`Letter ${letterId}: queued`)
  }

  // 处理下一个任务
  async processNext(): Promise<void> {
    // 如果正在处理或者需要等待，直接返回
    if (this.processing) return
    
    // 检查处理间隔
    const now = Date.now()
    const timeSinceLastProcess = now - this.lastProcessTime
    if (timeSinceLastProcess < PROCESS_INTERVAL) return
    
    let letterId: string | null = null
    
    try {
      this.processing = true
      
      // 从等待队列获取任务
      letterId = await redis.rpop(QUEUE_KEY)
      if (!letterId) {
        this.processing = false
        return
      }

      // 添加到处理队列
      await redis.lpush(PROCESSING_KEY, letterId)
      console.debug(`Letter ${letterId}: processing`)
      
      // 获取信件信息
      const letter = await prisma.letter.findUnique({
        where: { id: letterId },
        select: {
          id: true,
          prompt: true,
          language: true,
          metadata: true,
        },
      })

      if (!letter) {
        throw new Error(`Letter not found: ${letterId}`)
      }

      // 生成内容
      const content = await generateLetter({
        prompt: letter.prompt,
        language: letter.language,
        metadata: letter.metadata as any,
      })

      // 更新信件
      await prisma.letter.update({
        where: { id: letterId },
        data: {
          content,
          status: 'completed',
        },
      })

      // 处理完成，从处理队列中移除
      await redis.lrem(PROCESSING_KEY, 0, letterId)
      console.debug(`Letter ${letterId}: completed`)

    } catch (error) {
      console.error(`Letter ${letterId}: failed`, error)
      
      if (letterId) {
        // 更新信件状态为失败
        await prisma.letter.update({
          where: { id: letterId },
          data: {
            content: '',
            status: 'failed',
          },
        })

        // 从处理队列中移除
        await redis.lrem(PROCESSING_KEY, 0, letterId)
      }
    } finally {
      this.lastProcessTime = Date.now()
      this.processing = false
    }
  }

  // 获取队列状态
  async getStatus(): Promise<{ waiting: number; processing: number; estimatedWaitMinutes: number }> {
    const [waiting, processing] = await Promise.all([
      redis.llen(QUEUE_KEY),
      redis.llen(PROCESSING_KEY)
    ])
    
    // 估算等待时间（分钟）
    const estimatedWaitMinutes = Math.ceil(waiting / RPM_LIMIT)
    
    return { 
      waiting, 
      processing,
      estimatedWaitMinutes
    }
  }
}

// 创建单例
export const letterQueue = new Queue() 