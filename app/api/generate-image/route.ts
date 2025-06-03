import { authConfig } from '@/auth'
import { downloadImageToBlob } from '@/lib/downloadToBlob'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'
import Replicate from 'replicate'

// 初始化 Replicate 客户端
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
})

export async function POST(request: NextRequest) {
  try {
    // 检查用户认证
    const session = await getServerSession(authConfig)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { prompt, input_image } = await request.json()

    // 验证输入
    if (!prompt || !input_image) {
      return NextResponse.json(
        { error: 'Missing prompt or input image' },
        { status: 400 }
      )
    }

    // 确保数据类型正确
    const cleanPrompt = String(prompt).trim()
    const cleanInputImage = String(input_image).trim()
    
    if (!cleanPrompt || !cleanInputImage) {
      return NextResponse.json(
        { error: 'Invalid prompt or input image format' },
        { status: 400 }
      )
    }

    // 检查用户积分
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { credits: true, isVIP: true }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const creditsRequired = 10
    if (user.credits < creditsRequired) {
      return NextResponse.json(
        { error: 'Insufficient credits' },
        { status: 400 }
      )
    }

    // 扣除积分并创建生成记录
    let generationRecord
    try {
      // 扣除积分（VIP和非VIP都需要扣除）
      await prisma.user.update({
        where: { id: session.user.id },
        data: { credits: { decrement: creditsRequired } }
      })

      // 然后创建生成记录
      generationRecord = await prisma.imageGeneration.create({
        data: {
          userId: session.user.id,
          prompt: cleanPrompt,
          inputImageUrl: cleanInputImage,
          status: 'pending',
          creditsUsed: creditsRequired,
        }
      })

    } catch (error) {
      console.error('Failed to create generation record:', error)
      
      // 如果创建记录失败且已扣积分，需要退还
      try {
        await prisma.user.update({
          where: { id: session.user.id },
          data: { credits: { increment: creditsRequired } }
        })
      } catch (refundError) {
        console.error('Failed to refund credits:', refundError)
      }
      
      return NextResponse.json(
        { error: 'Failed to process request' },
        { status: 500 }
      )
    }

    try {
      // 调用Replicate API生成图片
      console.log('Starting Flux Kontext Pro generation...')
      const output = await replicate.run(
        "black-forest-labs/flux-kontext-pro",
        {
          input: {
            prompt: cleanPrompt,
            input_image: cleanInputImage,
            num_inference_steps: 30,
            guidance_scale: 7.5,
            width: 1024,
            height: 1024,
          }
        }
      )

      console.log('Generation completed, output type:', typeof output)

      // 处理 Replicate 输出
      let blobUrl: string
      
      if (output instanceof ReadableStream) {
        // 如果是流，直接处理流数据
        console.log('Processing ReadableStream output...')
        
        const reader = output.getReader()
        const chunks: Uint8Array[] = []
        
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          chunks.push(value)
        }
        
        // 合并所有数据块
        const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
        const imageBuffer = new Uint8Array(totalLength)
        let offset = 0
        
        for (const chunk of chunks) {
          imageBuffer.set(chunk, offset)
          offset += chunk.length
        }
        
        console.log(`Image data processed, size: ${(imageBuffer.length / 1024 / 1024).toFixed(2)}MB`)
        
        // 直接上传到 Blob 存储
        const { put } = await import('@vercel/blob')
        const blob = await put(`flux-generated-${generationRecord.id}.png`, imageBuffer, {
          access: 'public',
          token: process.env.BLOB_READ_WRITE_TOKEN,
          contentType: 'image/png',
          addRandomSuffix: true,
        })
        
        blobUrl = blob.url
        console.log('Image uploaded to Blob storage:', blobUrl)
        
      } else if (Array.isArray(output) && output.length > 0) {
        // 如果是数组URL
        const imageUrl = String(output[0])
        console.log('Processing array output URL:', imageUrl)
        blobUrl = await downloadImageToBlob(imageUrl, {
          filename: `flux-generated-${generationRecord.id}.jpg`,
        })
        
      } else if (typeof output === 'string' && output.startsWith('http')) {
        // 如果是字符串URL
        console.log('Processing string URL:', output)
        blobUrl = await downloadImageToBlob(output, {
          filename: `flux-generated-${generationRecord.id}.jpg`,
        })
        
      } else {
        throw new Error(`Unsupported output format: ${typeof output}`)
      }

      // 更新生成记录为完成状态
      const updatedRecord = await prisma.imageGeneration.update({
        where: { id: generationRecord.id },
        data: {
          status: 'completed',
          outputImageUrl: blobUrl, // 只存储本地URL
          localOutputImageUrl: blobUrl,
          updatedAt: new Date(),
        }
      })

      return NextResponse.json({
        success: true,
        output: blobUrl,
        recordId: updatedRecord.id,
      })

    } catch (error) {
      console.error('Generation failed:', error)

      // 生成失败时，退还积分并更新记录状态
      try {
        // 退还积分
        await prisma.user.update({
          where: { id: session.user.id },
          data: { credits: { increment: creditsRequired } }
        })

        // 更新记录状态
        const failureUpdateData: any = {
          status: 'failed',
          updatedAt: new Date(),
        }
        
        // 只有当有错误消息时才添加错误消息字段
        if (error instanceof Error && error.message) {
          failureUpdateData.errorMessage = error.message
        } else if (typeof error === 'string' && error) {
          failureUpdateData.errorMessage = error
        } else {
          failureUpdateData.errorMessage = 'Unknown error'
        }

        await prisma.imageGeneration.update({
          where: { id: generationRecord.id },
          data: failureUpdateData
        })
      } catch (refundError) {
        console.error('Failed to refund credits:', refundError)
      }

      return NextResponse.json(
        {
          error: 'Image generation failed',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// 辅助函数：将base64图片上传到云存储
async function uploadBase64ToCloud(base64Data: string): Promise<string> {
  try {
    // 如果您使用 Vercel Blob
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const { put } = await import('@vercel/blob')
      
      // 解析base64数据
      const matches = base64Data.match(/^data:image\/([a-zA-Z]+);base64,(.+)$/)
      if (!matches) {
        throw new Error('Invalid base64 image format')
      }
      
      const [, extension, data] = matches
      const buffer = Buffer.from(data, 'base64')
      
      // 生成唯一文件名
      const filename = `flux-input-${Date.now()}.${extension}`
      
      // 上传到Vercel Blob
      const blob = await put(filename, buffer, {
        access: 'public',
      })
      
      return blob.url
    }
    
    // 如果没有配置云存储，返回原始base64（可能有大小限制）
    return base64Data
    
  } catch (error) {
    console.error('Error uploading image to cloud:', error)
    // 回退到原始base64
    return base64Data
  }
} 