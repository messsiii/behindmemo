'use client'

import { useEffect, useRef } from 'react'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { Play, Pause } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'react-hot-toast'

interface Message {
  id: string
  type: 'AUDIO' | 'IMAGE' | 'TEXT'
  content?: string | null
  imageUrl?: string | null
  audioUrl?: string | null
  duration?: number | null
  userAvatar?: string | null
  userName?: string | null
  createdAt: string
  user?: {
    id: string
    name: string | null
    image: string | null
  } | null
  tempUser?: {
    id: string
    randomName: string
    randomAvatar: string
  } | null
}

interface MessageListProps {
  messages: Message[]
  currentUserId?: string
}

export default function MessageList({ messages, currentUserId }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({})
  const [playingAudio, setPlayingAudio] = useState<string | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const previousMessageCountRef = useRef(messages.length)

  useEffect(() => {
    // 首次加载时滚动到底部
    if (!isInitialized && messages.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: 'auto' })
      setIsInitialized(true)
      previousMessageCountRef.current = messages.length
    }
    // 有新消息时才滚动到底部
    else if (messages.length > previousMessageCountRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
      previousMessageCountRef.current = messages.length
    }
  }, [messages, isInitialized])

  const handlePlayAudio = async (messageId: string, audioUrl: string) => {
    try {
      // 如果正在播放其他音频，先停止
      if (playingAudio && playingAudio !== messageId) {
        const prevAudio = audioRefs.current[playingAudio]
        if (prevAudio) {
          prevAudio.pause()
          prevAudio.currentTime = 0
        }
      }

      // 获取或创建音频元素
      if (!audioRefs.current[messageId]) {
        console.log('[MessageList] 创建音频元素，URL:', audioUrl)
        const audio = new Audio(audioUrl)

        audio.addEventListener('loadstart', () => {
          console.log('[MessageList] 开始加载音频:', audioUrl)
        })

        audio.addEventListener('loadeddata', () => {
          console.log('[MessageList] 音频数据加载完成:', audioUrl)
        })

        audio.addEventListener('canplay', () => {
          console.log('[MessageList] 音频可以播放:', audioUrl)
        })

        audio.addEventListener('ended', () => {
          console.log('[MessageList] 音频播放结束')
          setPlayingAudio(null)
        })

        audio.addEventListener('error', e => {
          const audioElement = e.target as HTMLAudioElement
          const errorMsg = audioElement.error
            ? `${audioElement.error.code}: ${audioElement.error.message}`
            : '未知错误'
          console.error('[MessageList] 音频加载错误:', errorMsg, 'URL:', audioUrl)
          setPlayingAudio(null)
          toast(`音频加载失败: ${errorMsg}`)
        })

        audioRefs.current[messageId] = audio
      }

      const audio = audioRefs.current[messageId]

      if (playingAudio === messageId) {
        // 暂停
        audio.pause()
        setPlayingAudio(null)
      } else {
        // 播放，处理可能的播放错误
        try {
          await audio.play()
          setPlayingAudio(messageId)
        } catch (error) {
          console.error('播放失败:', error)
          setPlayingAudio(null)
        }
      }
    } catch (error) {
      console.error('音频处理错误:', error)
    }
  }

  const formatDuration = (seconds?: number | null) => {
    if (!seconds) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getUserInfo = (message: Message) => {
    if (message.user) {
      return {
        name: message.user.name || '用户',
        avatar: message.user.image || '/default-avatar.png',
        isCurrentUser: message.user.id === currentUserId,
      }
    } else if (message.tempUser) {
      return {
        name: message.tempUser.randomName,
        avatar: message.tempUser.randomAvatar,
        isCurrentUser: false,
      }
    } else {
      return {
        name: message.userName || '匿名',
        avatar: message.userAvatar || '/default-avatar.png',
        isCurrentUser: false,
      }
    }
  }

  return (
    <div className="flex flex-col gap-4 pb-4">
      {messages.map(message => {
        const userInfo = getUserInfo(message)

        return (
          <div
            key={message.id}
            className={`flex gap-3 ${userInfo.isCurrentUser ? 'flex-row-reverse' : ''}`}
          >
            {/* 头像 */}
            <div className="flex-shrink-0">
              {userInfo.avatar?.startsWith('http') ? (
                <div className="relative">
                  <img
                    src={userInfo.avatar}
                    alt={userInfo.name}
                    className="h-9 w-9 sm:h-11 sm:w-11 rounded-full object-cover ring-2 ring-white shadow-md"
                    onError={e => {
                      const target = e.target as HTMLImageElement
                      target.src = `https://api.dicebear.com/9.x/avataaars/svg?seed=${userInfo.name}&backgroundColor=b6e3f4,c0aede,d1d4f9`
                    }}
                  />
                  {userInfo.isCurrentUser && (
                    <div className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full bg-green-400 border-2 border-white" />
                  )}
                </div>
              ) : (
                <div className="relative">
                  <div className="h-9 w-9 sm:h-11 sm:w-11 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-red-500 flex items-center justify-center text-white font-bold shadow-md ring-2 ring-white">
                    <span className="text-xs sm:text-sm">
                      {userInfo.name?.charAt(0)?.toUpperCase() || '?'}
                    </span>
                  </div>
                  {userInfo.isCurrentUser && (
                    <div className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full bg-green-400 border-2 border-white" />
                  )}
                </div>
              )}
            </div>

            {/* 消息内容 */}
            <div className={`flex-1 max-w-[75%] ${userInfo.isCurrentUser ? 'text-right' : ''}`}>
              <div
                className={`mb-1 flex items-center gap-2 text-xs sm:text-sm text-gray-500 ${userInfo.isCurrentUser ? 'flex-row-reverse' : ''}`}
              >
                <span>{userInfo.name}</span>
                <span>·</span>
                <span>
                  {format(new Date(message.createdAt), 'HH:mm', {
                    locale: zhCN,
                  })}
                </span>
              </div>

              <div className={`inline-block ${userInfo.isCurrentUser ? 'text-left' : ''}`}>
                {/* 图片消息 */}
                {message.type === 'IMAGE' && message.imageUrl && (
                  <div className="overflow-hidden rounded-lg">
                    <img
                      src={message.imageUrl}
                      alt="分享的图片"
                      className="max-h-60 sm:max-h-80 max-w-[200px] sm:max-w-md object-cover"
                    />
                  </div>
                )}

                {/* 音频消息 */}
                {message.type === 'AUDIO' && message.audioUrl && (
                  <div
                    className={`flex items-center gap-3 rounded-lg px-4 py-3 ${
                      userInfo.isCurrentUser ? 'bg-primary text-white' : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <button
                      onClick={() => handlePlayAudio(message.id, message.audioUrl!)}
                      className={`flex h-10 w-10 items-center justify-center rounded-full ${
                        userInfo.isCurrentUser
                          ? 'bg-white/20 hover:bg-white/30'
                          : 'bg-white hover:bg-gray-50'
                      }`}
                    >
                      {playingAudio === message.id ? (
                        <Pause
                          className={`h-5 w-5 ${userInfo.isCurrentUser ? 'text-white' : 'text-gray-700'}`}
                        />
                      ) : (
                        <Play
                          className={`h-5 w-5 ${userInfo.isCurrentUser ? 'text-white' : 'text-gray-700'}`}
                        />
                      )}
                    </button>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">语音消息</span>
                      <span
                        className={`text-xs ${userInfo.isCurrentUser ? 'text-white/80' : 'text-gray-500'}`}
                      >
                        {formatDuration(message.duration)}
                      </span>
                    </div>
                  </div>
                )}

                {/* 文本消息 */}
                {message.type === 'TEXT' && message.content && (
                  <div
                    className={`rounded-lg px-4 py-2 ${
                      userInfo.isCurrentUser ? 'bg-primary text-white' : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    {message.content}
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })}
      <div ref={bottomRef} />
    </div>
  )
}
