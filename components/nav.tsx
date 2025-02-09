'use client'

import Link from 'next/link'
import { UserAvatar } from './UserAvatar'
import { useLanguage } from '@/contexts/LanguageContext'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Globe } from 'lucide-react'
import { useEffect, useState } from 'react'

export function Nav() {
  const { language, setLanguage } = useLanguage()
  const [mounted, setMounted] = useState(false)

  // 使用 useEffect 确保组件只在客户端渲染后显示
  useEffect(() => {
    setMounted(true)
  }, [])

  // 在客户端渲染前返回一个占位内容
  if (!mounted) {
    return (
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <div className="mr-4 hidden md:flex">
            <Link href="/" className="mr-6 flex items-center space-x-2">
              <span className="hidden font-bold sm:inline-block">AI Love Letter</span>
            </Link>
            <nav className="flex items-center space-x-6 text-sm font-medium">
              <div className="h-4 w-12 animate-pulse bg-muted rounded" />
              <div className="h-4 w-12 animate-pulse bg-muted rounded" />
              <div className="h-4 w-12 animate-pulse bg-muted rounded" />
            </nav>
          </div>
          <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
            <nav className="flex items-center space-x-2">
              <div className="h-8 w-8 animate-pulse bg-muted rounded-full" />
              <div className="h-8 w-8 animate-pulse bg-muted rounded-full" />
            </nav>
          </div>
        </div>
      </header>
    )
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 hidden md:flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <span className="hidden font-bold sm:inline-block">AI Love Letter</span>
          </Link>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            <Link
              href="/write"
              className="transition-colors hover:text-foreground/80 text-foreground"
            >
              {language === 'en' ? 'Write' : '写信'}
            </Link>
            <Link
              href="/pricing"
              className="transition-colors hover:text-foreground/80 text-foreground"
            >
              {language === 'en' ? 'Pricing' : '定价'}
            </Link>
            <Link
              href="/about"
              className="transition-colors hover:text-foreground/80 text-foreground"
            >
              {language === 'en' ? 'About' : '关于'}
            </Link>
          </nav>
        </div>
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <nav className="flex items-center space-x-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Globe className="h-4 w-4" />
                  <span className="sr-only">Toggle language</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setLanguage('zh')}>
                  <span className={language === 'zh' ? 'font-bold' : ''}>中文</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLanguage('en')}>
                  <span className={language === 'en' ? 'font-bold' : ''}>English</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <UserAvatar />
          </nav>
        </div>
      </div>
    </header>
  )
}
