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
    // 系统提示词统一使用中文
    const systemPrompt = '你是一个情书写手，根据用户提供的照片和信息，用王小波的文风（不要提到王小波）写一封情书。- 请使用用户提供的实际名字，不要使用 [Name] 或 [Your Name] 等占位符。- 通篇用同一种语言完成情书，避免出现中英文混杂，比如通篇都是英文，地址就也翻译成英文写作，另外忽略地址前缀的代码信息。'

    // 用户提示词统一使用英文格式
    let userPrompt = `I want to write a love letter. Here's our information:

Name of sender: "${metadata?.name || 'Anonymous'}"
Name of recipient: "${metadata?.loverName || 'My Love'}"

Our story:
${prompt}`

    // 添加照片信息，确保原始拍摄时间和地点被包含
    if (metadata) {
      const photoInfo = []

      // 添加拍摄时间（如果有）
      if (metadata.uploadTime) {
        const date = new Date(metadata.uploadTime)
        if (!isNaN(date.getTime())) {
          photoInfo.push(`Time: ${date.toISOString()}`)
        }
      }

      // 添加地理位置信息（保留原始地址）
      if (metadata.location) {
        photoInfo.push(`Location: ${metadata.location}`)
      } else if (metadata.gps?.coordinates) {
        if (metadata.gps.address) {
          photoInfo.push(`Location: ${metadata.gps.address}`)
        } else {
          const { latitude, longitude } = metadata.gps.coordinates
          photoInfo.push(`Coordinates: ${latitude}, ${longitude}`)
        }
      }

      // 如果有照片信息，添加到提示词中
      if (photoInfo.length > 0) {
        userPrompt += '\n\nPhoto Information:\n' + photoInfo.join('\n')
      }
    }

    // 添加输出语言要求
    userPrompt += `\n\nIf no specific language requirement is mentioned above, please write in ${language === 'zh' ? 'Chinese' : 'English'}.`

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
