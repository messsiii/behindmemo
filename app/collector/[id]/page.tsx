'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Share2, Edit2, Check, X, Image as ImageIcon, Upload } from 'lucide-react'
import { toast } from 'react-hot-toast'
import AudioRecorder from '@/app/components/collector/AudioRecorder'
import MessageList from '@/app/components/collector/MessageList'
import { SimpleImageUpload } from '@/components/SimpleImageUpload'
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
  params: Promise<{ id: string }>
}

export default function CollectorDetailPage({ params }: PageProps) {
  const { id } = use(params)
  const router = useRouter()
  const { data: session } = useSession()
  const [collection, setCollection] = useState<Collection | null>(null)
  const [loading, setLoading] = useState(true)
  const [editingTitle, setEditingTitle] = useState(false)
  const [title, setTitle] = useState('')
  const [showImageUpload, setShowImageUpload] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [uploadingMainImage, setUploadingMainImage] = useState(false)

  useEffect(() => {
    fetchCollection()
    // 轮询新消息
    const interval = setInterval(fetchCollection, 5000)
    return () => clearInterval(interval)
  }, [id])

  const fetchCollection = async () => {
    try {
      const response = await fetch(`/api/collector/collections/${id}`)
      if (!response.ok) throw new Error('获取失败')
      const data = await response.json()
      setCollection(data)
      setTitle(data.title)
      setLoading(false)
    } catch (error) {
      console.error('获取收集详情失败:', error)
      toast.error('获取失败')
      setLoading(false)
    }
  }

  const handleSaveTitle = async () => {
    if (!title.trim() || title === collection?.title) {
      setEditingTitle(false)
      return
    }

    try {
      const response = await fetch(`/api/collector/collections/${id}/title`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim() }),
      })

      if (!response.ok) throw new Error('更新失败')

      const updated = await response.json()
      setCollection(prev => (prev ? { ...prev, title: updated.title } : null))
      setEditingTitle(false)
      toast.success('标题已更新')
    } catch (error) {
      console.error('更新标题失败:', error)
      toast.error('更新失败')
    }
  }

  const handleMainImageUpload = async (file: File) => {
    setUploadingMainImage(true)
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

      // 更新主图
      const response = await fetch(`/api/collector/collections/${id}/main-image`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mainImage: imageUrl }),
      })

      if (!response.ok) throw new Error('更新失败')

      setCollection(prev => (prev ? { ...prev, mainImage: imageUrl } : null))
      toast.success('主图已更新')
    } catch (error) {
      console.error('上传主图失败:', error)
      toast.error('上传失败')
    } finally {
      setUploadingMainImage(false)
    }
  }

  const handleSendAudio = async (audioBlob: Blob, duration: number) => {
    console.log(
      '[handleSendAudio] 开始上传音频，大小:',
      audioBlob.size,
      'bytes，时长:',
      duration,
      '秒'
    )
    try {
      // 根据blob类型或浏览器类型决定文件扩展名
      const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
      const fileName =
        isSafari || audioBlob.type.includes('mp4') ? 'recording.mp4' : 'recording.webm'

      // 上传音频文件
      const formData = new FormData()
      formData.append('file', audioBlob, fileName)
      formData.append('type', 'audio')

      const uploadResponse = await fetch('/api/collector/upload', {
        method: 'POST',
        body: formData,
      })

      if (!uploadResponse.ok) throw new Error('音频上传失败')

      const { url: audioUrl } = await uploadResponse.json()
      console.log('[handleSendAudio] 音频上传成功，URL:', audioUrl)

      // 发送消息
      const response = await fetch(`/api/collector/collections/${id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'AUDIO',
          audioUrl,
          duration,
        }),
      })

      if (!response.ok) throw new Error('发送失败')

      toast.success('语音已发送')
      fetchCollection()
    } catch (error) {
      console.error('发送音频失败:', error)
      throw error
    }
  }

  const handleImageSelect = async (file: File) => {
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
      const response = await fetch(`/api/collector/collections/${id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'IMAGE',
          imageUrl,
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

  const handleShare = async () => {
    if (!collection) {
      toast.error('收集信息未加载')
      return
    }

    const shareUrl = `${window.location.origin}/collector/share/${collection.shareUrl}`

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
        console.log('[分享] 链接已复制:', shareUrl)
      }
    } catch (error) {
      // 如果剪贴板 API 失败，使用备用方法
      const textArea = document.createElement('textarea')
      textArea.value = shareUrl
      textArea.style.position = 'fixed'
      textArea.style.opacity = '0'
      document.body.appendChild(textArea)
      textArea.select()

      try {
        document.execCommand('copy')
        toast.success('分享链接已复制')
        console.log('[分享] 链接已复制（备用方法）:', shareUrl)
      } catch (e) {
        console.error('[分享] 复制失败:', e)
        // 显示链接让用户手动复制
        toast.error('复制失败，请手动复制链接')
        prompt('请手动复制分享链接：', shareUrl)
      } finally {
        document.body.removeChild(textArea)
      }
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

  const isCreator = session?.user?.id === collection.creatorId

  return (
    <div className="flex h-screen flex-col bg-gradient-to-br from-pink-50 to-purple-50">
      {/* 顶部标题栏 */}
      <div className="border-b bg-white px-4 py-3">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.push('/collector')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>

            {editingTitle && isCreator ? (
              <div className="flex items-center gap-2">
                <Input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="h-8"
                  autoFocus
                />
                <Button size="icon" variant="ghost" onClick={handleSaveTitle}>
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    setTitle(collection.title)
                    setEditingTitle(false)
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold">{collection.title}</h1>
                {isCreator && (
                  <Button size="icon" variant="ghost" onClick={() => setEditingTitle(true)}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
          </div>

          <Button variant="outline" size="sm" onClick={handleShare}>
            <Share2 className="mr-2 h-4 w-4" />
            分享
          </Button>
        </div>
      </div>

      {/* 主图区域 - 固定在顶部 */}
      {(collection.mainImage || isCreator) && (
        <div className="bg-gradient-to-b from-white to-gray-50">
          <div className="mx-auto max-w-4xl px-4 py-3 sm:py-4">
            {collection.mainImage ? (
              <div className="relative group">
                <img
                  src={collection.mainImage}
                  alt="主图"
                  className="w-full h-auto max-h-48 sm:max-h-64 object-contain rounded-xl shadow-sm"
                />
                {isCreator && (
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={e => {
                          const file = e.target.files?.[0]
                          if (file) {
                            handleMainImageUpload(file)
                          }
                        }}
                        disabled={uploadingMainImage}
                      />
                      <div className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-full">
                        <Upload className="h-5 w-5" />
                        {uploadingMainImage ? '上传中...' : '更换主图'}
                      </div>
                    </label>
                  </div>
                )}
              </div>
            ) : isCreator ? (
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 sm:p-8 bg-white/50">
                <SimpleImageUpload onImageSelected={handleMainImageUpload} className="w-full" />
                <p className="text-center text-xs sm:text-sm text-gray-500 mt-2">
                  上传主图（建议横向图片，自动压缩至1080p）
                </p>
              </div>
            ) : null}
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
              <h3 className="mb-2 text-lg font-medium text-gray-900">开始收集回忆</h3>
              <p className="text-sm text-gray-500">上传照片或录制语音，记录美好时刻</p>
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
                <X className="h-4 w-4" />
              </Button>
            </div>
            <SimpleImageUpload onImageSelected={handleImageSelect} className="w-full" />
            {uploadingImage && (
              <div className="mt-4 text-center text-sm text-gray-500">正在压缩并上传图片...</div>
            )}
          </div>
        </div>
      )}

      {/* 底部输入区 */}
      <div className="border-t bg-white p-3 sm:p-4">
        <div className="mx-auto flex max-w-4xl items-center justify-center gap-2 sm:gap-4">
          <Button
            variant="outline"
            size="lg"
            onClick={() => setShowImageUpload(true)}
            disabled={uploadingImage}
            className="rounded-full text-sm sm:text-base"
          >
            <ImageIcon className="mr-1 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5" />
            <span className="hidden sm:inline">上传图片</span>
            <span className="sm:hidden">图片</span>
          </Button>
          <AudioRecorder onSend={handleSendAudio} />
        </div>
      </div>
    </div>
  )
}
