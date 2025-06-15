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

    const { prompt, input_image, model = 'pro' } = await request.json()

    // 验证输入
    if (!prompt || !input_image) {
      return NextResponse.json(
        { error: 'Missing prompt or input image' },
        { status: 400 }
      )
    }

    // 验证模型选择
    const validModels = ['pro', 'max']
    if (!validModels.includes(model)) {
      return NextResponse.json(
        { error: 'Invalid model selection' },
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

    // 根据模型类型设置积分消耗
    const creditsRequired = model === 'max' ? 20 : 10
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
      // 根据模型类型调用相应的Replicate API
      const modelName = model === 'max' 
        ? "black-forest-labs/flux-kontext-max"
        : "black-forest-labs/flux-kontext-pro"
      
      console.log(`Starting Flux Kontext ${model.toUpperCase()} generation...`)
      
      const output = await replicate.run(modelName, {
        input: {
          prompt: cleanPrompt,
          input_image: cleanInputImage,
          ...(model === 'pro' && {
            num_inference_steps: 30,
            guidance_scale: 7.5,
            width: 1024,
            height: 1024,
          }),
          ...(model === 'max' && {
            output_format: "jpg"
          })
        }
      })

      console.log('Generation completed, output type:', typeof output)

      // 处理 Replicate 输出
      let blobUrl: string = ''
      
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
        const blob = await put(`flux-generated-${generationRecord.id}.png`, Buffer.from(imageBuffer), {
          access: 'public',
          token: process.env.BLOB_READ_WRITE_TOKEN,
          contentType: 'image/png',
          addRandomSuffix: true,
        })
        
        blobUrl = blob.url
        console.log('Image uploaded to Blob storage:', blobUrl)
        
      } else {
        // 处理其他类型的输出 - 使用类型断言
        const outputData = output as any
        let imageUrl: string
        
        if (Array.isArray(outputData) && outputData.length > 0) {
          // 如果是数组URL
          imageUrl = String(outputData[0])
          console.log('Processing array output URL:', imageUrl)
        } else if (typeof outputData === 'string' && String(outputData).startsWith('http')) {
          // 如果是字符串URL
          imageUrl = String(outputData)
          console.log('Processing string URL:', outputData)
        } else {
          throw new Error(`Unsupported output format: ${typeof outputData}, value: ${JSON.stringify(outputData)}`)
        }
        
        // 添加重试机制下载图片
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            console.log(`Downloading image, attempt ${attempt}/3...`)
            blobUrl = await downloadImageToBlob(imageUrl, {
              filename: `flux-generated-${generationRecord.id}.jpg`,
            })
            console.log('Image download successful')
            break
          } catch (error) {
            console.error(`Download attempt ${attempt} failed:`, error)
            
            // 如果不是最后一次尝试，等待后重试
            if (attempt < 3) {
              console.log(`Waiting 2 seconds before retry...`)
              await new Promise(resolve => setTimeout(resolve, 2000))
            }
          }
        }
        
        // 如果所有重试都失败了
        if (!blobUrl) {
          console.error('All download attempts failed, using original URL as fallback')
          // 作为备选方案，直接使用原始URL
          blobUrl = imageUrl
        }
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