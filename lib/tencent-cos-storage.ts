import COS from 'cos-nodejs-sdk-v5'

/**
 * 获取腾讯云 COS 配置
 */
function getTencentCOSConfig() {
  return {
    SECRET_ID: process.env.TENCENT_COS_SECRET_ID,
    SECRET_KEY: process.env.TENCENT_COS_SECRET_KEY,
    BUCKET: process.env.TENCENT_COS_BUCKET,
    REGION: process.env.TENCENT_COS_REGION,
    DOMAIN: process.env.TENCENT_COS_DOMAIN,
  }
}

/**
 * 创建 COS 客户端
 */
function createCOSClient() {
  const config = getTencentCOSConfig()

  if (!config.SECRET_ID || !config.SECRET_KEY) {
    return null
  }

  return new COS({
    SecretId: config.SECRET_ID,
    SecretKey: config.SECRET_KEY,
  })
}

/**
 * 上传文件到腾讯云 COS
 * @param buffer - 文件 buffer
 * @param filename - 文件名
 * @param contentType - 文件类型
 * @returns 公开访问的 URL
 */
export async function uploadToTencentCOS(
  buffer: Buffer,
  filename: string,
  contentType: string = 'image/jpeg'
): Promise<string | null> {
  const config = getTencentCOSConfig()
  console.log('[腾讯云COS] 配置检查:', {
    hasSecretId: !!config.SECRET_ID,
    hasSecretKey: !!config.SECRET_KEY,
    hasBucket: !!config.BUCKET,
    hasRegion: !!config.REGION,
    hasDomain: !!config.DOMAIN,
  })

  const cosClient = createCOSClient()

  if (!cosClient || !config.BUCKET || !config.REGION || !config.DOMAIN) {
    console.warn('[腾讯云COS] COS 未正确配置:', {
      hasClient: !!cosClient,
      bucket: config.BUCKET,
      region: config.REGION,
      domain: config.DOMAIN,
    })
    return null
  }

  try {
    // 生成唯一的文件 key
    const timestamp = Date.now()
    const randomString =
      Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    const ext = filename.split('.').pop() || 'jpg'
    const key = `uploads/${timestamp}-${randomString}.${ext}`

    // 上传到 COS
    await new Promise((resolve, reject) => {
      cosClient.putObject(
        {
          Bucket: config.BUCKET!,
          Region: config.REGION!,
          Key: key,
          Body: buffer,
          ContentType: contentType,
          CacheControl: 'public, max-age=31536000, immutable',
        },
        (err, data) => {
          if (err) {
            reject(err)
          } else {
            resolve(data)
          }
        }
      )
    })

    // 返回公开访问 URL
    const publicUrl = `${config.DOMAIN}/${key}`
    console.log(`[腾讯云COS] 文件上传成功: ${publicUrl}`)

    return publicUrl
  } catch (error) {
    console.error('[腾讯云COS] 上传失败:', error)
    throw error
  }
}

/**
 * 从腾讯云 COS 删除文件
 * @param url - 文件的公开 URL
 * @returns 是否删除成功
 */
export async function deleteFromTencentCOS(url: string): Promise<boolean> {
  const config = getTencentCOSConfig()
  const cosClient = createCOSClient()

  if (!cosClient || !config.BUCKET || !config.REGION || !config.DOMAIN) {
    console.warn('[腾讯云COS] COS 未正确配置')
    return false
  }

  try {
    // 从 URL 中提取 key
    const key = url.replace(`${config.DOMAIN}/`, '')

    await new Promise((resolve, reject) => {
      cosClient.deleteObject(
        {
          Bucket: config.BUCKET!,
          Region: config.REGION!,
          Key: key,
        },
        (err, data) => {
          if (err) {
            reject(err)
          } else {
            resolve(data)
          }
        }
      )
    })

    console.log(`[腾讯云COS] 文件删除成功: ${key}`)
    return true
  } catch (error) {
    console.error('[腾讯云COS] 删除文件失败:', error)
    return false
  }
}

/**
 * 检查腾讯云 COS 是否已配置
 * @returns 是否已配置 COS
 */
export function isTencentCOSConfigured(): boolean {
  const config = getTencentCOSConfig()
  return !!(
    config.SECRET_ID &&
    config.SECRET_KEY &&
    config.BUCKET &&
    config.REGION &&
    config.DOMAIN
  )
}

/**
 * 获取存储类型
 * @returns 当前使用的存储类型
 */
export function getStorageType(): 'tencent-cos' {
  if (!isTencentCOSConfigured()) {
    throw new Error('Tencent COS storage is not configured')
  }
  return 'tencent-cos'
}
