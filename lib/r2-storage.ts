import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'

// 获取 R2 配置的函数，确保每次调用时都读取最新的环境变量
function getR2Config() {
  return {
    R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
    R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
    R2_BUCKET_NAME: process.env.R2_BUCKET_NAME,
    R2_PUBLIC_URL: process.env.R2_PUBLIC_URL,
  }
}

// 创建 S3 客户端的函数
function createS3Client() {
  const config = getR2Config()
  
  if (!config.R2_ACCOUNT_ID || !config.R2_ACCESS_KEY_ID || !config.R2_SECRET_ACCESS_KEY) {
    return null
  }
  
  return new S3Client({
    region: 'auto',
    endpoint: `https://${config.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.R2_ACCESS_KEY_ID,
      secretAccessKey: config.R2_SECRET_ACCESS_KEY,
    },
  })
}

/**
 * 上传文件到 R2
 * @param buffer - 文件 buffer
 * @param filename - 文件名
 * @param contentType - 文件类型
 * @returns 公开访问的 URL
 */
export async function uploadToR2(
  buffer: Buffer,
  filename: string,
  contentType: string = 'image/jpeg'
): Promise<string | null> {
  const config = getR2Config()
  const s3Client = createS3Client()
  
  if (!s3Client || !config.R2_BUCKET_NAME || !config.R2_PUBLIC_URL) {
    console.warn('R2 未正确配置')
    return null
  }

  try {
    // 生成唯一的文件 key
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    const ext = filename.split('.').pop() || 'jpg'
    const key = `uploads/${timestamp}-${randomString}.${ext}`
    
    // 上传到 R2
    const command = new PutObjectCommand({
      Bucket: config.R2_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      // 设置缓存控制，优化 CDN 性能
      CacheControl: 'public, max-age=31536000, immutable',
      // 添加元数据
      Metadata: {
        uploadedAt: new Date().toISOString(),
        originalFilename: filename,
      },
    })

    await s3Client.send(command)
    
    // 返回公开访问 URL
    const publicUrl = `${config.R2_PUBLIC_URL}/${key}`
    console.log(`文件上传到 R2 成功: ${publicUrl}`)
    
    return publicUrl
  } catch (error) {
    console.error('上传到 R2 失败:', error)
    throw error
  }
}

/**
 * 从 R2 删除文件
 * @param url - 文件的公开 URL
 * @returns 是否删除成功
 */
export async function deleteFromR2(url: string): Promise<boolean> {
  const config = getR2Config()
  const s3Client = createS3Client()
  
  if (!s3Client || !config.R2_BUCKET_NAME || !config.R2_PUBLIC_URL) {
    console.warn('R2 未正确配置')
    return false
  }

  try {
    // 从 URL 中提取 key
    const key = url.replace(`${config.R2_PUBLIC_URL}/`, '')
    
    const command = new DeleteObjectCommand({
      Bucket: config.R2_BUCKET_NAME,
      Key: key,
    })

    await s3Client.send(command)
    console.log(`文件从 R2 删除成功: ${key}`)
    
    return true
  } catch (error) {
    console.error('从 R2 删除文件失败:', error)
    return false
  }
}

/**
 * 检查 R2 是否已配置
 * @returns 是否已配置 R2
 */
export function isR2Configured(): boolean {
  const config = getR2Config()
  return !!(config.R2_ACCOUNT_ID && config.R2_ACCESS_KEY_ID && config.R2_SECRET_ACCESS_KEY && config.R2_BUCKET_NAME && config.R2_PUBLIC_URL)
}

/**
 * 获取存储类型
 * @returns 当前使用的存储类型
 */
export function getStorageType(): 'r2' | 'vercel-blob' {
  return isR2Configured() ? 'r2' : 'vercel-blob'
}