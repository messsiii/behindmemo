'use server'

interface FormData {
  name: string
  loverName: string
  story: string
  photo: File | string
}

export async function generateLoveLetter(data: FormData): Promise<{
  success: boolean
  id?: string
  error?: string
}> {
  console.log('generateLoveLetter action started')
  console.log('generateLoveLetter called with formData:', {
    name: data.name,
    loverName: data.loverName,
    story: data.story.substring(0, 50) + '...',
    photoUrl: data.photo,
  })
  try {
    const { name, loverName, story, photo } = data

    if (!name || !loverName || !story || !photo) {
      console.error('缺少必填字段:', { name, loverName, story, hasPhoto: !!photo })
      throw new Error('缺少必填字段')
    }

    // 获取当前请求的主机名
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
    const host = process.env.VERCEL_URL || 'localhost:3000'
    const baseUrl = `${protocol}://${host}`

    console.log(`Base URL constructed: ${baseUrl}`)
    console.log('准备调用 AI 服务，使用的 baseUrl:', baseUrl)

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 seconds timeout
      try {
        console.log(`Attempting to fetch from: ${baseUrl}/api/generate-letter`)
        // 调用 AI 服务生成信件
        const response = await fetch(`${baseUrl}/api/generate-letter`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name,
            loverName,
            story,
            image: photo, // This is now the Blob URL
          }),
          signal: controller.signal,
        })
        clearTimeout(timeoutId)

        if (!response.ok) {
          const errorText = await response.text()
          console.error('API 响应错误:', {
            status: response.status,
            statusText: response.statusText,
            errorText,
          })
          throw new Error(`API 响应错误: ${response.status} ${response.statusText}`)
        }

        const responseData = await response.json()

        if (!responseData.success) {
          console.error('AI 服务响应错误:', responseData.error)
          throw new Error(responseData.error || 'AI 服务生成爱情信失败')
        }

        const letter = responseData.letter

        // Generate a unique ID
        const id = Date.now().toString()

        console.log('爱情信生成成功，ID:', id)

        // Store minimal data in localStorage
        const resultData = {
          success: true,
          id,
          letter,
          name,
          loverName,
          image: photo,
        }

        return resultData
      } catch (error) {
        console.error('Fetch operation failed:', error)
        throw new Error(error instanceof Error ? error.message : '调用 AI 服务失败')
      }
    } catch (error) {
      console.error('调用 AI 服务时出错:', error)
      throw new Error(error instanceof Error ? error.message : '调用 AI 服务失败')
    }
  } catch (error) {
    console.error('生成爱情信时出错:', {
      error,
      message: error instanceof Error ? error.message : '未知错误',
      stack: error instanceof Error ? error.stack : undefined,
    })
    return {
      success: false,
      error: error instanceof Error ? error.message : '生成爱情信时发生未知错误',
    }
  }
}
