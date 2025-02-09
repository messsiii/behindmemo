import { put } from '@vercel/blob'
import { NextResponse } from 'next/server'
import sharp from 'sharp'

export const runtime = 'nodejs'
export const maxDuration = 60 // 设置最大执行时间为 60 秒

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const TARGET_QUALITY = 80
const MAX_WIDTH = 1920
const MAX_HEIGHT = 1080

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit` },
        { status: 400 }
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    try {
      // 获取原始图片信息
      const metadata = await sharp(buffer).metadata()

      // 计算目标尺寸，保持宽高比
      let targetWidth = metadata.width || 0
      let targetHeight = metadata.height || 0

      if (targetWidth > MAX_WIDTH || targetHeight > MAX_HEIGHT) {
        const aspectRatio = targetWidth / targetHeight

        if (aspectRatio > MAX_WIDTH / MAX_HEIGHT) {
          // 宽度超出限制
          targetWidth = MAX_WIDTH
          targetHeight = Math.round(MAX_WIDTH / aspectRatio)
        } else {
          // 高度超出限制
          targetHeight = MAX_HEIGHT
          targetWidth = Math.round(MAX_HEIGHT * aspectRatio)
        }
      }

      // 优化图片
      const optimizedBuffer = await sharp(buffer)
        .resize(targetWidth, targetHeight, {
          fit: 'inside',
          withoutEnlargement: true,
          fastShrinkOnLoad: true,
        })
        .jpeg({
          quality: TARGET_QUALITY,
          progressive: true,
          optimizeScans: true,
          mozjpeg: true,
        })
        .toBuffer()

      // 获取优化后的图片信息
      const optimizedInfo = await sharp(optimizedBuffer).metadata()

      // 计算压缩率
      const compressionRatio = (file.size / optimizedBuffer.length).toFixed(2)
      const savedSpace = ((file.size - optimizedBuffer.length) / 1024).toFixed(2)

      // 上传到 Vercel Blob
      const blob = await put(file.name, optimizedBuffer, {
        access: 'public',
        token: process.env.BLOB_READ_WRITE_TOKEN,
        contentType: 'image/jpeg', // 统一使用 JPEG 格式
        addRandomSuffix: true, // 添加随机后缀避免文件名冲突
      })

      console.log('Image optimization completed', {
        originalSize: `${(file.size / 1024).toFixed(2)}KB`,
        optimizedSize: `${(optimizedBuffer.length / 1024).toFixed(2)}KB`,
        savedSpace: `${savedSpace}KB`,
        compressionRatio,
        originalDimensions: `${metadata.width}x${metadata.height}`,
        optimizedDimensions: `${optimizedInfo.width}x${optimizedInfo.height}`,
        format: optimizedInfo.format,
      })

      return NextResponse.json({
        success: true,
        url: blob.url,
        size: optimizedBuffer.length,
        dimensions: {
          width: optimizedInfo.width,
          height: optimizedInfo.height,
        },
        optimization: {
          savedSpace: `${savedSpace}KB`,
          compressionRatio,
        },
      })
    } catch (error) {
      console.error('Image processing failed:', error)
      return NextResponse.json(
        {
          error: 'Failed to process image',
          details: error instanceof Error ? error.message : String(error),
        },
        { status: 500 }
      )
    }
  } catch (error: unknown) {
    console.error('Error in upload API:', error)
    return NextResponse.json(
      {
        error: 'An unexpected error occurred',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
