import { NextResponse } from "next/server"

export const runtime = "nodejs"

export async function POST(request: Request) {
  try {
    const { name, loverName, story, blobUrl, metadata } = await request.json()

    if (!name || !loverName || !story || !blobUrl || !metadata) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
    }

    if (!process.env.MINIMAX_API_KEY) {
      return NextResponse.json({ success: false, error: "MINIMAX_API_KEY is not set" }, { status: 500 })
    }

    const apiUrl = "https://api.minimax.chat/v1/text/chatcompletion_v2"
    const apiHeaders = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.MINIMAX_API_KEY}`,
    }

    // 添加超时控制
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 25000) // 25 second timeout

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
            .filter(([_, value]) => value)
            .map(([key, value]) => `${key}: ${value}`)
            .join(', ')}` : null
      ].filter(Boolean).join(', ')
    }`

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: apiHeaders,
        body: JSON.stringify({
          model: "abab5.5-chat",
          max_tokens: 1024,
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
                  image_url: {
                    url: blobUrl
                  }
                }
              ]
            }
          ],
        }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorText = await response.text()
        return NextResponse.json(
          { success: false, error: `MiniMax API error: ${response.status} ${response.statusText} - ${errorText}` },
          { status: response.status }
        )
      }

      const result = await response.json()

      if (!result.choices?.[0]?.message?.content) {
        return NextResponse.json(
          { success: false, error: "Unexpected response format from MiniMax API" },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        letter: result.choices[0].message.content,
        blobUrl,
        metadata: metadataObj
      })

    } catch (error: unknown) {
      if (error instanceof Error && error.name === "AbortError") {
        return NextResponse.json(
          { success: false, error: "Request timed out after 25 seconds" }, 
          { status: 504 }
        )
      }
      throw error
    }

  } catch (error) {
    console.error("Error in generate-letter API:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}

