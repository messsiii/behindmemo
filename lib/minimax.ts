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
  imageUrl?: string
  isVIP?: boolean
  creditsUsed?: number
  language?: string
  templateStyle?: string
}

// 定义多模态消息类型
type TextContent = { type: 'text', text: string };
type ImageUrlContent = { type: 'image_url', image_url: { url: string } };
type MultiModalContent = (TextContent | ImageUrlContent)[];

type Message = {
  role: 'system' | 'user' | 'assistant';
  name?: string;
  content: string | MultiModalContent;
};

type GenerateLetterOptions = {
  prompt: string;
  language?: string;
  metadata?: ImageMetadata;
};

export async function generateLetter({ prompt, language = 'en', metadata = {} }: GenerateLetterOptions): Promise<string> {
  // 只需要API密钥
  const apiKey = process.env.NEXT_PUBLIC_MINIMAX_API_KEY || process.env.MINIMAX_API_KEY;
  
  if (!apiKey) {
    throw new Error("MiniMax API 密钥未配置");
  }

  // 系统提示词统一使用中文
  const systemPrompt = '你是一个**书信作家**，根据用户提供的照片和信息，用王小波的文风（不要提到王小波）写一封书信。- 请使用用户提供的实际名字，不要使用 [Name] 或 [Your Name] 等占位符。- 通篇用同一种语言完成情书，避免出现中英文混杂，比如通篇都是英文，地址就也翻译成英文写作，另外忽略地址前缀的代码信息。'

  // 用户提示词统一使用英文格式
  let userPrompt = `I want to write a love letter. Here's our information:

Name of sender: "${metadata?.name || 'Anonymous'}"
Name of recipient: "${metadata?.loverName || 'My Love'}"

Our story:
${prompt}`

  // 添加照片信息，确保原始拍摄地点被包含
  if (metadata) {
    const photoInfo = []

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
  
  // 构建消息内容 - 根据是否有图片URL使用不同的格式
  const messages: Message[] = [
    {
      "role": "system",
      "content": systemPrompt
    }
  ];
  
  // 检查是否有图片URL
  if (metadata?.imageUrl) {
    console.log('Including image URL in request:', metadata.imageUrl)
    // 使用多模态格式
    messages.push({
      "role": "user",
      "name": "用户", 
      "content": [
        {
          "type": "text",
          "text": userPrompt
        },
        {
          "type": "image_url",
          "image_url": {
            "url": metadata.imageUrl
          }
        }
      ]
    });
  } else {
    console.log('No image URL provided, using text-only format')
    // 没有图片，只使用文本
    messages.push({
      "role": "user",
      "content": userPrompt
    });
  }

  try {
    // 使用官方示例的API端点
    const url = 'https://api.minimax.chat/v1/chat/completions';
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "abab6.5s-chat",
        messages: messages,
        max_tokens: 4096,
        temperature: 0.7,
        top_p: 0.95
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API响应错误:', errorText);
      throw new Error(`API请求失败，状态码: ${response.status}`);
    }

    const data = await response.json();
    console.log('API响应:', JSON.stringify(data, null, 2));
    
    // 提取回复内容 - 使用官方示例的响应格式
    const content = data?.choices?.[0]?.message?.content || '';
    
    if (!content || !content.trim()) {
      throw new Error('生成的内容为空');
    }
    
    return content.trim();
  } catch (error) {
    console.error('生成信件失败:', error);
    throw new Error(`生成信件失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}
