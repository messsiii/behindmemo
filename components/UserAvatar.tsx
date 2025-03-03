'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useLanguage } from '@/contexts/LanguageContext'
import { signOut, useSession } from 'next-auth/react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import useSWR from 'swr'

interface CreditsInfo {
  credits: number
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
    const error = new Error('Failed to fetch credits') as FetchError
    error.info = await res.json()
    throw error
  }
  return res.json()
}

export function UserAvatar() {
  const { data: session } = useSession()
  const { language } = useLanguage()
  const [mounted, setMounted] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  // 使用 SWR 进行数据获取和缓存
  const { data: creditsInfo, error } = useSWR<CreditsInfo>(
    session?.user?.id ? '/api/user/credits' : null,
    fetcher,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      refreshInterval: 30000, // 每30秒自动刷新一次
      dedupingInterval: 5000, // 5秒内不重复请求
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
    <DropdownMenu modal={false} open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage src={session.user.image || undefined} alt={session.user.name || ''} />
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
          {language === 'en' ? 'Credits' : '创作配额'}:{' '}
          {error ? (
            <span className="text-red-500">!</span>
          ) : !creditsInfo ? (
            <span className="animate-pulse">...</span>
          ) : (
            creditsInfo.credits
          )}
        </DropdownMenuItem>
        <DropdownMenuItem>
          {language === 'en' ? 'Total Usage' : '总使用'}:{' '}
          {error ? (
            <span className="text-red-500">!</span>
          ) : !creditsInfo ? (
            <span className="animate-pulse">...</span>
          ) : (
            (creditsInfo.totalUsage ?? '-')
          )}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/write">{language === 'en' ? 'Write Letter' : '写信'}</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/history">{language === 'en' ? 'History' : '历史'}</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/account">{language === 'en' ? 'My Account' : '我的账户'}</Link>
        </DropdownMenuItem>
        {creditsInfo?.isVIP ? (
          <DropdownMenuItem>
            <div className="flex flex-col">
              <span className="text-green-500 font-medium">
                {language === 'en' ? 'VIP Member' : 'VIP 会员'}
              </span>
              {creditsInfo.vipExpiresAt && (
                <span className="text-xs text-muted-foreground">
                  {language === 'en' ? 'Expires: ' : '到期时间: '}
                  {new Date(creditsInfo.vipExpiresAt).toLocaleDateString()}
                </span>
              )}
            </div>
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem asChild>
            <Link href="/pricing">{language === 'en' ? 'Upgrade' : '升级'}</Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-red-500 focus:text-red-500"
          onSelect={() => signOut({ callbackUrl: '/' })}
        >
          {language === 'en' ? 'Sign out' : '退出登录'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
