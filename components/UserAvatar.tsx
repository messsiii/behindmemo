'use client'

import { useSession, signOut } from 'next-auth/react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useLanguage } from '@/contexts/LanguageContext'
import useSWR from 'swr'

interface QuotaInfo {
  quota: number
  isVIP: boolean
  vipExpiresAt: string | null
  totalUsage: number
}

interface FetchError extends Error {
  info?: any
}

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) {
    const error = new Error('Failed to fetch quota') as FetchError
    error.info = await res.json()
    throw error
  }
  return res.json()
}

export function UserAvatar() {
  const { data: session } = useSession()
  const { language } = useLanguage()
  const [mounted, setMounted] = useState(false)

  // 使用 SWR 进行数据获取和缓存
  const { data: quotaInfo, error } = useSWR<QuotaInfo>(
    session?.user?.id ? '/api/user/quota' : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      refreshInterval: 5 * 60 * 1000, // 5分钟刷新一次
      dedupingInterval: 30 * 1000, // 30秒内不重复请求
      onError: err => {
        console.error('Error fetching quota:', err)
      },
    }
  )

  useEffect(() => {
    setMounted(true)
  }, [])

  // 在客户端渲染前返回一个骨架屏
  if (!mounted) {
    return (
      <Button variant="ghost" className="relative h-8 w-8 rounded-full">
        <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse" />
      </Button>
    )
  }

  // 如果未登录，显示登录按钮
  if (!session) {
    return (
      <Button variant="ghost" className="relative h-8 w-8 rounded-full" asChild>
        <Link href="/auth/signin">{language === 'en' ? 'Login' : '登录'}</Link>
      </Button>
    )
  }

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage src={session.user.image || ''} alt={session.user.name || ''} />
            <AvatarFallback>{session.user.name?.[0]}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{session.user.name}</p>
            <p className="text-xs leading-none text-muted-foreground">{session.user.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          {language === 'en' ? 'Quota' : '配额'}:{' '}
          {error ? (
            <span className="text-red-500">!</span>
          ) : !quotaInfo ? (
            <span className="animate-pulse">...</span>
          ) : quotaInfo.isVIP ? (
            'VIP'
          ) : language === 'en' ? (
            `${quotaInfo.quota} times`
          ) : (
            `${quotaInfo.quota} 次`
          )}
        </DropdownMenuItem>
        <DropdownMenuItem>
          {language === 'en' ? 'Total Usage' : '总使用'}:{' '}
          {error ? (
            <span className="text-red-500">!</span>
          ) : !quotaInfo ? (
            <span className="animate-pulse">...</span>
          ) : (
            (quotaInfo.totalUsage ?? '-')
          )}
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/history">{language === 'en' ? 'History' : '历史记录'}</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-red-600" onClick={() => signOut()}>
          {language === 'en' ? 'Sign Out' : '退出登录'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
