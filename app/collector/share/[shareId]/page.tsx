'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Image as ImageIcon, Share2, Home } from 'lucide-react'
import { toast } from 'react-hot-toast'
import AudioRecorder from '@/app/components/collector/AudioRecorder'
import MessageList from '@/app/components/collector/MessageList'
import ImageUpload from '@/app/components/collector/ImageUpload'
import { compressImage, blobToFile } from '@/lib/imageCompress'

interface Collection {
  id: string
  title: string
  shareUrl: string
  isPublic: boolean
  creatorId: string
  mainImage?: string | null
  creator: {
    id: string
    name: string | null
    image: string | null
  }
  messages: any[]
}

type PageProps = {
  params: Promise<{ shareId: string }>
}

export default function CollectorSharePage({ params }: PageProps) {
  const { shareId } = use(params)
  const router = useRouter()
  const { data: session } = useSession()
  const [collection, setCollection] = useState<Collection | null>(null)
  const [loading, setLoading] = useState(true)
  const [showImageUpload, setShowImageUpload] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [tempUserId, setTempUserId] = useState<string | null>(null)

  useEffect(() => {
    fetchCollection()
    initTempUser()
    // 轮询新消息
    const interval = setInterval(fetchCollection, 5000)
    return () => clearInterval(interval)
  }, [shareId])

  const fetchCollection = async () => {
    try {
      const response = await fetch(`/api/collector/share/${shareId}`)
      if (!response.ok) {
        if (response.status === 404) {
          toast.error('收集不存在或链接无效')
          router.push('/')
          return
        }
        throw new Error('获取失败')
      }
      const data = await response.json()
      setCollection(data)
      setLoading(false)
    } catch (error) {
      console.error('获取收集详情失败:', error)
      toast.error('获取失败')
      setLoading(false)
    }
  }

  const initTempUser = async () => {
    // 如果已登录，不需要创建临时用户
    if (session?.user?.id) {
      console.log('[分享页-initTempUser] 已登录用户，跳过临时用户创建')
      return
    }

    console.log('[分享页-initTempUser] 创建临时用户...')
    try {
      // 生成更精确的浏览器指纹
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      ctx!.textBaseline = 'top'
      ctx!.font = '14px Arial'
      ctx!.fillText('fingerprint', 2, 2)
      const canvasData = canvas.toDataURL()

      // 收集更多浏览器特征
      const fingerprint = JSON.stringify({
        userAgent: navigator.userAgent,
        language: navigator.language,
        languages: navigator.languages?.join(','),
        platform: navigator.platform,
        hardwareConcurrency: navigator.hardwareConcurrency,
        screenResolution: `${screen.width}x${screen.height}`,
        screenColorDepth: screen.colorDepth,
        timezoneOffset: new Date().getTimezoneOffset(),
        sessionStorage: typeof sessionStorage !== 'undefined',
        localStorage: typeof localStorage !== 'undefined',
        cookieEnabled: navigator.cookieEnabled,
        canvas: canvasData.substring(0, 100), // 使用canvas指纹的一部分
        webgl: (() => {
          try {
            const canvas = document.createElement('canvas')
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
            if (gl && gl instanceof WebGLRenderingContext) {
              const debugInfo = gl.getExtension('WEBGL_debug_renderer_info')
              if (debugInfo) {
                return gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL)
              }
            }
          } catch (e) {}
          return 'unknown'
        })(),
      })

      // 生成稳定的哈希（不包含时间戳）
      let hash = 0
      for (let i = 0; i < fingerprint.length; i++) {
        const char = fingerprint.charCodeAt(i)
        hash = (hash << 5) - hash + char
        hash = hash & hash // Convert to 32bit integer
      }
      // 不添加时间戳，保持指纹稳定
      const hashString = Math.abs(hash).toString(36)

      console.log('[分享页-initTempUser] 浏览器指纹hash:', hashString)

      const response = await fetch('/api/collector/temp-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ browserFingerprint: hashString }),
      })

      if (response.ok) {
        const tempUser = await response.json()
        console.log('[分享页-initTempUser] 临时用户创建成功:', tempUser)
        setTempUserId(tempUser.id)
      } else {
        const errorText = await response.text()
        console.error('[分享页-initTempUser] 创建失败:', response.status, errorText)
      }
    } catch (error) {
      console.error('[分享页-initTempUser] 创建临时用户失败:', error)
    }
  }

  const handleSendAudio = async (audioBlob: Blob, duration: number) => {
    if (!collection) return

    console.log(
      '[分享页-handleSendAudio] 开始上传音频，大小:',
      audioBlob.size,
      'bytes，时长:',
      duration,
      '秒'
    )
    console.log(
      '[分享页-handleSendAudio] 临时用户ID:',
      tempUserId,
      '登录用户ID:',
      session?.user?.id
    )

    try {
      // 根据blob类型决定文件扩展名
      let fileName = 'recording.webm'
      if (audioBlob.type.includes('mp4')) {
        fileName = 'recording.mp4'
      } else if (audioBlob.type.includes('wav')) {
        fileName = 'recording.wav'
      } else if (audioBlob.type.includes('webm')) {
        fileName = 'recording.webm'
      }
      console.log('[分享页-handleSendAudio] Blob类型:', audioBlob.type, '文件名:', fileName)

      // 上传音频文件
      const formData = new FormData()
      formData.append('file', audioBlob, fileName)
      formData.append('type', 'audio')

      const uploadResponse = await fetch('/api/collector/upload', {
        method: 'POST',
        body: formData,
      })

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text()
        console.error('[分享页-handleSendAudio] 上传失败:', uploadResponse.status, errorText)
        throw new Error('音频上传失败')
      }

      const { url: audioUrl } = await uploadResponse.json()
      console.log('[分享页-handleSendAudio] 音频上传成功，URL:', audioUrl)

      // 发送消息
      const messageData = {
        type: 'AUDIO',
        audioUrl,
        duration,
        tempUserId: !session?.user?.id ? tempUserId : undefined,
      }
      console.log('[分享页-handleSendAudio] 发送消息数据:', messageData)

      const response = await fetch(`/api/collector/collections/${collection.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messageData),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('[分享页-handleSendAudio] 消息发送失败:', response.status, errorText)
        throw new Error('发送失败')
      }

      toast.success('语音已发送')
      fetchCollection()
    } catch (error) {
      console.error('[分享页-handleSendAudio] 发送音频失败:', error)
      toast.error('发送语音失败，请重试')
      // 不再抛出错误，避免 AudioRecorder 组件状态混乱
    }
  }

  const handleShare = async () => {
    if (!collection) return

    const shareUrl = window.location.href

    try {
      // 尝试使用原生分享 API（移动端）
      if (navigator.share && /mobile|android|iphone/i.test(navigator.userAgent)) {
        await navigator.share({
          title: collection.title,
          text: `来参与「${collection.title}」的记忆收集吧！`,
          url: shareUrl,
        })
        toast.success('分享成功')
      } else {
        // 桌面端复制到剪贴板
        await navigator.clipboard.writeText(shareUrl)
        toast.success('分享链接已复制到剪贴板')
      }
    } catch (error) {
      // 备用方法
      const textArea = document.createElement('textarea')
      textArea.value = shareUrl
      textArea.style.position = 'fixed'
      textArea.style.opacity = '0'
      document.body.appendChild(textArea)
      textArea.select()

      try {
        document.execCommand('copy')
        toast.success('分享链接已复制')
      } catch (e) {
        toast.error('复制失败，请手动复制链接')
        prompt('请手动复制分享链接：', shareUrl)
      } finally {
        document.body.removeChild(textArea)
      }
    }
  }

  const handleImageSelect = async (file: File) => {
    if (!collection) return

    setUploadingImage(true)
    try {
      // 压缩图片
      const compressedBlob = await compressImage(file, 1920, 0.85)
      const compressedFile = blobToFile(compressedBlob, file.name)

      // 上传图片
      const formData = new FormData()
      formData.append('file', compressedFile)
      formData.append('type', 'image')

      const uploadResponse = await fetch('/api/collector/upload', {
        method: 'POST',
        body: formData,
      })

      if (!uploadResponse.ok) throw new Error('图片上传失败')

      const { url: imageUrl } = await uploadResponse.json()

      // 发送消息
      const response = await fetch(`/api/collector/collections/${collection.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'IMAGE',
          imageUrl,
          tempUserId: !session?.user?.id ? tempUserId : undefined,
        }),
      })

      if (!response.ok) throw new Error('发送失败')

      toast.success('图片已发送')
      setShowImageUpload(false)
      fetchCollection()
    } catch (error) {
      console.error('发送图片失败:', error)
      toast.error('发送失败')
    } finally {
      setUploadingImage(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-primary mx-auto" />
          <p className="mt-4 text-gray-500">加载中...</p>
        </div>
      </div>
    )
  }

  if (!collection) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">收集不存在</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col bg-gradient-to-br from-pink-50 to-purple-50">
      {/* 顶部标题栏 */}
      <div className="border-b bg-white px-4 py-3">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => router.push('/')} title="回到首页">
              <Home className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold">{collection.title}</h1>
              <p className="text-xs text-gray-500">由 {collection.creator.name || '用户'} 创建</p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleShare}>
              <Share2 className="mr-2 h-4 w-4" />
              分享
            </Button>

            {session?.user?.id === collection.creatorId && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/collector/${collection.id}`)}
              >
                返回管理
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* 主图区域 - 固定在顶部 */}
      {collection.mainImage && (
        <div className="bg-gradient-to-b from-white to-gray-50">
          <div className="mx-auto max-w-4xl px-4 py-3 sm:py-4">
            <img
              src={collection.mainImage}
              alt="主图"
              className="w-full h-auto max-h-48 sm:max-h-64 object-contain rounded-xl shadow-sm"
            />
          </div>

          {/* 分界线装饰 */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="bg-gray-50 px-4 text-xs text-gray-500 font-medium">💬 消息记录</span>
            </div>
          </div>
        </div>
      )}

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl p-4">
          {collection.messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="mb-4 text-gray-400">
                <ImageIcon className="h-16 w-16" />
              </div>
              <h3 className="mb-2 text-lg font-medium text-gray-900">
                欢迎来到 {collection.creator.name || '朋友'} 的记忆收集
              </h3>
              <p className="text-sm text-gray-500">上传照片或录制语音，一起记录美好时刻</p>
            </div>
          ) : (
            <MessageList messages={collection.messages} currentUserId={session?.user?.id} />
          )}
        </div>
      </div>

      {/* 图片上传弹窗 */}
      {showImageUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">上传图片</h3>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setShowImageUpload(false)}
                disabled={uploadingImage}
              >
                ✕
              </Button>
            </div>
            <ImageUpload onImageSelect={handleImageSelect} uploading={uploadingImage} maxSize={5} />
          </div>
        </div>
      )}

      {/* 底部输入区 */}
      <div className="border-t bg-white p-4">
        <div className="mx-auto flex max-w-4xl items-center justify-center gap-4">
          <Button
            variant="outline"
            size="lg"
            onClick={() => setShowImageUpload(true)}
            disabled={uploadingImage}
            className="rounded-full"
          >
            <ImageIcon className="mr-2 h-5 w-5" />
            上传图片
          </Button>
          <AudioRecorder onSend={handleSendAudio} />
        </div>
      </div>
    </div>
  )
}
