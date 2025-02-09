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
  width?: number
  height?: number
  orientation?: string
  gps?: GpsData
  context?: {
    uploadDevice?: string
    screenSize?: string
    colorDepth?: number
    location?: string
  }
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
    // 构建系统提示词,包含图片元数据
    let systemPrompt =
      language === 'zh'
        ? '你是一个浪漫的情书写手,擅长写感人的情书。请根据用户的描述和照片信息,写一封情真意切的情书。'
        : "You are a romantic letter writer, skilled at writing touching love letters. Please write a heartfelt love letter based on the user's description and photo information."

    // 如果有图片元数据,添加到系统提示词中
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
      if (metadata.width && metadata.height) {
        imageProps.push(`The image is ${metadata.width}x${metadata.height} pixels`)
      }
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
        systemPrompt +=
          language === 'zh' ? `\n照片信息: ${metadataInfo}` : `\nPhoto information: ${metadataInfo}`
      }
    }

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
            content: prompt,
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
