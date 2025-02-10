// import { MiniMax } from '@/types/minimax'

interface GpsData {
  address?: string
  raw_address?: string
  coordinates?: {
    latitude: number
    longitude: number
  }
}

interface ImageMetadata {
  location?: string
  uploadTime?: string
  orientation?: string
  gps?: GpsData
  context?: {
    uploadDevice?: string
    screenSize?: string
    colorDepth?: number
    location?: string
  }
  name?: string
  loverName?: string
}

interface GenerateLetterParams {
  prompt: string
  language?: string
  metadata?: ImageMetadata
}

export async function generateLetter({
  prompt,
  language = 'en',
  metadata,
}: GenerateLetterParams): Promise<string> {
  try {
    // 构建系统提示词
    const systemPrompt =
      language === 'zh'
        ? '你是一个情书写手，根据用户提供的照片和信息，用王小波的文风（不要提到王小波）写一封情书，用英文输出。请使用用户提供的实际名字，不要使用 [Name] 或 [Your Name] 等占位符。'
        : 'You are a love letter writer. Based on the user\'s photo and information, write a love letter in Wang Xiaobo\'s style (without mentioning Wang Xiaobo) in English. Please use the actual names provided by the user, do not use placeholders like [Name] or [Your Name].'

    // 准备用户提示词
    let userPrompt = `我的名字是"${metadata?.name || 'Anonymous'}"，我想写一封情书给"${metadata?.loverName || 'My Love'}"，这是我们的故事：

${prompt}

照片元数据信息：${
  metadata
    ? JSON.stringify({
        location: metadata.location,
        uploadTime: metadata.uploadTime,
        context: metadata.context,
      }, null, 2)
    : '无元数据信息'
}`

    // 如果有图片元数据,添加到用户提示词中
    if (metadata) {
      // 地理位置信息
      const locationInfo = metadata.location
        ? `The photo was taken at ${metadata.location}.`
        : metadata.gps?.address
          ? `The photo was taken at ${metadata.gps.address}.`
          : ''

      // 时间信息
      const timeInfo = metadata.uploadTime
        ? `The photo was taken on ${new Date(metadata.uploadTime).toLocaleDateString()}.`
        : ''

      // 图片属性信息
      const imageProps = []
      if (metadata.orientation) {
        imageProps.push(`in ${metadata.orientation} orientation`)
      }
      const imageInfo = imageProps.length > 0 ? imageProps.join(' ') + '.' : ''

      // 设备和环境信息
      const deviceInfo = metadata.context?.uploadDevice
        ? `The photo was uploaded from ${metadata.context.uploadDevice}.`
        : ''
      const screenInfo = metadata.context?.screenSize
        ? `The user's screen size is ${metadata.context.screenSize}.`
        : ''

      // 组合所有元数据信息
      const metadataInfo = [locationInfo, timeInfo, imageInfo, deviceInfo, screenInfo]
        .filter(info => info.trim())
        .join(' ')

      if (metadataInfo) {
        userPrompt += language === 'zh' 
          ? `\n\n照片信息: ${metadataInfo}` 
          : `\n\nPhoto information: ${metadataInfo}`
      }
    }

    console.log('Sending request to MiniMax API')
    console.log('System Prompt:', systemPrompt)
    console.log('User Prompt:', userPrompt)

    const response = await fetch('https://api.minimax.chat/v1/text/chatcompletion_v2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.MINIMAX_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'abab6.5s-chat',
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: userPrompt,
          },
        ],
        stream: false,
        max_tokens: 1024,
        temperature: 0.7,
        top_p: 0.95,
        presence_penalty: 0.1,
        group_id: process.env.MINIMAX_GROUP_ID,
      }),
    })

    if (!response.ok) {
      throw new Error(`MiniMax API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    const content = data?.choices?.[0]?.message?.content || ''

    if (!content.trim()) {
      throw new Error('Generated content is empty')
    }

    return content.trim()
  } catch (error) {
    console.error('[MINIMAX_API_ERROR]', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    })
    throw new Error(error instanceof Error ? error.message : 'Failed to generate letter')
  }
}
