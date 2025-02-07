import { put } from "@vercel/blob"
import { NextResponse } from "next/server"
import sharp from "sharp"

export const runtime = "nodejs"

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

    // 使用 sharp 优化图片
    let optimizedBuffer: Buffer
    try {
      optimizedBuffer = await sharp(buffer)
        .resize(1024, 1024, {  // 最大尺寸 1024x1024
          fit: 'inside',       // 保持宽高比
          withoutEnlargement: true  // 不放大小图
        })
        .jpeg({
          quality: 80,         // 适中的压缩质量
          progressive: true    // 渐进式加载
        })
        .toBuffer()
    } catch (error) {
      console.error("Error optimizing image:", error)
      optimizedBuffer = buffer // 如果优化失败，使用原图
    }

    // 获取优化后的图片信息
    const imageInfo = await sharp(optimizedBuffer).metadata()

    // Upload to Vercel Blob
    try {
      const blob = await put(file.name, optimizedBuffer, {
        access: "public",
        token: process.env.BLOB_READ_WRITE_TOKEN,
      })
      
      return NextResponse.json({ 
        url: blob.url,
        metadata: {
          size: optimizedBuffer.length,
          type: "image/jpeg",
          name: file.name,
          width: imageInfo.width,
          height: imageInfo.height,
          optimized: true,
          originalSize: file.size,
          compressionRatio: (file.size / optimizedBuffer.length).toFixed(2)
        }
      })
    } catch (error: unknown) {
      console.error("Error uploading to Vercel Blob:", error)
      return NextResponse.json(
        { 
          error: "Failed to upload image to storage", 
          details: error instanceof Error ? error.message : String(error)
        },
        { status: 500 }
      )
    }
  } catch (error: unknown) {
    console.error("Detailed error in upload API:", error)
    return NextResponse.json(
      { 
        error: "An unexpected error occurred", 
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

