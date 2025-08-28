import { put } from '@vercel/blob'
import sharp from 'sharp'

interface DownloadToBlobOptions {
  filename?: string
  optimize?: boolean
  maxWidth?: number
  maxHeight?: number
  quality?: number
}

/**
 * 下载外部图片URL并保存到Vercel Blob存储
 * @param imageUrl 要下载的图片URL
 * @param options 配置选项
 * @returns Promise<string> 返回Blob存储的URL
 */
export async function downloadImageToBlob(
  imageUrl: string,
  options: DownloadToBlobOptions = {}
): Promise<string> {
  const {
    filename = `image-${Date.now()}.jpg`,
    optimize = false, // 默认不优化，加快处理速度
    quality = 80,
  } = options

  try {
    console.log(`下载图片: ${imageUrl}`)
    
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
      const secureFileName = `download-${Date.now()}-${Math.random().toString(36).substring(2, 15)}-${filename}`
      
      // 上传到Vercel Blob
      const blob = await put(secureFileName, finalBuffer, {
        access: 'public',
        token: process.env.BLOB_READ_WRITE_TOKEN,
        contentType,
        addRandomSuffix: false,
      })

      console.log(`上传成功: ${blob.url}`)
      return blob.url

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
 * 批量下载图片到Blob存储
 * @param imageUrls 图片URL数组
 * @param options 配置选项
 * @returns Promise<string[]> 返回Blob存储URL数组
 */
export async function downloadImagesToBlob(
  imageUrls: string[],
  options: DownloadToBlobOptions = {}
): Promise<string[]> {
  const results: string[] = []
  
  for (let i = 0; i < imageUrls.length; i++) {
    const imageUrl = imageUrls[i]
    try {
      const blobUrl = await downloadImageToBlob(imageUrl, {
        ...options,
        filename: options.filename || `image-${Date.now()}-${i}.jpg`,
      })
      results.push(blobUrl)
    } catch (error) {
      console.error(`下载第${i + 1}张图片失败:`, error)
      // 对于失败的图片，保留原始URL
      results.push(imageUrl)
    }
  }
  
  return results
} 