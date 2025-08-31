import { put } from '@vercel/blob'
import { uploadToR2, deleteFromR2, isR2Configured } from './r2-storage'

export type StorageProvider = 'vercel-blob' | 'r2'

/**
 * 获取当前激活的存储提供商
 */
export function getActiveStorageProvider(): StorageProvider {
  // 优先使用环境变量配置
  const storageProvider = process.env.STORAGE_PROVIDER?.toLowerCase()
  
  if (storageProvider === 'r2' && isR2Configured()) {
    return 'r2'
  }
  
  // 如果明确指定了 vercel-blob 或 R2 未配置，使用 Vercel Blob
  return 'vercel-blob'
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
    if (provider === 'r2') {
      const url = await uploadToR2(buffer, filename, options.contentType)
      if (url) {
        return { url, provider: 'r2' }
      }
      // 如果 R2 上传失败，回退到 Vercel Blob
      console.warn('R2 上传失败，回退到 Vercel Blob')
    }
    
    // 使用 Vercel Blob
    const blob = await put(filename, buffer, {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN,
      contentType: options.contentType || 'application/octet-stream',
      addRandomSuffix: false,
    })
    
    return { url: blob.url, provider: 'vercel-blob' }
  } catch (error) {
    console.error('文件上传失败:', error)
    throw error
  }
}

/**
 * 统一的文件删除接口
 * 根据 URL 判断存储提供商并删除
 */
export async function deleteFile(url: string): Promise<boolean> {
  try {
    // 判断 URL 属于哪个存储提供商
    if (url.includes('blob.vercel-storage.com')) {
      // Vercel Blob 暂不支持删除操作
      console.warn('Vercel Blob 不支持删除操作')
      return false
    } else if (process.env.R2_PUBLIC_URL && url.includes(process.env.R2_PUBLIC_URL)) {
      // R2 存储
      return await deleteFromR2(url)
    }
    
    console.warn('无法识别文件 URL 的存储提供商:', url)
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
  const isR2 = provider === 'r2'
  
  return {
    provider,
    isR2,
    isVercelBlob: !isR2,
    publicUrl: isR2 ? process.env.R2_PUBLIC_URL : null,
  }
}