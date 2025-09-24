import { uploadToR2, deleteFromR2, isR2Configured } from './r2-storage'

export type StorageProvider = 'r2'

/**
 * 获取当前激活的存储提供商
 */
export function getActiveStorageProvider(): StorageProvider {
  // 只使用 R2 存储
  if (!isR2Configured()) {
    throw new Error('R2 storage is not configured. Please check your R2 environment variables.')
  }
  return 'r2'
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
    console.log('[存储服务] 使用 R2 上传...')
    const url = await uploadToR2(buffer, filename, options.contentType)
    if (!url) {
      throw new Error('R2 上传失败')
    }
    console.log('[存储服务] R2 上传成功:', url)
    return { url, provider: 'r2' }
  } catch (error: any) {
    console.error('[存储服务] R2 上传失败:', error)
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
    // 只处理 R2 存储的文件删除
    if (process.env.R2_PUBLIC_URL && url.includes(process.env.R2_PUBLIC_URL)) {
      return await deleteFromR2(url)
    }

    console.warn('文件 URL 不属于 R2 存储，无法删除:', url)
    return false
  } catch (error) {
    console.error('R2 文件删除失败:', error)
    return false
  }
}

/**
 * 获取存储提供商信息
 */
export function getStorageInfo() {
  return {
    provider: 'r2' as const,
    isR2: true,
    publicUrl: process.env.R2_PUBLIC_URL || null,
  }
}
