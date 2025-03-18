import { PrismaClient } from '@prisma/client'

/**
 * 此脚本用于创建系统匿名用户账号
 * 运行方式: npx ts-node scripts/create-anonymous-user.ts
 */

const prisma = new PrismaClient()

async function createAnonymousUser() {
  try {
    console.log('Creating anonymous user account...')
    
    // 检查是否已存在匿名用户
    const existingUser = await prisma.user.findFirst({
      where: {
        email: 'anonymous@behindmemory.com'
      }
    })
    
    if (existingUser) {
      console.log(`Anonymous user already exists with ID: ${existingUser.id}`)
      console.log(`Add ANONYMOUS_USER_ID=${existingUser.id} to your .env file`)
      return existingUser.id
    }
    
    // 创建匿名用户
    const anonymousUser = await prisma.user.create({
      data: {
        name: 'Anonymous User',
        email: 'anonymous@behindmemory.com',
        credits: 999999, // 非常大的点数值，因为匿名请求不消耗积分
        isVIP: true // 设为VIP以避免限制
      }
    })
    
    console.log(`Anonymous user created with ID: ${anonymousUser.id}`)
    console.log(`Add ANONYMOUS_USER_ID=${anonymousUser.id} to your .env file`)
    return anonymousUser.id
  } catch (error) {
    console.error('Error creating anonymous user:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// 执行脚本
createAnonymousUser() 