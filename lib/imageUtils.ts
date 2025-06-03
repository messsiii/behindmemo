/**
 * 图片处理工具函数
 */

// 目标尺寸配置
const TARGET_WIDTH = 1920
const TARGET_HEIGHT = 1080
const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2MB

/**
 * 调整图片尺寸到1080p，保持原比例
 * @param file 原始图片文件
 * @param maxWidth 最大宽度，默认1920
 * @param maxHeight 最大高度，默认1080
 * @param quality 压缩质量，默认0.8
 * @returns 处理后的base64字符串
 */
export async function resizeImageTo1080p(
  file: File,
  maxWidth: number = TARGET_WIDTH,
  maxHeight: number = TARGET_HEIGHT,
  quality: number = 0.8
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      reject(new Error('无法创建Canvas上下文'))
      return
    }

    // 设置超时，避免无限等待
    const timeout = setTimeout(() => {
      // 清理资源
      img.onload = null
      img.onerror = null
      img.src = ''
      canvas.width = 0
      canvas.height = 0
      reject(new Error('图片处理超时'))
    }, 30000) // 30秒超时

    img.onload = () => {
      try {
        clearTimeout(timeout)
        
        // 计算新的尺寸，保持原比例
        const { width: newWidth, height: newHeight } = calculateNewDimensions(
          img.width,
          img.height,
          maxWidth,
          maxHeight
        )

        // 设置canvas尺寸
        canvas.width = newWidth
        canvas.height = newHeight

        // 清除画布并绘制调整后的图片
        ctx.clearRect(0, 0, newWidth, newHeight)
        ctx.drawImage(img, 0, 0, newWidth, newHeight)

        // 转换为base64
        const base64 = canvas.toDataURL('image/jpeg', quality)
        
        // 检查文件大小，如果还是太大就降低质量
        if (base64.length > MAX_FILE_SIZE * 1.37) { // base64比二进制大约37%
          const lowerQuality = Math.max(0.3, quality - 0.2)
          canvas.toBlob((blob) => {
            if (blob && blob.size <= MAX_FILE_SIZE) {
              const reader = new FileReader()
              reader.onload = () => {
                // 清理资源
                cleanup()
                resolve(reader.result as string)
              }
              reader.onerror = () => {
                cleanup()
                reject(new Error('文件读取失败'))
              }
              reader.readAsDataURL(blob)
            } else {
              // 清理当前资源
              cleanup()
              // 递归降低质量
              resizeImageTo1080p(file, maxWidth, maxHeight, lowerQuality)
                .then(resolve)
                .catch(reject)
            }
          }, 'image/jpeg', lowerQuality)
        } else {
          // 清理资源
          cleanup()
          resolve(base64)
        }
      } catch (error) {
        cleanup()
        reject(new Error('图片处理失败'))
      }
    }

    img.onerror = () => {
      clearTimeout(timeout)
      cleanup()
      reject(new Error('图片加载失败'))
    }

    // 清理函数
    const cleanup = () => {
      img.onload = null
      img.onerror = null
      img.src = ''
      canvas.width = 0
      canvas.height = 0
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    }

    // 开始加载图片
    const reader = new FileReader()
    reader.onload = (e) => {
      img.src = e.target?.result as string
    }
    reader.onerror = () => {
      clearTimeout(timeout)
      cleanup()
      reject(new Error('文件读取失败'))
    }
    reader.readAsDataURL(file)
  })
}

/**
 * 计算保持比例的新尺寸
 */
function calculateNewDimensions(
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  // 如果原始尺寸已经小于等于目标尺寸，保持原样
  if (originalWidth <= maxWidth && originalHeight <= maxHeight) {
    return { width: originalWidth, height: originalHeight }
  }

  // 计算宽高比
  const aspectRatio = originalWidth / originalHeight

  let newWidth = maxWidth
  let newHeight = maxHeight

  // 根据比例调整尺寸
  if (aspectRatio > maxWidth / maxHeight) {
    // 图片更宽，以宽度为准
    newHeight = Math.round(maxWidth / aspectRatio)
  } else {
    // 图片更高，以高度为准
    newWidth = Math.round(maxHeight * aspectRatio)
  }

  return { width: newWidth, height: newHeight }
}

/**
 * 获取图片文件的原始尺寸
 */
export function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    
    // 设置超时
    const timeout = setTimeout(() => {
      img.onload = null
      img.onerror = null
      img.src = ''
      reject(new Error('获取图片尺寸超时'))
    }, 10000) // 10秒超时
    
    img.onload = () => {
      clearTimeout(timeout)
      const dimensions = { width: img.width, height: img.height }
      // 清理Image对象
      img.onload = null
      img.onerror = null
      img.src = ''
      resolve(dimensions)
    }
    
    img.onerror = () => {
      clearTimeout(timeout)
      img.onload = null
      img.onerror = null
      img.src = ''
      reject(new Error('无法获取图片尺寸'))
    }
    
    const reader = new FileReader()
    reader.onload = (e) => {
      img.src = e.target?.result as string
    }
    reader.onerror = () => {
      clearTimeout(timeout)
      img.onload = null
      img.onerror = null
      img.src = ''
      reject(new Error('文件读取失败'))
    }
    reader.readAsDataURL(file)
  })
}

/**
 * 检查文件是否为有效的图片格式
 */
export function isValidImageFile(file: File): boolean {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  return validTypes.includes(file.type)
}

/**
 * 格式化文件大小显示
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
} 