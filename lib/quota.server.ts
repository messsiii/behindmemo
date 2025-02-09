import { redis } from '@/lib/redis'
import { PrismaClient } from '@prisma/client'

const prismaClient = new PrismaClient()

export async function checkQuota(userId: string): Promise<boolean> {
  const user = await prismaClient.user.findUnique({
    where: { id: userId },
    select: { quota: true, isVIP: true, vipExpiresAt: true },
  })

  if (!user) return false

  // VIP用户且未过期，不限制配额
  if (user.isVIP && user.vipExpiresAt && user.vipExpiresAt > new Date()) {
    return true
  }

  return user.quota > 0
}

export async function lockQuota(userId: string, requestId: string): Promise<boolean> {
  const lockKey = `quota_lock:${userId}`
  const quotaKey = `quota_consumed:${userId}:${requestId}`

  try {
    // 1. 尝试获取锁,防止并发请求
    const locked = await redis.set(lockKey, '1', {
      nx: true, // 只在键不存在时设置
      ex: 30, // 30秒后自动释放,防止死锁
    })

    if (!locked) return false

    // 2. 检查是否已经消耗过配额
    const consumed = await redis.get(quotaKey)
    if (consumed) return false

    // 3. 检查用户配额
    const user = await prismaClient.user.findUnique({
      where: { id: userId },
      select: { quota: true, isVIP: true, vipExpiresAt: true },
    })

    if (!user) return false

    // VIP用户且未过期,不需要检查配额
    if (user.isVIP && user.vipExpiresAt && user.vipExpiresAt > new Date()) {
      await redis.set(quotaKey, '1', { ex: 300 }) // 5分钟过期
      return true
    }

    // 普通用户检查配额
    if (user.quota <= 0) return false

    // 4. 标记配额已锁定
    await redis.set(quotaKey, '1', {
      ex: 300, // 5分钟过期
    })

    return true
  } finally {
    // 释放锁
    await redis.del(lockKey)
  }
}

export async function consumeQuota(userId: string, requestId: string): Promise<boolean> {
  const quotaKey = `quota_consumed:${userId}:${requestId}`

  try {
    // 1. 验证锁定状态
    const locked = await redis.get(quotaKey)
    if (!locked) return false

    // 2. 检查用户状态
    const user = await prismaClient.user.findUnique({
      where: { id: userId },
      select: { quota: true, isVIP: true, vipExpiresAt: true },
    })

    if (!user) return false

    // 3. 消耗配额
    if (!user.isVIP || !user.vipExpiresAt || user.vipExpiresAt <= new Date()) {
      await prismaClient.user.update({
        where: { id: userId },
        data: {
          quota: { decrement: 1 },
          totalUsage: { increment: 1 },
        },
      })
    } else {
      // VIP用户只增加使用次数
      await prismaClient.user.update({
        where: { id: userId },
        data: {
          totalUsage: { increment: 1 },
        },
      })
    }

    // 4. 更新状态为已消耗
    await redis.set(quotaKey, '2', {
      ex: 3600, // 1小时后过期
    })

    return true
  } catch (error) {
    console.error('Error consuming quota:', error)
    return false
  }
}

export async function releaseQuota(userId: string, requestId: string): Promise<void> {
  const quotaKey = `quota_consumed:${userId}:${requestId}`

  try {
    // 1. 检查配额状态
    const status = await redis.get(quotaKey)
    if (status === '2') {
      // 只有已消耗的配额才能恢复
      // 2. 恢复配额
      await prismaClient.user.update({
        where: { id: userId },
        data: {
          quota: { increment: 1 },
          totalUsage: { decrement: 1 },
        },
      })
    }
  } finally {
    // 3. 清除配额状态
    await redis.del(quotaKey)
  }
}

export async function addQuota(userId: string, amount: number): Promise<boolean> {
  try {
    await prismaClient.user.update({
      where: { id: userId },
      data: {
        quota: { increment: amount },
      },
    })
    return true
  } catch (error) {
    console.error('Error adding quota:', error)
    return false
  }
}

export async function upgradeToVIP(userId: string, durationInDays: number): Promise<boolean> {
  try {
    const vipExpiresAt = new Date()
    vipExpiresAt.setDate(vipExpiresAt.getDate() + durationInDays)

    await prismaClient.user.update({
      where: { id: userId },
      data: {
        isVIP: true,
        vipExpiresAt,
      },
    })
    return true
  } catch (error) {
    console.error('Error upgrading to VIP:', error)
    return false
  }
}

export async function getQuotaInfo(userId: string) {
  const user = await prismaClient.user.findUnique({
    where: { id: userId },
    select: {
      quota: true,
      isVIP: true,
      vipExpiresAt: true,
      totalUsage: true,
    },
  })

  if (!user) return null

  return {
    quota: user.quota,
    isVIP: user.isVIP,
    vipExpiresAt: user.vipExpiresAt,
    totalUsage: user.totalUsage,
    unlimited: user.isVIP && user.vipExpiresAt && user.vipExpiresAt > new Date(),
  }
}
