'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Mic, Square, Loader2 } from 'lucide-react'
import { toast } from 'react-hot-toast'

interface AudioRecorderProps {
  onSend: (audioBlob: Blob, duration: number) => Promise<void>
  disabled?: boolean
}

export default function AudioRecorder({ onSend, disabled }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [duration, setDuration] = useState(0)
  const [sending, setSending] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const durationRef = useRef<number>(0)

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [])

  const startRecording = async () => {
    try {
      const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)

      // 请求音频权限 - Safari需要特殊配置
      const audioConstraints = isSafari
        ? {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
            sampleRate: 44100,
          }
        : {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
          }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints,
      })

      // 检查音轨是否正常
      const audioTracks = stream.getAudioTracks()
      console.log('[AudioRecorder] 音频轨道:', audioTracks.length, '个')
      if (audioTracks.length > 0) {
        const settings = audioTracks[0].getSettings()
        console.log('[AudioRecorder] 音频轨道设置:', settings)

        // 确保音轨已启用
        audioTracks[0].enabled = true
      }

      // 创建 MediaRecorder - Safari 必须不指定 mimeType
      let mediaRecorder: MediaRecorder

      if (isSafari) {
        // Safari: 绝对不能指定 mimeType，否则会产生0字节文件
        console.log('[AudioRecorder] Safari: 创建 MediaRecorder (不指定MIME类型)')
        mediaRecorder = new MediaRecorder(stream)
        console.log(
          '[AudioRecorder] Safari MediaRecorder 类型:',
          mediaRecorder.mimeType || '未指定'
        )
      } else {
        // 其他浏览器：使用 webm
        let mimeType = ''
        const types = [
          'audio/webm;codecs=opus',
          'audio/webm',
          'video/webm;codecs=vp8,opus',
          'video/webm',
        ]

        for (const type of types) {
          if (MediaRecorder.isTypeSupported(type)) {
            mimeType = type
            break
          }
        }

        if (mimeType) {
          mediaRecorder = new MediaRecorder(stream, { mimeType })
          console.log('[AudioRecorder] 使用MIME类型:', mimeType)
        } else {
          mediaRecorder = new MediaRecorder(stream)
          console.log('[AudioRecorder] 使用默认类型')
        }
      }

      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = event => {
        console.log('[AudioRecorder] ondataavailable - 数据块大小:', event.data.size, 'bytes')
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onerror = event => {
        console.error('[AudioRecorder] 录音错误:', event)
        toast.error('录音出错')
      }

      mediaRecorder.onstart = () => {
        console.log('[AudioRecorder] 录音已开始，状态:', mediaRecorder.state)
      }

      mediaRecorder.onstop = async () => {
        console.log('[AudioRecorder] 录音停止，收集到', audioChunksRef.current.length, '个数据块')

        // 创建Blob - 使用MediaRecorder的实际类型
        const actualMimeType = mediaRecorder.mimeType
        console.log('[AudioRecorder] 使用MIME类型创建Blob:', actualMimeType)

        // 计算总大小
        const totalSize = audioChunksRef.current.reduce((sum, chunk) => sum + chunk.size, 0)
        console.log('[AudioRecorder] 总数据大小:', totalSize, 'bytes')

        const audioBlob = new Blob(audioChunksRef.current, {
          type: actualMimeType || (isSafari ? 'audio/mp4' : 'audio/webm'),
        })
        console.log('[AudioRecorder] 最终Blob大小:', audioBlob.size, 'bytes, 类型:', audioBlob.type)

        // 停止所有音轨
        stream.getTracks().forEach(track => track.stop())

        // 发送音频，使用 ref 中的时长
        if (audioBlob.size > 0) {
          setSending(true)
          try {
            await onSend(audioBlob, durationRef.current)
            setDuration(0)
            durationRef.current = 0
          } catch (error) {
            console.error('发送音频失败:', error)
            toast.error('发送失败')
          } finally {
            setSending(false)
          }
        }
      }

      // 开始录制 - Safari 不支持 timeslice
      if (isSafari) {
        console.log('[AudioRecorder] Safari: 开始录音 (无时间片)')
        mediaRecorder.start()
      } else {
        console.log('[AudioRecorder] 开始录音，每100ms收集数据')
        mediaRecorder.start(100) // 更频繁地收集数据
      }
      setIsRecording(true)
      setDuration(0)
      durationRef.current = 0

      // 开始计时
      timerRef.current = setInterval(() => {
        setDuration(prev => {
          const newDuration = prev + 1
          durationRef.current = newDuration
          return newDuration
        })
      }, 1000)
    } catch (error) {
      console.error('无法访问麦克风:', error)
      toast.error('请允许访问麦克风')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      console.log('[AudioRecorder] 停止录音，MediaRecorder状态:', mediaRecorderRef.current.state)

      // 直接停止录音（与测试页面相同）
      mediaRecorderRef.current.stop()
      setIsRecording(false)

      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      {!isRecording ? (
        <Button
          onClick={startRecording}
          disabled={disabled || sending}
          size="lg"
          className="rounded-full text-sm sm:text-base"
        >
          {sending ? (
            <>
              <Loader2 className="mr-1 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
              <span className="hidden sm:inline">发送中...</span>
              <span className="sm:hidden">发送</span>
            </>
          ) : (
            <>
              <Mic className="mr-1 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5" />
              <span className="hidden sm:inline">点击录音</span>
              <span className="sm:hidden">录音</span>
            </>
          )}
        </Button>
      ) : (
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1 sm:gap-2 rounded-full bg-red-100 px-3 sm:px-4 py-1.5 sm:py-2">
            <div className="h-2 w-2 sm:h-3 sm:w-3 animate-pulse rounded-full bg-red-500" />
            <span className="text-xs sm:text-sm font-medium text-red-700">
              {formatDuration(duration)}
            </span>
          </div>
          <Button
            onClick={stopRecording}
            size="lg"
            variant="destructive"
            className="rounded-full text-sm sm:text-base px-3 sm:px-4"
          >
            <Square className="mr-1 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5" />
            <span className="hidden sm:inline">停止并发送</span>
            <span className="sm:hidden">停止</span>
          </Button>
        </div>
      )}
    </div>
  )
}
