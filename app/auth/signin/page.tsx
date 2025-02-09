'use client'

import { Button } from '@/components/ui/button'
import { useLanguage } from '@/contexts/LanguageContext'
import { signIn } from 'next-auth/react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function SignIn() {
  const { language } = useLanguage()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/write'
  const error = searchParams.get('error')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // 如果有错误，显示错误信息
  useEffect(() => {
    if (error) {
      console.error('Authentication error:', error)
      // 这里可以添加错误提示UI
    }
  }, [error])

  const handleSignIn = async () => {
    try {
      const result = await signIn('google', {
        callbackUrl,
        redirect: true,
      })
      if (result?.error) {
        console.error('Sign in error:', result.error)
      }
    } catch (error) {
      console.error('Sign in error:', error)
    }
  }

  const content = {
    en: {
      title: 'Welcome to AI Love Letter',
      subtitle: 'Sign in to continue',
      googleButton: 'Continue with Google',
      backButton: 'Back to Home',
      description:
        'By signing in, you can create beautiful love letters and save them for future reference.',
    },
    zh: {
      title: '欢迎使用 AI Love Letter',
      subtitle: '请登录以继续',
      googleButton: '使用谷歌账号登录',
      backButton: '返回首页',
      description: '登录后，你可以创建美丽的情书，并保存以供将来参考。',
    },
  }

  // 在客户端渲染前返回一个加载状态
  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 to-slate-50">
        <div className="w-full max-w-md space-y-8 p-8 bg-white rounded-lg shadow-lg">
          <div className="text-center space-y-2">
            <div className="h-8 w-3/4 mx-auto bg-gray-200 animate-pulse rounded" />
            <div className="h-4 w-1/2 mx-auto bg-gray-200 animate-pulse rounded" />
          </div>
          <div className="space-y-4">
            <div className="h-24 w-full bg-gray-200 animate-pulse rounded" />
            <div className="h-10 w-full bg-gray-200 animate-pulse rounded" />
            <div className="h-10 w-full bg-gray-200 animate-pulse rounded" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 to-slate-50">
      <div className="w-full max-w-md space-y-8 p-8 bg-white rounded-lg shadow-lg">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">{content[language].title}</h1>
          <p className="text-gray-500">{content[language].subtitle}</p>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-gray-600 text-center">{content[language].description}</p>

          <Button
            className="w-full flex items-center justify-center gap-2 bg-white text-gray-700 border hover:bg-gray-50"
            onClick={handleSignIn}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            {content[language].googleButton}
          </Button>

          <Button variant="ghost" className="w-full" asChild>
            <Link href="/">{content[language].backButton}</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
