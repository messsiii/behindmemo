import { put } from "@vercel/blob"
import { NextResponse } from "next/server"
import sharp from "sharp"

export const runtime = "nodejs"
export const maxDuration = 60 // 设置最大执行时间为 60 秒

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    if (!file) {
      return NextResponse.json(
        { error: "No file uploaded" },
        { status: 400 }
      )
    }

    if (file.size > 5 * 1024 * 1024) {
      // 5MB limit
      return NextResponse.json({ error: "File size exceeds 5MB limit" }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    
    try {
      // 同步处理图片优化
      const optimizedBuffer = await sharp(buffer)
        .resize(1024, 1024, {  // 最大尺寸 1024x1024
          fit: 'inside',       // 保持宽高比
          withoutEnlargement: true  // 不放大小图
        })
        .jpeg({
          quality: 80,         // 适中的压缩质量
          progressive: true    // 渐进式加载
        })
        .toBuffer()

      // 获取优化后的图片信息
      const imageInfo = await sharp(optimizedBuffer).metadata()

      // 上传到 Vercel Blob
      const blob = await put(file.name, optimizedBuffer, {
        access: "public",
        token: process.env.BLOB_READ_WRITE_TOKEN,
      })

      console.log("Image processing completed", {
        url: blob.url,
        size: optimizedBuffer.length,
        dimensions: `${imageInfo.width}x${imageInfo.height}`,
        compressionRatio: (file.size / optimizedBuffer.length).toFixed(2)
      })

      return NextResponse.json({ 
        success: true,
        url: blob.url,
        size: optimizedBuffer.length,
        dimensions: {
          width: imageInfo.width,
          height: imageInfo.height
        }
      })

    } catch (error) {
      console.error("Image processing failed:", error)
      return NextResponse.json(
        { 
          error: "Failed to process image",
          details: error instanceof Error ? error.message : String(error)
        },
        { status: 500 }
      )
    }

  } catch (error: unknown) {
    console.error("Error in upload API:", error)
    return NextResponse.json(
      { 
        error: "An unexpected error occurred", 
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

