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

    const { prompt, input_image, reference_images, model = 'pro', mode = 'image-to-image', aspectRatio } = await request.json()
    

    // 验证输入
    if (!prompt) {
      return NextResponse.json(
        { error: 'Missing prompt' },
        { status: 400 }
      )
    }

    // 对于图片编辑模式，需要输入图片
    if (mode === 'image-to-image' && !input_image) {
      return NextResponse.json(
        { error: 'Missing input image for image-to-image mode' },
        { status: 400 }
      )
    }

    // 对于多图参考模式，需要参考图片
    if (mode === 'multi-reference' && (!reference_images || reference_images.length === 0)) {
      return NextResponse.json(
        { error: 'Missing reference images for multi-reference mode' },
        { status: 400 }
      )
    }
    
    // Flux 多图参考模式需要恰好2张图片
    if (mode === 'multi-reference' && model !== 'gemini' && reference_images.length !== 2) {
      return NextResponse.json(
        { error: 'Flux multi-reference mode requires exactly 2 images' },
        { status: 400 }
      )
    }

    // 验证参考图片数量 - Flux 只支持2张，Gemini 支持多张
    if (mode === 'multi-reference' && model !== 'gemini' && reference_images.length > 2) {
      return NextResponse.json(
        { error: 'Flux models support maximum 2 reference images' },
        { status: 400 }
      )
    }
    
    if (mode === 'multi-reference' && model === 'gemini' && reference_images.length > 3) {
      return NextResponse.json(
        { error: 'Maximum 3 reference images allowed for Gemini' },
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
    const cleanInputImage = input_image ? String(input_image).trim() : null
    
    if (!cleanPrompt) {
      return NextResponse.json(
        { error: 'Invalid prompt format' },
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
          inputImageUrl: mode === 'multi-reference' && reference_images?.length > 0 
            ? reference_images[0]  // 对于多图参考，保存第一张图作为主图
            : cleanInputImage || '',  // 使用空字符串代替 null
          model: model,
          status: 'pending',
          creditsUsed: creditsRequired,
          metadata: mode === 'multi-reference' && reference_images?.length > 0
            ? {
                mode: 'multi-reference',
                referenceImages: reference_images,  // 保存所有参考图片
                aspectRatio: aspectRatio
              }
            : mode === 'text-to-image' && aspectRatio
            ? {
                mode: 'text-to-image',
                aspectRatio: aspectRatio
              }
            : undefined,
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
        const geminiApiKey = process.env.GEMINI_API_KEY
        if (!geminiApiKey) {
          throw new Error('Gemini API key is not configured')
        }
        
        // Prepare request body based on mode
        let requestParts
        if (mode === 'text-to-image') {
          // Text-to-image mode - only text prompt
          // Add aspect ratio hint to the prompt for Gemini
          let enhancedPrompt = cleanPrompt
          if (aspectRatio && aspectRatio !== '1:1') {
            const aspectHints: Record<string, string> = {
              '16:9': 'widescreen landscape format (16:9 aspect ratio)',
              '9:16': 'vertical portrait format (9:16 aspect ratio)',
              '4:3': 'standard landscape format (4:3 aspect ratio)',
              '3:4': 'standard portrait format (3:4 aspect ratio)',
              '1:2': 'tall portrait format (1:2 aspect ratio)',
              '2:1': 'wide panoramic format (2:1 aspect ratio)'
            }
            enhancedPrompt = `${cleanPrompt}. Generate in ${aspectHints[aspectRatio] || aspectRatio + ' aspect ratio'}.`
          }
          requestParts = [
            {
              text: enhancedPrompt
            }
          ]
        } else if (mode === 'multi-reference') {
          // Multi-reference mode - text + multiple images
          console.log(`Processing ${reference_images?.length || 0} reference images for Gemini multi-reference mode`)
          
          let enhancedPrompt = `Using the following ${reference_images?.length || 0} reference images for style, composition, and elements, ${cleanPrompt}`
          if (aspectRatio && aspectRatio !== '1:1') {
            const aspectHints: Record<string, string> = {
              '16:9': 'widescreen landscape format (16:9 aspect ratio)',
              '9:16': 'vertical portrait format (9:16 aspect ratio)',
              '4:3': 'standard landscape format (4:3 aspect ratio)',
              '3:4': 'standard portrait format (3:4 aspect ratio)',
              '1:2': 'tall portrait format (1:2 aspect ratio)',
              '2:1': 'wide panoramic format (2:1 aspect ratio)'
            }
            enhancedPrompt += `. Generate in ${aspectHints[aspectRatio] || aspectRatio + ' aspect ratio'}.`
          }
          
          requestParts = [
            {
              text: enhancedPrompt
            }
          ]
          
          // Add all reference images
          if (reference_images && reference_images.length > 0) {
            reference_images.forEach((imageData: string, index: number) => {
              // 验证图片数据格式
              if (!imageData || typeof imageData !== 'string') {
                console.error(`Invalid reference image at index ${index}:`, imageData)
                throw new Error(`Invalid reference image data at index ${index}`)
              }
              
              // 确保是 base64 数据格式
              if (!imageData.startsWith('data:')) {
                console.error(`Reference image ${index} is not in data URL format:`, imageData.substring(0, 100))
                throw new Error(`Reference image ${index} must be in data URL format`)
              }
              
              // 提取 base64 数据
              const base64Split = imageData.split(',')
              if (base64Split.length !== 2) {
                console.error(`Invalid data URL format for reference image ${index}`)
                throw new Error(`Invalid data URL format for reference image ${index}`)
              }
              
              const base64Data = base64Split[1]
              if (!base64Data || base64Data.length === 0) {
                console.error(`Empty base64 data for reference image ${index}`)
                throw new Error(`Empty base64 data for reference image ${index}`)
              }
              
              // 获取 MIME 类型
              const mimeMatch = imageData.match(/^data:([^;]+);base64,/)
              const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg'
              
              console.log(`Reference image ${index + 1}: MIME type = ${mimeType}, data length = ${base64Data.length}`)
              
              requestParts.push({
                inline_data: {
                  mime_type: mimeType,
                  data: base64Data
                }
              })
            })
          }
        } else {
          // Image-to-image mode - text + image
          const fullPrompt = `Based on this image, ${cleanPrompt}`
          requestParts = [
            {
              text: fullPrompt
            },
            {
              inline_data: {
                mime_type: cleanInputImage!.startsWith('data:image/png') ? 'image/png' : 'image/jpeg',
                data: cleanInputImage!.split(',')[1] // 获取base64数据部分
              }
            }
          ]
        }
        
        const geminiResponse = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': geminiApiKey,
          },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: requestParts
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
          console.error('Request parts summary:', {
            partsCount: requestParts.length,
            textPart: requestParts[0],
            imageParts: requestParts.slice(1).map((part: any, idx: number) => ({
              index: idx + 1,
              hasData: !!part.inline_data?.data,
              dataLength: part.inline_data?.data?.length || 0,
              mimeType: part.inline_data?.mime_type
            }))
          })
          throw new Error(`Gemini API error: ${errorData.error?.message || JSON.stringify(errorData) || 'Unknown error'}`)
        }

        const geminiData = await geminiResponse.json()
        
        // 检查是否有内容审核错误
        if (geminiData.promptFeedback?.blockReason || 
            geminiData.candidates?.[0]?.finishReason === 'SAFETY' ||
            geminiData.candidates?.[0]?.safetyRatings) {
          throw new Error('HARM_CATEGORY: Content was blocked by safety filters')
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
              break
            }
          }
        }
        
        if (!output) {
          throw new Error('Gemini did not return an image')
        }
      } else {
        // Replicate API 调用
        let modelName
        let modelVersion
        
        // 根据模式选择不同的模型
        if (mode === 'multi-reference') {
          // 使用专门的多图参考模型
          modelName = "flux-kontext-apps/multi-image-kontext-pro"
          modelVersion = "f3545943bdffdf06420f0d8ececf86a36ce401b9df0ad5ec0124234c0665cfed"
        } else {
          // 使用标准模型
          modelName = model === 'max' 
            ? "black-forest-labs/flux-kontext-max"
            : "black-forest-labs/flux-kontext-pro"
        }
        
        // Prepare input based on mode
        let replicateInput: any = {}
        
        if (mode === 'multi-reference') {
          // 多图参考模式使用不同的参数结构
          replicateInput = {
            prompt: cleanPrompt,
            input_image_1: reference_images[0],
            input_image_2: reference_images[1],
            aspect_ratio: aspectRatio || '1:1',
            output_format: "png",
            safety_tolerance: 2,
          }
        } else {
          // 标准模式参数
          replicateInput = {
            prompt: cleanPrompt,
            output_format: model === 'max' ? "jpg" : "png",
            safety_tolerance: 2,
            prompt_upsampling: false,
          }

          // Add aspect ratio or input image based on mode
          if (mode === 'image-to-image') {
            replicateInput.input_image = cleanInputImage
            replicateInput.aspect_ratio = "match_input_image"
          } else {
            // For text-to-image, use the provided aspect ratio
            replicateInput.aspect_ratio = aspectRatio || '1:1'
          }
        }

        // Model-specific settings
        if (model === 'pro') {
          replicateInput.num_inference_steps = 30
          replicateInput.guidance_scale = 7.5
        }

        // 根据是否有版本ID来决定如何调用
        if (modelVersion) {
          output = await replicate.run(`${modelName}:${modelVersion}` as `${string}/${string}:${string}`, {
            input: replicateInput
          })
        } else {
          output = await replicate.run(modelName as `${string}/${string}`, {
            input: replicateInput
          })
        }
      }

      // 处理输出
      let blobUrl: string = ''
      
      // Gemini 返回的是 data URL，直接使用
      if (model === 'gemini' && typeof output === 'string' && output.startsWith('data:')) {
        blobUrl = output
      } else if (output instanceof ReadableStream) {
        // 如果是流，直接处理流数据
        
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
        
        // 直接上传到 Blob 存储
        const { put } = await import('@vercel/blob')
        // 生成不可猜测的文件名（使用generation ID + 随机字符串）
        const secureFileName = `flux-${generationRecord.id}-${Date.now()}-${Math.random().toString(36).substring(2, 15)}.png`
        const blob = await put(secureFileName, Buffer.from(imageBuffer), {
          access: 'public',
          token: process.env.BLOB_READ_WRITE_TOKEN,
          contentType: 'image/png',
          addRandomSuffix: false, // 我们已经有了随机后缀
        })
        
        blobUrl = blob.url
        
      } else {
        // 处理其他类型的输出 - 使用类型断言
        const outputData = output as any
        let imageUrl: string
        
        if (Array.isArray(outputData) && outputData.length > 0) {
          // 如果是数组URL
          imageUrl = String(outputData[0])
        } else if (typeof outputData === 'string' && String(outputData).startsWith('http')) {
          // 如果是字符串URL
          imageUrl = String(outputData)
        } else {
          throw new Error(`Unsupported output format: ${typeof outputData}, value: ${JSON.stringify(outputData)}`)
        }
        
        // 添加重试机制下载图片
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            blobUrl = await downloadImageToBlob(imageUrl, {
              filename: `flux-generated-${generationRecord.id}.jpg`,
            })
            break
          } catch (error) {
            // 如果不是最后一次尝试，等待后重试
            if (attempt < 3) {
              await new Promise(resolve => setTimeout(resolve, 2000))
            }
          }
        }
        
        // 如果所有重试都失败了
        if (!blobUrl) {
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