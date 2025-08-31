import sharp from 'sharp'
import { uploadFile, getStorageInfo } from './storage'

interface DownloadToStorageOptions {
  optimize?: boolean
  maxWidth?: number
  maxHeight?: number
  quality?: number
}

/**
 * 下载外部图片URL并保存到配置的存储服务
 * @param imageUrl 要下载的图片URL
 * @param options 配置选项
 * @returns Promise<string> 返回存储的URL
 */
export async function downloadImageToStorage(
  imageUrl: string,
  options: DownloadToStorageOptions = {}
): Promise<string> {
  const {
    optimize = false, // 默认不优化，加快处理速度
    quality = 80,
  } = options

  try {
    const storageInfo = getStorageInfo()
    console.log(`下载图片并上传到 ${storageInfo.provider}: ${imageUrl}`)
    
    // 创建带超时的AbortController
    const controller = new AbortController()
    const timeoutId = setTimeout(() => {
      controller.abort()
    }, 60000) // 60秒超时
    
    try {
      // 下载图片
      const response = await fetch(imageUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; ImageBot/1.0)',
        },
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const arrayBuffer = await response.arrayBuffer()
      let finalBuffer = Buffer.from(arrayBuffer)
      let contentType = response.headers.get('content-type') || 'image/jpeg'
      
      console.log(`下载完成，大小: ${(finalBuffer.length / 1024 / 1024).toFixed(2)}MB`)

      // 简单优化（如果启用）
      if (optimize && finalBuffer.length > 1024 * 1024) { // 只对大于1MB的图片优化
        try {
          finalBuffer = await sharp(finalBuffer)
            .jpeg({ quality, progressive: true })
            .toBuffer()
          contentType = 'image/jpeg'
          console.log(`优化完成，新大小: ${(finalBuffer.length / 1024 / 1024).toFixed(2)}MB`)
        } catch (optimizeError) {
          console.warn('优化失败，使用原始图片:', optimizeError)
        }
      }

      // 生成安全的文件名
      const randomString = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
      const secureFileName = `dl-${Date.now()}-${randomString}.jpg`
      
      // 上传到存储服务
      const { url, provider } = await uploadFile(finalBuffer, secureFileName, {
        contentType,
      })

      console.log(`上传成功到 ${provider}: ${url}`)
      return url

    } catch (fetchError) {
      clearTimeout(timeoutId)
      throw fetchError
    }

  } catch (error) {
    console.error('下载失败:', error)
    
    // 提供更详细的错误信息
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error(`Download timeout after 60 seconds: ${imageUrl}`)
      } else if (error.message.includes('ECONNRESET')) {
        throw new Error(`Network connection reset while downloading: ${imageUrl}`)
      } else if (error.message.includes('ENOTFOUND')) {
        throw new Error(`DNS resolution failed for: ${imageUrl}`)
      } else if (error.message.includes('ECONNREFUSED')) {
        throw new Error(`Connection refused for: ${imageUrl}`)
      }
    }
    
    throw new Error(`Download failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * 批量下载图片到存储服务
 * @param imageUrls 图片URL数组
 * @param options 配置选项
 * @returns Promise<string[]> 返回存储URL数组
 */
export async function downloadImagesToStorage(
  imageUrls: string[],
  options: DownloadToStorageOptions = {}
): Promise<string[]> {
  const results: string[] = []
  
  for (let i = 0; i < imageUrls.length; i++) {
    const imageUrl = imageUrls[i]
    try {
      const storageUrl = await downloadImageToStorage(imageUrl, options)
      results.push(storageUrl)
    } catch (error) {
      console.error(`下载第${i + 1}张图片失败:`, error)
      // 对于失败的图片，保留原始URL
      results.push(imageUrl)
    }
  }
  
  return results
}