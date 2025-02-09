'use client'

import { useSession } from 'next-auth/react'
import { useLanguage } from '@/contexts/LanguageContext'
import { Sparkles, Infinity } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import useSWR from 'swr'
import { useEffect } from 'react'

interface QuotaInfo {
  quota: number
  isVIP: boolean
  vipExpiresAt: string | null
}

interface QuotaError extends Error {
  info?: any
}

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) {
    const error = new Error('Failed to fetch quota') as QuotaError
    error.info = await res.json()
    throw error
  }
  return res.json()
}

export function QuotaDisplay() {
  const { data: session } = useSession()
  const { language } = useLanguage()

  const {
    data: quotaInfo,
    isLoading,
    error,
    mutate,
  } = useSWR<QuotaInfo>(session?.user?.id ? '/api/user/quota' : null, fetcher, {
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    refreshInterval: 30000, // 每30秒自动刷新一次
    dedupingInterval: 5000, // 5秒内不重复请求
    onError: err => {
      console.error('Error fetching quota:', err)
    },
  })

  // 组件挂载时立即获取配额
  useEffect(() => {
    if (session?.user?.id) {
      mutate()
    }
  }, [session?.user?.id, mutate])

  // 如果未登录，不显示任何内容
  if (!session?.user?.id) return null

  // 如果发生错误，显示错误状态
  if (error) {
    return (
      <div className="flex items-center gap-1 text-destructive">
        <span className="text-sm font-medium">!</span>
        <Sparkles className="h-4 w-4" />
      </div>
    )
  }

  // 如果正在加载，显示加载状态
  if (isLoading) {
    return (
      <div className="flex items-center gap-1 text-muted-foreground animate-pulse">
        <span className="text-sm font-medium">...</span>
        <Sparkles className="h-4 w-4" />
      </div>
    )
  }

  const tooltipContent =
    language === 'en'
      ? `${quotaInfo?.isVIP ? 'Unlimited generations (VIP)' : `${quotaInfo?.quota} generations remaining`}`
      : `${quotaInfo?.isVIP ? '无限生成次数（VIP）' : `剩余 ${quotaInfo?.quota} 次生成机会`}`

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1 text-muted-foreground">
            {quotaInfo?.isVIP ? (
              <Infinity className="h-4 w-4" />
            ) : (
              <>
                <span className="text-sm font-medium">{quotaInfo?.quota ?? 0}</span>
                <Sparkles className="h-4 w-4" />
              </>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltipContent}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
