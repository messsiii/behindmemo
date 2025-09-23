import { NextRequest, NextResponse } from 'next/server'
import { uploadFile } from '@/lib/storage'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const type = formData.get('type') as string // 'image' or 'audio'

    if (!file) {
      return NextResponse.json({ error: '没有文件' }, { status: 400 })
    }

    // 文件大小限制
    const maxSize = type === 'audio' ? 10 * 1024 * 1024 : 5 * 1024 * 1024 // 音频10MB，图片5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `文件大小不能超过 ${maxSize / 1024 / 1024}MB` },
        { status: 400 }
      )
    }

    // 验证文件类型 - 增加 Safari 支持的格式和WAV
    const allowedTypes =
      type === 'audio'
        ? [
            'audio/webm',
            'audio/mp3',
            'audio/mpeg',
            'audio/mp4',
            'audio/aac',
            'audio/wav',
            'audio/x-wav',
            'audio/wave',
            'audio/ogg',
            'video/webm',
            'video/mp4',
            'application/octet-stream',
          ]
        : ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']

    // 记录接收到的文件类型用于调试
    console.log(
      `[文件上传] 接收到的文件类型: ${file.type}, 文件名: ${file.name}, 大小: ${file.size} bytes`
    )

    // 对于音频文件，放宽验证（Safari可能发送不同的MIME类型）
    if (type === 'audio') {
      const ext = file.name.split('.').pop()?.toLowerCase()
      const isValidExtension =
        ext && ['webm', 'mp3', 'mp4', 'm4a', 'aac', 'wav', 'ogg', 'wave'].includes(ext)
      const isValidMimeType =
        !file.type || file.type === 'application/octet-stream' || allowedTypes.includes(file.type)

      if (!isValidExtension && !isValidMimeType) {
        console.log(`[文件上传] 拒绝的音频文件: type=${file.type}, ext=${ext}`)
        return NextResponse.json({ error: '不支持的音频格式' }, { status: 400 })
      }

      console.log(`[文件上传] 接受音频文件: type=${file.type}, ext=${ext}`)
    } else if (type === 'image' && !allowedTypes.includes(file.type)) {
      console.log(`[文件上传] 拒绝的图片类型: ${file.type}`)
      return NextResponse.json({ error: '不支持的图片格式' }, { status: 400 })
    }

    // 生成文件名
    const timestamp = Date.now()
    const randomStr = Math.random().toString(36).substring(7)
    const ext = file.name.split('.').pop() || (type === 'audio' ? 'webm' : 'jpg')
    const filename = `collector/${type}/${timestamp}-${randomStr}.${ext}`

    // 将文件转为 Buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // 上传文件
    console.log(`[文件上传] 正在上传到存储: ${filename}`)
    const { url, provider } = await uploadFile(buffer, filename, {
      contentType: file.type || (type === 'audio' ? 'audio/webm' : 'image/jpeg'),
    })
    console.log(`[文件上传] 上传成功，URL: ${url}, 存储提供商: ${provider}`)

    return NextResponse.json({ url, type })
  } catch (error: any) {
    console.error('文件上传失败:', error)
    console.error('错误堆栈:', error.stack)
    console.error('错误详情:', JSON.stringify(error, null, 2))

    // 返回更详细的错误信息（仅在开发环境）
    const errorMessage =
      process.env.NODE_ENV === 'development' ? `上传失败: ${error.message || error}` : '上传失败'

    return NextResponse.json(
      {
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    )
  }
}
