'use client'

import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { useLanguage } from '@/contexts/LanguageContext'
import { Globe, Menu } from 'lucide-react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { UserAvatar } from './UserAvatar'

export function Nav() {
  const { language, setLanguage } = useLanguage()
  const [mounted, setMounted] = useState(false)
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const session = useSession()

  // 使用 useEffect 确保组件只在客户端渲染后显示
  useEffect(() => {
    setMounted(true)
  }, [])

  const links = [
    { href: '/write', label: language === 'en' ? 'Write' : '写信' },
    { href: '/pricing', label: language === 'en' ? 'Pricing' : '定价' },
    { href: '/about', label: language === 'en' ? 'About' : '关于' },
  ]

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
      <div className="container flex h-14 items-center justify-between">
        {/* 左侧 Logo 和导航 */}
        <div className="flex items-center">
          {/* 移动端菜单按钮 */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon" className="mr-2">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[240px] sm:w-[280px]">
              <SheetHeader>
                <SheetTitle>
                  {language === 'en' ? 'Menu' : '菜单'}
                </SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col space-y-4 mt-6">
                {links.map(({ href, label }) => (
                  <Link
                    key={href}
                    href={href}
                    className={`text-sm font-medium transition-colors hover:text-foreground/80 text-foreground
                      ${pathname === href ? 'font-bold' : ''}`}
                    onClick={() => setIsOpen(false)}
                  >
                    {label}
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>

          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <span className="font-bold">AI Love Letter</span>
          </Link>

          {/* 桌面端导航链接 */}
          <nav className="hidden md:flex items-center space-x-6 text-sm font-medium ml-6">
            {links.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`transition-colors hover:text-foreground/80 text-foreground relative
                  ${pathname === href ? 'after:absolute after:bottom-[-1.5rem] after:left-0 after:right-0 after:h-[2px] after:bg-foreground' : ''}`}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>

        {/* 右侧功能按钮 */}
        <div className="flex items-center space-x-2">
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
          {/* 如果未登录，显示登录按钮 */}
          {!session && (
            <Button variant="ghost" className="relative h-8 w-8 rounded-full" asChild>
              <Link href="/auth/signin?callbackUrl=/">{language === 'en' ? 'Login' : '登录'}</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
