import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useLanguage } from '@/contexts/LanguageContext'
import { Infinity, Sparkles } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import { useEffect } from 'react'
import useSWR from 'swr'

interface CreditsInfo {
  credits: number
  isVIP: boolean
  vipExpiresAt: string | null
}

const fetcher = async (url: string) => {
  const response = await fetch(url, { credentials: 'include' })
  if (!response.ok) {
    throw new Error('Failed to fetch credits')
  }
  return response.json()
}

export function QuotaDisplay() {
  const { data: session } = useSession()
  const { language } = useLanguage()
  const pathname = usePathname()

  const {
    data: creditsInfo,
    error,
    isLoading,
    mutate
  } = useSWR<CreditsInfo>(
    session?.user?.id ? '/api/user/credits' : null,
    fetcher,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      refreshWhenHidden: false,
      refreshWhenOffline: false,
    }
  )

  // 在路由变化时重新获取数据
  useEffect(() => {
    if (session?.user?.id) {
      mutate()
    }
  }, [pathname, session?.user?.id, mutate])

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

  const tooltipContent = language === 'en'
    ? `${creditsInfo?.isVIP ? 'Unlimited credits (VIP)' : `${creditsInfo?.credits} credits remaining`}`
    : `${creditsInfo?.isVIP ? '无限创作次数（VIP）' : `剩余 ${creditsInfo?.credits} 次创作机会`}`

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1 text-muted-foreground">
            {creditsInfo?.isVIP ? (
              <Infinity className="h-4 w-4" />
            ) : (
              <>
                <span className="text-sm font-medium">{creditsInfo?.credits ?? 0}</span>
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