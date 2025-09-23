'use client'

export const dynamic = 'force-dynamic'

import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { useLanguage } from '@/contexts/LanguageContext'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'

function ClaimAnonymousContent() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { language } = useLanguage()
  const { toast } = useToast()

  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newLetterId, setNewLetterId] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<string>('')

  // 获取要认领的信件ID，优先从URL参数获取，如果没有尝试从localStorage中获取
  const [letterId, setLetterId] = useState<string | null>(null)

  // 添加调试信息
  const addDebugInfo = (info: string) => {
    setDebugInfo(
      prev => `${prev}\n${new Date().toISOString().split('T')[1].split('.')[0]} - ${info}`
    )
    console.log(`[CLAIM_PAGE] ${info}`)
  }

  // 检查URL参数并更新letterId
  useEffect(() => {
    // 获取URL中的letterId参数
    const letterIdFromUrl = searchParams?.get('letterId')

    if (letterIdFromUrl) {
      addDebugInfo(`从URL获取到letterId: ${letterIdFromUrl}`)
      setLetterId(letterIdFromUrl)

      // 备份letterId到localStorage，防止刷新页面时丢失
      try {
        localStorage.setItem('claim_letter_id', letterIdFromUrl)
        addDebugInfo('已将letterId保存到localStorage')
      } catch (err) {
        addDebugInfo('无法保存letterId到localStorage')
      }
    } else {
      // 如果URL中没有，尝试从localStorage获取
      try {
        const savedLetterId = localStorage.getItem('claim_letter_id')
        if (savedLetterId) {
          addDebugInfo(`从localStorage获取到letterId: ${savedLetterId}`)
          setLetterId(savedLetterId)
        } else {
          addDebugInfo('URL和localStorage中都没有letterId')
        }
      } catch (err) {
        addDebugInfo('无法从localStorage获取letterId')
      }
    }
  }, [searchParams])

  // 使用 useState 和 useEffect 确保客户端和服务器端渲染一致
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
    // 打印初始状态，便于调试
    addDebugInfo(
      `页面加载, 当前状态: mounted=${true}, status=${status}, letterId=${letterId}, isProcessing=${isProcessing}`
    )
  }, [status, letterId, isProcessing])

  // 手动触发认领流程
  const startClaiming = async () => {
    if (isProcessing) return
    addDebugInfo(`手动开始认领流程: letterId=${letterId}`)
    setIsProcessing(true)
    await claimLetter()
  }

  // 定义认领函数，以便可以从多处调用
  const claimLetter = async () => {
    // 如果没有信件ID，不执行
    if (!letterId) {
      addDebugInfo('缺少信件ID，无法认领')
      setError(
        language === 'en'
          ? 'Missing letter ID, cannot claim the letter'
          : '缺少信件ID，无法认领信件'
      )
      setIsProcessing(false)
      return
    }

    if (!session?.user?.id) {
      addDebugInfo('用户未登录，无法认领')
      setError(
        language === 'en' ? 'You must be logged in to claim a letter' : '您必须登录才能认领信件'
      )
      setIsProcessing(false)
      return
    }

    addDebugInfo(`开始处理匿名信件认领: ID=${letterId}, 用户=${session.user.id}`)

    try {
      // 调用API认领匿名信件
      addDebugInfo('发送API请求...')
      const res = await fetch('/api/anonymous/claim-letter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ letterId }),
      })

      const responseText = await res.text()
      addDebugInfo(`API响应状态: ${res.status}`)

      // 尝试解析JSON响应
      let data
      try {
        data = JSON.parse(responseText)
      } catch (e) {
        addDebugInfo(`响应不是有效的JSON: ${responseText}`)
        throw new Error(`Invalid JSON response: ${responseText}`)
      }

      if (!res.ok) {
        addDebugInfo(`API错误: ${data.error || responseText}`)
        throw new Error(data.message || 'API request failed')
      }

      addDebugInfo(`信件认领成功! 新ID: ${data.newLetterId}`)

      // 清除localStorage中的临时数据
      try {
        localStorage.removeItem('claim_letter_id')
        addDebugInfo('已清除localStorage中的letterId')
      } catch (err) {
        // 忽略错误
      }

      // 显示成功提示
      toast({
        title: language === 'en' ? 'Successfully saved' : '保存成功',
        description:
          language === 'en' ? 'Letter has been saved to your account' : '信件已保存到您的账户',
      })

      // 保存新的信件ID
      if (data.newLetterId) {
        setNewLetterId(data.newLetterId)
        // 自动跳转到结果页
        addDebugInfo(`准备跳转到结果页: /result/${data.newLetterId}`)
        setTimeout(() => {
          addDebugInfo(`执行跳转...`)
          window.location.href = `/result/${data.newLetterId}`
        }, 1000)
      } else {
        addDebugInfo('API没有返回新信件ID')
        throw new Error('No new letter ID returned')
      }
    } catch (err: any) {
      addDebugInfo(`错误: ${err.message || err}`)
      setError(
        language === 'en' ? 'Failed to save letter to your account' : '无法将信件保存到您的账户'
      )

      // 显示错误提示
      toast({
        title: language === 'en' ? 'Error' : '错误',
        description:
          language === 'en'
            ? 'Failed to save letter to your account, please try again'
            : '无法将信件保存到您的账户，请重试',
        variant: 'destructive',
      })
    } finally {
      setIsProcessing(false)
    }
  }

  // 自动处理信件认领
  useEffect(() => {
    // 确保组件已挂载且用户已登录
    if (!mounted) {
      addDebugInfo('组件尚未挂载，等待...')
      return
    }

    if (status !== 'authenticated') {
      addDebugInfo(`用户未认证，当前状态: ${status}`)
      return
    }

    if (isProcessing) {
      addDebugInfo('已在处理中，跳过...')
      return
    }

    if (!letterId) {
      addDebugInfo('没有信件ID，跳过...')
      return
    }

    // 仅当所有条件满足时，自动启动认领流程
    addDebugInfo('所有条件满足，准备自动认领...')
    setIsProcessing(true)

    // 设置一个短暂的延迟，确保session完全加载
    const timer = setTimeout(() => {
      claimLetter()
    }, 500)

    return () => clearTimeout(timer)
  }, [mounted, status, letterId, isProcessing])

  // 如果未挂载，返回加载状态
  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-black p-4">
        <div className="w-12 h-12 border-4 border-t-blue-500 border-blue-500/30 rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-black p-4">
      <div className="max-w-md w-full bg-gray-800/60 backdrop-blur-lg border border-gray-700/50 rounded-xl p-8 shadow-xl">
        <div className="text-center space-y-6">
          <h1 className="text-2xl font-bold text-white">
            {language === 'en' ? 'Saving your letter...' : '正在保存您的信件...'}
          </h1>

          {isProcessing ? (
            <div className="flex flex-col items-center space-y-4">
              <div className="w-12 h-12 border-4 border-t-blue-500 border-blue-500/30 rounded-full animate-spin"></div>
              <p className="text-gray-300">
                {language === 'en'
                  ? 'Processing your letter, please wait...'
                  : '正在处理您的信件，请稍候...'}
              </p>
            </div>
          ) : error ? (
            <div className="space-y-4">
              <div className="text-red-400 p-4 bg-red-500/10 rounded-lg">{error}</div>
              <div className="flex justify-center space-x-4">
                <Button
                  onClick={() => router.push('/')}
                  variant="outline"
                  className="bg-transparent border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white"
                >
                  {language === 'en' ? 'Go to Home' : '返回首页'}
                </Button>
                <Button
                  onClick={startClaiming}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {language === 'en' ? 'Try Again' : '重试'}
                </Button>
              </div>
            </div>
          ) : newLetterId ? (
            <div className="space-y-4">
              <div className="text-green-400 p-4 bg-green-500/10 rounded-lg">
                {language === 'en' ? 'Letter saved successfully!' : '信件保存成功！'}
              </div>
              <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white w-full">
                <Link href={`/result/${newLetterId}`}>
                  {language === 'en' ? 'View Your Letter' : '查看您的信件'}
                </Link>
              </Button>
            </div>
          ) : status === 'authenticated' && letterId ? (
            <div className="space-y-4">
              <p className="text-gray-300">
                {language === 'en' ? 'Ready to save your letter...' : '准备保存您的信件...'}
              </p>
              <Button
                onClick={startClaiming}
                className="bg-blue-600 hover:bg-blue-700 text-white w-full"
              >
                {language === 'en' ? 'Save Now' : '立即保存'}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-yellow-300">
                {language === 'en' ? 'Waiting for login information...' : '等待登录信息...'}
              </p>
              <div className="text-xs text-left text-gray-500 mt-4 p-2 bg-gray-800/80 rounded-md overflow-auto max-h-32">
                <pre>{debugInfo || 'No debug info yet'}</pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ClaimAnonymousPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-black p-4">
          <div className="w-12 h-12 border-4 border-t-blue-500 border-blue-500/30 rounded-full animate-spin"></div>
        </div>
      }
    >
      <ClaimAnonymousContent />
    </Suspense>
  )
}
