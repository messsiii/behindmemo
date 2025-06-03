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
  const { status } = useSession()

  // 使用 useEffect 确保组件只在客户端渲染后显示
  useEffect(() => {
    setMounted(true)
  }, [])

  const links = [
    { href: '/write', label: language === 'en' ? 'Write' : '写信' },
    { href: '/gen', label: language === 'en' ? 'AI Images' : 'AI 图像' },
    ...(status === 'authenticated' ? [{ href: '/history', label: language === 'en' ? 'History' : '历史' }] : []),
    { href: '/pricing', label: language === 'en' ? 'Pricing' : '定价' },
    { href: '/blog', label: language === 'en' ? 'Blog' : '博客' },
  ]

  // 在客户端渲染前返回一个占位内容
  if (!mounted) {
    return (
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <div className="mr-4 hidden md:flex">
            <Link href="/" className="mr-6 flex items-center space-x-2">
              <span className="hidden font-bold sm:inline-block">Behind Memory</span>
            </Link>
            <nav className="flex items-center space-x-6 text-sm font-medium">
              <div className="h-4 w-12 animate-pulse bg-muted rounded" />
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
                    className="text-sm font-medium relative group"
                    onClick={() => setIsOpen(false)}
                  >
                    <span className={`absolute inset-0 bg-gradient-to-r from-[#738fbd] to-[#cc8eb1] bg-clip-text text-transparent transition-opacity duration-300 ease-in-out ${
                      pathname === href ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                    }`}>
                      {label}
                    </span>
                    <span className={`transition-opacity duration-300 ease-in-out ${
                      pathname === href ? 'opacity-0' : 'opacity-100 group-hover:opacity-0'
                    }`}>
                      {label}
                    </span>
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>

          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <span className="font-bold">Behind Memory</span>
          </Link>

          {/* 桌面端导航链接 */}
          <nav className="hidden md:flex items-center space-x-6 text-sm font-medium ml-6">
            {links.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="relative group"
              >
                <span className={`absolute inset-0 bg-gradient-to-r from-[#738fbd] to-[#cc8eb1] bg-clip-text text-transparent transition-opacity duration-300 ease-in-out ${
                  pathname === href ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                }`}>
                  {label}
                </span>
                <span className={`transition-opacity duration-300 ease-in-out ${
                  pathname === href ? 'opacity-0' : 'opacity-100 group-hover:opacity-0'
                }`}>
                  {label}
                </span>
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
          {status === 'authenticated' ? (
            <UserAvatar />
          ) : (
            <Button variant="ghost" className="relative h-8 w-8 rounded-full" asChild>
              <Link href="/auth/signin?source=login">{language === 'en' ? 'Login' : '登录'}</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
