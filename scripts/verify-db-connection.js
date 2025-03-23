/**
 * 验证数据库连接环境变量设置
 * 
 * 1. 检查 DATABASE_URL 是否包含必要的连接池参数
 * 2. 确保有 DIRECT_DATABASE_URL 用于迁移
 * 3. 提供修复指南
 */

// 检查环境变量
require('dotenv').config();

const dbUrl = process.env.DATABASE_URL || '';
const directDbUrl = process.env.DIRECT_DATABASE_URL || '';

console.log('数据库连接配置验证:');
console.log('-----------------------------------');

// 检查 DATABASE_URL
if (!dbUrl) {
  console.error('❌ 未找到 DATABASE_URL 环境变量');
} else {
  console.log('✅ DATABASE_URL 存在');
  
  // 检查连接池参数
  const hasConnectionLimit = dbUrl.includes('connection_limit=');
  const hasPoolTimeout = dbUrl.includes('pool_timeout=');
  const hasIdleTimeout = dbUrl.includes('idle_timeout=') || dbUrl.includes('idle_in_transaction_session_timeout=');
  
  if (!hasConnectionLimit) {
    console.warn('⚠️  DATABASE_URL 缺少 connection_limit 参数');
  } else {
    console.log('✅ 已配置 connection_limit 参数');
  }
  
  if (!hasPoolTimeout) {
    console.warn('⚠️  DATABASE_URL 缺少 pool_timeout 参数');
  } else {
    console.log('✅ 已配置 pool_timeout 参数');
  }
  
  if (!hasIdleTimeout) {
    console.warn('⚠️  DATABASE_URL 可能需要配置空闲超时参数');
  } else {
    console.log('✅ 已配置空闲超时参数');
  }
}

// 检查 DIRECT_DATABASE_URL
if (!directDbUrl) {
  console.error('❌ 未找到 DIRECT_DATABASE_URL 环境变量');
} else {
  console.log('✅ DIRECT_DATABASE_URL 存在');
}

console.log('\n');
console.log('-----------------------------------');
console.log('修复建议:');

// 提供修复建议
if (!dbUrl || !hasConnectionLimit || !hasPoolTimeout) {
  console.log(`
1. 在 .env 文件中添加或修改以下环境变量:

# 连接池配置 - 确保数据库连接稳定性
DATABASE_URL="你的现有连接URL?connection_limit=5&pool_timeout=30"

# 如果你使用 PostgreSQL 托管服务，可能还需要设置数据库空闲超时参数
DATABASE_URL="你的现有连接URL?connection_limit=5&pool_timeout=30&idle_in_transaction_session_timeout=30000"

# 直接数据库连接，用于迁移等操作
DIRECT_DATABASE_URL="与原DATABASE_URL相同但不带连接池参数的URL"

2. 如果使用云端托管的 PostgreSQL (如 Neon、Supabase等):
   - 在数据库管理控制台中检查并增加空闲超时设置
   - 考虑使用连接池服务如 PgBouncer 提高连接稳定性
  `);
}

console.log(`
3. 我们已经添加了健康检查机制，每60秒执行一次简单查询以保持连接活跃。
   这将减少连接关闭错误的出现，但仍建议适当配置数据库连接参数。

4. 如果仍然遇到连接问题，可以考虑:
   - 减少连接池大小 (设置 connection_limit=3 或更小)
   - 增加池超时 (设置 pool_timeout=60 或更大)
   - 使用专业连接池工具 (如 PgBouncer 或 Prisma Accelerate)
`);

console.log('-----------------------------------');
