import { PrismaClient } from '@prisma/client'

// 防止开发环境中创建多个实例
const globalForPrisma = global as unknown as { prisma: PrismaClient }

// 为 Vercel Serverless 环境优化的配置
const connectionString = process.env.DATABASE_URL || ''

// 构建优化的数据库 URL
let optimizedUrl = connectionString
if (connectionString && process.env.NODE_ENV === 'production') {
  try {
    const databaseUrl = new URL(connectionString)
    // Serverless 环境优化参数
    databaseUrl.searchParams.set('connection_limit', '1') // 单连接
    databaseUrl.searchParams.set('pool_timeout', '2') // 2秒超时
    optimizedUrl = databaseUrl.toString()
  } catch (error) {
    console.error('Failed to parse DATABASE_URL, using original:', error)
    // 如果 URL 解析失败，使用原始 URL
    optimizedUrl = connectionString
  }
}

// 添加连接池超时和重试逻辑
export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: optimizedUrl,
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

// 在 Vercel Serverless 环境中禁用健康检查
// Serverless 函数是无状态的，每次请求都会创建新实例
// 健康检查会导致连接池问题和超时错误

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Serverless 环境不需要手动处理连接关闭
// Vercel 会自动管理函数生命周期
