import { uploadFile } from './storage'

/**
 * 下载外部图片并上传到配置的存储服务
 * @param imageUrl 外部图片URL
 * @returns 存储后的图片URL
 */
export async function downloadImageToStorage(imageUrl: string): Promise<string> {
  try {
    // 下载图片
    const response = await fetch(imageUrl)
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.statusText}`)
    }

    // 获取图片数据
    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // 从URL中提取文件扩展名，默认为jpg
    const urlParts = imageUrl.split('.')
    const extension = urlParts[urlParts.length - 1]?.toLowerCase() || 'jpg'
    const validExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif']
    const fileExtension = validExtensions.includes(extension) ? extension : 'jpg'

    // 生成文件名
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 15)
    const filename = `downloaded-${timestamp}-${randomString}.${fileExtension}`

    // 获取内容类型
    const contentType = response.headers.get('content-type') || `image/${fileExtension}`

    // 上传到存储服务
    const { url } = await uploadFile(buffer, filename, { 
      contentType,
      metadata: {
        source: 'external-download',
        originalUrl: imageUrl
      }
    })

    return url
  } catch (error) {
    console.error('Error downloading and storing image:', error)
    throw error
  }
}