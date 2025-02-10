import { prisma } from '@/lib/prisma'
import { cache } from 'react'

export type CreditsInfo = {
  credits: number
  isVIP: boolean
  vipExpiresAt: Date | null
}

export const getCreditsInfo = cache(async (userId: string): Promise<CreditsInfo | null> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        credits: true,
        isVIP: true,
        vipExpiresAt: true,
      },
    })

    if (!user) {
      return null
    }

    return {
      credits: user.credits,
      isVIP: user.isVIP,
      vipExpiresAt: user.vipExpiresAt,
    }
  } catch (error) {
    console.error('Error in getCreditsInfo:', error)
    return null
  }
})

export const hasEnoughCredits = async (userId: string): Promise<boolean> => {
  try {
    const creditsInfo = await getCreditsInfo(userId)
    if (!creditsInfo) {
      return false
    }

    // VIP 用户不消耗配额
    if (creditsInfo.isVIP) {
      if (!creditsInfo.vipExpiresAt || creditsInfo.vipExpiresAt > new Date()) {
        return true
      }
    }

    return creditsInfo.credits > 0
  } catch (error) {
    console.error('Error in hasEnoughCredits:', error)
    return false
  }
}

export const consumeCredits = async (userId: string): Promise<boolean> => {
  try {
    const creditsInfo = await getCreditsInfo(userId)
    if (!creditsInfo) {
      return false
    }

    // VIP 用户不消耗配额
    if (creditsInfo.isVIP) {
      if (!creditsInfo.vipExpiresAt || creditsInfo.vipExpiresAt > new Date()) {
        return true
      }
    }

    // 检查配额是否足够
    if (creditsInfo.credits <= 0) {
      return false
    }

    // 扣除配额
    await prisma.user.update({
      where: { id: userId },
      data: {
        credits: { decrement: 1 },
        totalUsage: { increment: 1 },
      },
    })

    return true
  } catch (error) {
    console.error('Error in consumeCredits:', error)
    return false
  }
}

export const restoreCredits = async (userId: string): Promise<boolean> => {
  try {
    // 恢复配额
    await prisma.user.update({
      where: { id: userId },
      data: {
        credits: 2,
      },
    })

    return true
  } catch (error) {
    console.error('Error in restoreCredits:', error)
    return false
  }
}
