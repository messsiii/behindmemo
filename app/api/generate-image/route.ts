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
    
    console.log('Received request with model:', model)

    // 验证输入
    if (!prompt || !input_image) {
      return NextResponse.json(
        { error: 'Missing prompt or input image' },
        { status: 400 }
      )
    }

    // 验证模型选择
    const validModels = ['pro', 'max', 'gemini']
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
    const creditsRequired = model === 'max' ? 20 : model === 'gemini' ? 30 : 10
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
          model: model,
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
      let output: any
      
      if (model === 'gemini') {
        // Gemini API 调用
        console.log('Starting Gemini 2.5 Flash Image generation...')
        
        // 准备包含输入图像的prompt
        const fullPrompt = `Based on this image, ${cleanPrompt}`
        
        const geminiResponse = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': process.env.GEMINI_API_KEY || '',
          },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    text: fullPrompt
                  },
                  {
                    inline_data: {
                      mime_type: cleanInputImage.startsWith('data:image/png') ? 'image/png' : 'image/jpeg',
                      data: cleanInputImage.split(',')[1] // 获取base64数据部分
                    }
                  }
                ]
              }
            ],
            generation_config: {
              temperature: 0.8,
              top_p: 0.95,
              top_k: 64,
              max_output_tokens: 8192,
              response_modalities: ['IMAGE', 'TEXT']
            }
          })
        })

        if (!geminiResponse.ok) {
          const errorData = await geminiResponse.json()
          console.error('Gemini API error:', errorData)
          throw new Error(`Gemini API error: ${errorData.error?.message || 'Unknown error'}`)
        }

        const geminiData = await geminiResponse.json()
        // 记录响应结构以调试
        console.log('Gemini response received, candidates count:', geminiData.candidates?.length)
        
        // 检查是否有内容审核错误
        if (geminiData.promptFeedback?.blockReason || 
            geminiData.candidates?.[0]?.finishReason === 'SAFETY' ||
            geminiData.candidates?.[0]?.safetyRatings) {
          console.log('Content blocked by safety filters:', {
            blockReason: geminiData.promptFeedback?.blockReason,
            finishReason: geminiData.candidates?.[0]?.finishReason,
            safetyRatings: geminiData.candidates?.[0]?.safetyRatings
          })
          throw new Error('HARM_CATEGORY: Content was blocked by safety filters')
        }
        
        if (geminiData.candidates?.[0]?.content?.parts) {
          console.log('Parts count:', geminiData.candidates[0].content.parts.length)
          geminiData.candidates[0].content.parts.forEach((part: any, index: number) => {
            console.log(`Part ${index}:`, Object.keys(part))
            if (part.text) {
              console.log(`Part ${index} text:`, part.text)
            }
          })
        } else {
          console.log('No parts found in response. Response keys:', Object.keys(geminiData))
          if (geminiData.promptFeedback) {
            console.log('Prompt feedback:', geminiData.promptFeedback)
          }
          if (!geminiData.candidates || geminiData.candidates.length === 0) {
            console.log('No candidates in response')
          }
        }
        
        // 提取生成的图像
        if (geminiData.candidates?.[0]?.content?.parts) {
          for (const part of geminiData.candidates[0].content.parts) {
            // 同时检查 inlineData 和 inline_data 以兼容不同的响应格式
            const inlineData = part.inlineData || part.inline_data
            if (inlineData?.data) {
              // 将 base64 数据转换为 data URL
              const mimeType = inlineData.mimeType || inlineData.mime_type || 'image/png'
              output = `data:${mimeType};base64,${inlineData.data}`
              console.log('Found image data with mimeType:', mimeType)
              break
            } else if (part.text) {
              console.log('Gemini text response:', part.text)
            }
          }
        }
        
        if (!output) {
          throw new Error('Gemini did not return an image')
        }
      } else {
        // Replicate API 调用
        const modelName = model === 'max' 
          ? "black-forest-labs/flux-kontext-max"
          : "black-forest-labs/flux-kontext-pro"
        
        console.log(`Starting Flux Kontext ${model.toUpperCase()} generation...`)
        
        output = await replicate.run(modelName, {
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
      }

      console.log('Generation completed, output type:', typeof output)

      // 处理输出
      let blobUrl: string = ''
      
      // Gemini 返回的是 data URL，直接使用
      if (model === 'gemini' && typeof output === 'string' && output.startsWith('data:')) {
        blobUrl = output
        console.log('Using Gemini data URL directly')
      } else if (output instanceof ReadableStream) {
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

      // 检查错误类型并设置适当的错误消息
      let errorMessage = 'Unknown error'
      let isContentFlagged = false

      // 生成失败时，退还积分并更新记录状态
      try {
        // 退还积分
        await prisma.user.update({
          where: { id: session.user.id },
          data: { credits: { increment: creditsRequired } }
        })

        // 更新记录状态
        if (error instanceof Error) {
          errorMessage = error.message
          // 检查是否是内容审核错误
          if (errorMessage.includes('HARM_CATEGORY') || 
              errorMessage.includes('content policy') || 
              errorMessage.includes('safety') ||
              errorMessage.includes('blocked')) {
            isContentFlagged = true
            errorMessage = 'Content was flagged as sensitive. Please try using a different prompt that complies with content policies.'
          }
        } else if (typeof error === 'string') {
          errorMessage = error
        }
        
        const failureUpdateData: any = {
          status: 'failed',
          updatedAt: new Date(),
          errorMessage: errorMessage,
          creditsUsed: 0  // 退还积分后，记录显示0积分消耗
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
          details: errorMessage,
          contentFlagged: isContentFlagged
        },
        { status: isContentFlagged ? 400 : 500 }
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