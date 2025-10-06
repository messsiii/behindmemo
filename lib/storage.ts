import { uploadToR2, deleteFromR2, isR2Configured } from './r2-storage'
import {
  uploadToTencentCOS,
  deleteFromTencentCOS,
  isTencentCOSConfigured,
} from './tencent-cos-storage'

export type StorageProvider = 'r2' | 'tencent-cos'

/**
 * 获取当前激活的存储提供商
 */
export function getActiveStorageProvider(): StorageProvider {
  const provider = (process.env.STORAGE_PROVIDER || 'r2') as StorageProvider

  console.log(`[存储服务] 配置的存储提供商: ${provider}`)

  // 根据配置的提供商检查相应的配置
  switch (provider) {
    case 'tencent-cos':
      if (!isTencentCOSConfigured()) {
        throw new Error(
          'Tencent COS is not configured. Please check your TENCENT_COS_* environment variables.'
        )
      }
      return 'tencent-cos'

    case 'r2':
    default:
      if (!isR2Configured()) {
        throw new Error('R2 storage is not configured. Please check your R2 environment variables.')
      }
      return 'r2'
  }
}

/**
 * 统一的文件上传接口
 * 根据配置自动选择存储提供商
 */
export async function uploadFile(
  buffer: Buffer,
  filename: string,
  options: {
    contentType?: string
    metadata?: Record<string, string>
  } = {}
): Promise<{ url: string; provider: StorageProvider }> {
  const provider = getActiveStorageProvider()
  console.log(`[存储服务] 使用存储提供商: ${provider}`)
  console.log(`[存储服务] 文件名: ${filename}`)
  console.log(`[存储服务] 文件大小: ${buffer.length} bytes`)

  try {
    let url: string | null = null

    switch (provider) {
      case 'tencent-cos':
        console.log('[存储服务] 使用腾讯云 COS 上传...')
        url = await uploadToTencentCOS(buffer, filename, options.contentType)
        break

      case 'r2':
      default:
        console.log('[存储服务] 使用 R2 上传...')
        url = await uploadToR2(buffer, filename, options.contentType)
        break
    }

    if (!url) {
      throw new Error(`${provider} 上传失败`)
    }

    console.log(`[存储服务] ${provider} 上传成功:`, url)
    return { url, provider }
  } catch (error: any) {
    console.error(`[存储服务] ${provider} 上传失败:`, error)
    console.error('[存储服务] 错误消息:', error.message)
    console.error('[存储服务] 错误堆栈:', error.stack)
    throw error
  }
}

/**
 * 统一的文件删除接口
 * 根据 URL 判断存储提供商并删除
 */
export async function deleteFile(url: string): Promise<boolean> {
  try {
    // 根据 URL 判断存储提供商
    if (process.env.TENCENT_COS_DOMAIN && url.includes(process.env.TENCENT_COS_DOMAIN)) {
      return await deleteFromTencentCOS(url)
    }

    if (process.env.R2_PUBLIC_URL && url.includes(process.env.R2_PUBLIC_URL)) {
      return await deleteFromR2(url)
    }

    console.warn('文件 URL 不属于任何已配置的存储服务，无法删除:', url)
    return false
  } catch (error) {
    console.error('文件删除失败:', error)
    return false
  }
}

/**
 * 获取存储提供商信息
 */
export function getStorageInfo() {
  const provider = getActiveStorageProvider()

  return {
    provider,
    isR2: provider === 'r2',
    isTencentCOS: provider === 'tencent-cos',
    publicUrl: getPublicUrl(provider),
  }
}

/**
 * 获取当前存储提供商的公共访问域名
 */
function getPublicUrl(provider: StorageProvider): string | null {
  switch (provider) {
    case 'tencent-cos':
      return process.env.TENCENT_COS_DOMAIN || null
    case 'r2':
      return process.env.R2_PUBLIC_URL || null
    default:
      return null
  }
}
