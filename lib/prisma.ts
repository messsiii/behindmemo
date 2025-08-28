import { PrismaClient } from '@prisma/client'

// 防止开发环境中创建多个实例
const globalForPrisma = global as unknown as { prisma: PrismaClient }

// 添加连接池超时和重试逻辑
export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
    // 添加数据库连接错误重试逻辑
    errorFormat: 'minimal',
  })

// 注释掉立即连接，避免构建时触发配额错误
// if (process.env.NODE_ENV === 'production') {
//   prisma.$connect().catch((error) => {
//     console.error('[PRISMA] Initial connection failed:', error)
//   })
// }

// 处理连接关闭错误的健康检查机制
let isConnected = true
let healthCheckInterval: NodeJS.Timeout | null = null

// 定期健康检查，确保连接活跃
const startHealthCheck = () => {
  if (healthCheckInterval) return
  
  // 每60秒执行一次健康检查，比数据库空闲超时短
  healthCheckInterval = setInterval(async () => {
    try {
      // 执行简单查询以保持连接活跃
      if (isConnected) {
        await prisma.$queryRaw`SELECT 1`
      }
    } catch (error) {
      console.error('Prisma health check failed:', error)
      isConnected = false
      
      // 尝试重新连接
      try {
        await prisma.$disconnect()
        await prisma.$connect()
        isConnected = true
        console.log('Prisma reconnected successfully')
      } catch (reconnectError) {
        console.error('Failed to reconnect Prisma:', reconnectError)
      }
    }
  }, 60000) // 60秒
}

// 启动健康检查
if (process.env.NODE_ENV === 'production') {
  startHealthCheck()
}

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// 应用退出前断开连接
process.on('beforeExit', async () => {
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval)
    healthCheckInterval = null
  }
  await prisma.$disconnect()
})

// 处理意外关闭
process.on('SIGINT', async () => {
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval)
    healthCheckInterval = null
  }
  await prisma.$disconnect()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval)
    healthCheckInterval = null
  }
  await prisma.$disconnect()
  process.exit(0)
})
