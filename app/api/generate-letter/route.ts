import { NextResponse } from "next/server"

export const runtime = "edge"

export async function POST(request: Request) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 280000)

  try {
    const requestId = request.headers.get('X-Request-Id')
    if (!requestId) {
      clearTimeout(timeoutId)
      return NextResponse.json({ success: false, error: "Missing request ID" }, { status: 400 })
    }

    const { name, loverName, story, blobUrl, metadata } = await request.json()

    if (!name || !loverName || !story || !blobUrl || !metadata) {
      clearTimeout(timeoutId)
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
    }

    if (!process.env.MINIMAX_API_KEY) {
      clearTimeout(timeoutId)
      return NextResponse.json({ success: false, error: "MINIMAX_API_KEY is not set" }, { status: 500 })
    }

    const apiUrl = "https://api.minimax.chat/v1/text/chatcompletion_v2"
    const apiHeaders = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.MINIMAX_API_KEY}`,
    }

    const metadataObj = typeof metadata === 'string' ? JSON.parse(metadata) : metadata

    // 提取关键元数据
    const relevantMetadata = {
      location: metadataObj.location,  // 地理位置信息
      takenAt: metadataObj.exif?.DateTimeOriginal,  // 拍摄时间
      camera: {
        make: metadataObj.exif?.Make,  // 相机制造商
        model: metadataObj.exif?.Model,  // 相机型号
        lens: metadataObj.exif?.LensModel,  // 镜头信息
        settings: {
          aperture: metadataObj.exif?.FNumber ? `f/${metadataObj.exif.FNumber}` : null,  // 光圈
          exposure: metadataObj.exif?.ExposureTime ? `${metadataObj.exif.ExposureTime}s` : null,  // 快门速度
          iso: metadataObj.exif?.ISO  // ISO 感光度
        }
      }
    }

    // 构建更简洁的提示词
    const metadataPrompt = `Photo context: ${
      [
        relevantMetadata.location ? `Location: ${relevantMetadata.location}` : null,
        relevantMetadata.takenAt ? `Taken at: ${relevantMetadata.takenAt}` : null,
        relevantMetadata.camera.make || relevantMetadata.camera.model ? 
          `Camera: ${[relevantMetadata.camera.make, relevantMetadata.camera.model].filter(Boolean).join(' ')}` : null,
        relevantMetadata.camera.lens ? `Lens: ${relevantMetadata.camera.lens}` : null,
        Object.values(relevantMetadata.camera.settings).some(Boolean) ? 
          `Settings: ${Object.entries(relevantMetadata.camera.settings)
            .filter(([_key, value]) => value)
            .map(([key, value]) => `${key}: ${value}`)
            .join(', ')}` : null
      ].filter(Boolean).join(', ')
    }`

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        ...apiHeaders,
        'X-Request-Id': requestId
      },
      body: JSON.stringify({
        model: "abab5.5-chat",
        max_tokens: 1024,
        stream: true, // 启用流式输出
        messages: [
          {
            role: "system",
            name: "English love letter master",
            content: "Write a love letter in the style of Wang Xiaobo (without mentioning Wang Xiaobo) in English",
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `**output in english**Write a love letter from ${name} to ${loverName}. Their story: ${story}. ${metadataPrompt}`,
              },
              {
                type: "image",
                image_url: { url: blobUrl }
              }
            ]
          }
        ],
      }),
      signal: controller.signal,
    })

    if (!response.ok) {
      clearTimeout(timeoutId)
      const errorText = await response.text()
      return NextResponse.json(
        { success: false, error: `MiniMax API error: ${response.status} ${response.statusText} - ${errorText}` },
        { status: response.status }
      )
    }

    // 创建一个 TransformStream 来处理流式响应
    const encoder = new TextEncoder()
    const decoder = new TextDecoder()
    
    const stream = new TransformStream({
      async transform(chunk, controller) {
        const text = decoder.decode(chunk)
        // 按行分割输出
        const lines = text.split('\n')

        for (const line of lines) {
          // 移除空格
          const trimmedLine = line.trim()
          if (!trimmedLine) {
            // 空行就跳过
            continue
          }

          // 如果行不是以 "data: " 开头，说明这一行可能不是 SSE 或者不是要解析的 JSON 数据
          if (!trimmedLine.startsWith('data: ')) {
            // 可以按需选择是否打印日志
            console.warn('跳过非 data 行：', trimmedLine)
            continue
          }

          // 移除 "data: " 前缀
          const jsonStr = trimmedLine.slice(6) // 6 是 "data: " 的长度

          // 如果碰到 [DONE]，就结束
          if (jsonStr === '[DONE]') {
            return
          }

          // 剩下的才尝试解析为 JSON
          try {
            const json = JSON.parse(jsonStr)
            // 判断生成内容，如果存在就将其写入 SSE
            if (json?.choices?.[0]?.delta?.content) {
              const content = json.choices[0].delta.content
              controller.enqueue(encoder.encode(content))
            }
          } catch (e) {
            console.error('Error parsing chunk:', e)
          }
        }
      }
    })

    clearTimeout(timeoutId)
    return new Response(response.body?.pipeThrough(stream), {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })

  } catch (error) {
    clearTimeout(timeoutId)
    console.error("Error in generate-letter API:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}

