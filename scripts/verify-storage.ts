// 先加载环境变量
import * as dotenv from 'dotenv'
import * as path from 'path'
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

import { getStorageInfo, getActiveStorageProvider } from '../lib/storage'
import { isR2Configured } from '../lib/r2-storage'

console.log('=== 存储服务配置验证 ===\n')

// 1. 检查环境变量
console.log('1. 环境变量配置:')
console.log('   STORAGE_PROVIDER:', process.env.STORAGE_PROVIDER)
console.log('   R2_ACCOUNT_ID:', process.env.R2_ACCOUNT_ID ? '✓ 已设置' : '✗ 未设置')
console.log('   R2_ACCESS_KEY_ID:', process.env.R2_ACCESS_KEY_ID ? '✓ 已设置' : '✗ 未设置')
console.log('   R2_SECRET_ACCESS_KEY:', process.env.R2_SECRET_ACCESS_KEY ? '✓ 已设置' : '✗ 未设置')
console.log('   R2_BUCKET_NAME:', process.env.R2_BUCKET_NAME || '未设置')
console.log('   R2_PUBLIC_URL:', process.env.R2_PUBLIC_URL || '未设置')

// 2. 检查 R2 配置状态
console.log('\n2. R2 配置检查:')
console.log('   isR2Configured():', isR2Configured() ? '✓ 是' : '✗ 否')

// 3. 检查当前激活的存储
console.log('\n3. 当前存储配置:')
const provider = getActiveStorageProvider()
const storageInfo = getStorageInfo()
console.log('   激活的提供商:', provider)
console.log('   存储信息:', storageInfo)

// 4. 结论
console.log('\n4. 结论:')
if (provider === 'r2' && isR2Configured()) {
  console.log('   ✅ R2 存储已正确配置并激活')
  console.log('   新上传的图片将使用 R2 存储')
  console.log('   图片 URL 将使用域名:', storageInfo.publicUrl)
} else if (provider === 'r2' && !isR2Configured()) {
  console.log('   ⚠️  已设置使用 R2，但配置不完整')
  console.log('   将回退到 Vercel Blob 存储')
} else {
  console.log('   ℹ️  当前使用 Vercel Blob 存储')
}

// 5. Gemini API 检查
console.log('\n5. Gemini API 配置:')
console.log('   GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? '✓ 已设置' : '✗ 未设置 (Gemini 模型将无法使用)')