import { PrismaClient } from '@prisma/client'

// 防止开发环境中创建多个实例
const globalForPrisma = global as unknown as { prisma: PrismaClient }

// Neon 数据库特定：设置连接策略
if (typeof process !== 'undefined') {
  // 使用 HTTP 协议而不是二进制协议，更适合 serverless
  process.env.PRISMA_ENGINE_PROTOCOL = 'json'
}

// 为 Vercel Serverless 环境优化的配置
// 对于 Neon，优先使用非池化连接以获得更好的性能
// 池化连接在 serverless 环境可能导致超时
const connectionString =
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  ''

// 构建优化的数据库 URL
let optimizedUrl = connectionString
// 对所有环境应用连接优化，避免长时间挂起
if (connectionString) {
  try {
    const databaseUrl = new URL(connectionString)
    // Neon 特定的优化参数 - 针对非池化连接
    // 如果 URL 不包含这些参数，添加它们
    if (!connectionString.includes('UNPOOLED') && !connectionString.includes('NON_POOLING')) {
      // 池化连接的参数
      if (!databaseUrl.searchParams.has('connection_limit')) {
        databaseUrl.searchParams.set('connection_limit', '1')
      }
      if (!databaseUrl.searchParams.has('pool_timeout')) {
        databaseUrl.searchParams.set('pool_timeout', '10')
      }
    }

    if (
      !databaseUrl.searchParams.has('connect_timeout') &&
      !connectionString.includes('connect_timeout')
    ) {
      databaseUrl.searchParams.set('connect_timeout', '5') // 快速连接超时
    }

    // 添加更多参数来稳定连接
    if (!databaseUrl.searchParams.has('statement_timeout')) {
      databaseUrl.searchParams.set('statement_timeout', '15000') // 15秒语句超时
    }
    if (!databaseUrl.searchParams.has('idle_in_transaction_session_timeout')) {
      databaseUrl.searchParams.set('idle_in_transaction_session_timeout', '10000') // 10秒空闲超时
    }
    optimizedUrl = databaseUrl.toString()
    console.log('[Prisma] Using optimized connection URL with timeout settings')
  } catch (error) {
    console.error('Failed to parse DATABASE_URL, using original:', error)
    // 如果 URL 解析失败，使用原始 URL
    optimizedUrl = connectionString
  }
}

// 创建 Prisma 客户端实例
const createPrismaClient = () => {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: optimizedUrl,
      },
    },
    errorFormat: 'minimal',
  })
}

// 添加连接池超时和重试逻辑
export const prisma = globalForPrisma.prisma || createPrismaClient()

// 添加连接健康检查和自动重连
if (!globalForPrisma.prisma) {
  // 定期 ping 以保持连接活跃（仅在生产环境）
  if (process.env.NODE_ENV === 'production') {
    setInterval(async () => {
      try {
        await prisma.$queryRaw`SELECT 1`
      } catch (e) {
        // 忽略错误，连接会在下次使用时自动重建
      }
    }, 30000) // 每30秒 ping 一次
  }
}

// 对于 Neon，不进行预热查询以避免不必要的连接
// Neon 的 serverless 特性意味着连接会按需创建

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
