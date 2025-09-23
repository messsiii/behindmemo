/**
 * 压缩图片至指定最大宽度，保持原比例
 */
export async function compressImage(
  file: File,
  maxWidth: number = 1920, // 1080p 的宽度
  quality: number = 0.85
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = e => {
      const img = new Image()
      img.onload = () => {
        // 计算新的尺寸
        let width = img.width
        let height = img.height

        // 只有当图片宽度大于最大宽度时才进行压缩
        if (width > maxWidth) {
          height = (height * maxWidth) / width
          width = maxWidth
        }

        // 创建 canvas 进行压缩
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('无法创建 canvas context'))
          return
        }

        // 绘制压缩后的图片
        ctx.drawImage(img, 0, 0, width, height)

        // 转换为 blob
        canvas.toBlob(
          blob => {
            if (blob) {
              resolve(blob)
            } else {
              reject(new Error('压缩失败'))
            }
          },
          'image/jpeg',
          quality
        )
      }

      img.onerror = () => reject(new Error('图片加载失败'))
      img.src = e.target?.result as string
    }

    reader.onerror = () => reject(new Error('文件读取失败'))
    reader.readAsDataURL(file)
  })
}

/**
 * 将 Blob 转换为 File
 */
export function blobToFile(blob: Blob, fileName: string): File {
  return new File([blob], fileName, {
    type: blob.type,
    lastModified: Date.now(),
  })
}
