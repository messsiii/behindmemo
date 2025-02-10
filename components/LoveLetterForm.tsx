'use client'

import { QuotaAlert } from '@/components/QuotaAlert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { useLanguage } from '@/contexts/LanguageContext'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function LoveLetterForm() {
  const { data: session } = useSession()
  const { language } = useLanguage()
  const { toast } = useToast()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [showQuotaAlert, setShowQuotaAlert] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    loverName: '',
    story: '',
  })

  const content = {
    en: {
      title: 'Write a Love Letter',
      name: 'Your Name',
      loverName: 'Their Name',
      story: 'Your Story',
      generate: 'Generate',
      placeholder: 'Share your story here...',
      unauthorized: 'Please login to generate letters',
      error: 'Failed to generate letter',
      quotaError: 'Insufficient quota',
      quotaCheck: 'Checking quota...',
    },
    zh: {
      title: '写一封情书',
      name: '你的名字',
      loverName: '对方名字',
      story: '你们的故事',
      generate: '生成',
      placeholder: '在这里分享你们的故事...',
      unauthorized: '请登录后生成',
      error: '生成失败',
      quotaError: '配额不足',
      quotaCheck: '正在检查配额...',
    },
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!session?.user) {
      toast({
        title: content[language].unauthorized,
        variant: 'destructive',
      })
      return
    }

    setIsLoading(true)

    try {
      // 1. 检查配额
      const quotaResponse = await fetch('/api/user/quota')
      if (!quotaResponse.ok) {
        throw new Error('Failed to check quota')
      }

      const quotaData = await quotaResponse.json()

      // 如果配额不足，立即终止
      if (!quotaData.isVIP && quotaData.quota <= 0) {
        setShowQuotaAlert(true)
        setIsLoading(false)
        return
      }

      // 2. 消耗配额
      const consumeResponse = await fetch('/api/user/consume-quota', {
        method: 'POST',
      })

      if (!consumeResponse.ok) {
        throw new Error('Failed to consume quota')
      }

      const consumeData = await consumeResponse.json()
      if (!consumeData.success) {
        throw new Error(consumeData.error || 'Failed to consume quota')
      }

      // 3. 生成请求 ID
      const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      // 4. 开始生成
      const response = await fetch('/api/generate-letter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Request-Id': requestId,
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        // 如果生成失败，尝试恢复配额
        try {
          await fetch('/api/user/restore-quota', {
            method: 'POST',
          })
        } catch (restoreError) {
          console.error('Failed to restore quota:', restoreError)
        }
        throw new Error('Generation failed')
      }

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || 'Generation failed')
      }

      // 5. 只有在确认生成开始后，才保存状态并跳转
      const letterData = {
        ...formData,
        timestamp: Date.now(),
        isGenerating: true,
        requestId,
      }

      // 先清除可能存在的旧数据
      localStorage.removeItem('loveLetterData')
      localStorage.removeItem('letterRequest')

      // 再保存新数据
      localStorage.setItem('loveLetterData', JSON.stringify(letterData))
      localStorage.setItem(
        'letterRequest',
        JSON.stringify({
          id: requestId,
          timestamp: Date.now(),
        })
      )

      // 最后才跳转
      router.push(`/result/${result.id}`)
    } catch (error) {
      // 发生错误时清除所有相关状态
      localStorage.removeItem('loveLetterData')
      localStorage.removeItem('letterRequest')

      setIsLoading(false)
      console.error('Error:', error)
      toast({
        title: content[language].error,
        description: error instanceof Error ? error.message : String(error),
        variant: 'destructive',
      })
    }
  }

  // 组件卸载时清理状态
  useEffect(() => {
    return () => {
      if (!isLoading) {
        localStorage.removeItem('loveLetterData')
        localStorage.removeItem('letterRequest')
      }
    }
  }, [isLoading])

  return (
    <div className="w-full max-w-md space-y-8">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold">{content[language].title}</h1>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">{content[language].name}</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="loverName">{content[language].loverName}</Label>
          <Input
            id="loverName"
            value={formData.loverName}
            onChange={e => setFormData(prev => ({ ...prev, loverName: e.target.value }))}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="story">{content[language].story}</Label>
          <Textarea
            id="story"
            value={formData.story}
            onChange={e => setFormData(prev => ({ ...prev, story: e.target.value }))}
            placeholder={content[language].placeholder}
            className="min-h-[200px]"
            required
          />
        </div>
        <Button type="submit" className="w-full" disabled={isLoading || !session}>
          {isLoading ? <div className="animate-spin">⏳</div> : content[language].generate}
        </Button>
      </form>

      <QuotaAlert open={showQuotaAlert} onOpenChange={setShowQuotaAlert} />
    </div>
  )
}
