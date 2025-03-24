'use client'

import LoginWithEmail from '@/components/auth/LoginWithEmail'
import { Button } from '@/components/ui/button'
import {
    Card,
    CardContent,
    CardHeader,
} from '@/components/ui/card'
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger
} from '@/components/ui/tabs'
import { useLanguage } from '@/contexts/LanguageContext'
import { Loader2 } from 'lucide-react'
import { signIn } from 'next-auth/react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

export default function SignIn() {
  const { language } = useLanguage()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams?.get('callbackUrl') || '/write'
  const error = searchParams?.get('error')
  const [mounted, setMounted] = useState(false)
  const [tab, setTab] = useState('google') // 默认显示谷歌登录
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // 如果有错误，显示错误信息
  useEffect(() => {
    if (error) {
      console.error('Authentication error:', error)
      toast.error(error === 'CredentialsSignin' 
        ? (language === 'en' ? 'Invalid verification code' : '验证码无效') 
        : (language === 'en' ? 'Authentication failed' : '登录失败'))
    }
  }, [error, language])

  const handleGoogleSignIn = async () => {
    setIsSubmitting(true)
    try {
      await signIn('google', {
        callbackUrl,
        redirect: true,
      })
    } catch (error) {
      console.error('Sign in error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const content = {
    title: language === 'en' ? 'Welcome Back' : '欢迎回来',
    emailTab: language === 'en' ? 'Email' : '邮箱登录',
    googleTab: language === 'en' ? 'Google' : '谷歌登录',
    continueWithGoogle: language === 'en' ? 'Continue with Google' : '使用谷歌账号登录',
    byClickingAgree: language === 'en' 
      ? 'By logging in, you agree to our' 
      : '登录即表示您同意我们的',
    termsOfService: language === 'en' ? 'Terms' : '服务条款',
    and: language === 'en' ? 'and' : '和',
    privacyPolicy: language === 'en' ? 'Privacy Policy' : '隐私政策',
  }

  if (!mounted) return null

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center py-10 px-4 md:px-8">
      {/* 背景层 - 使用fixed定位确保完全覆盖屏幕 */}
      <div className="fixed inset-0 w-screen h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 dark:from-gray-900 dark:via-gray-950 dark:to-gray-900 -z-10" />

      {/* 内容层 */}
      <div className="w-full max-w-md mx-auto bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-xl shadow-lg p-6 md:p-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold tracking-tight">
            {content.title}
          </h1>
        </div>

        <Tabs defaultValue="google" className="w-full" value={tab} onValueChange={setTab}>
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="email">{content.emailTab}</TabsTrigger>
            <TabsTrigger value="google">{content.googleTab}</TabsTrigger>
          </TabsList>
          
          <TabsContent value="email" className="mt-2">
            <LoginWithEmail />
          </TabsContent>
          
          <TabsContent value="google" className="mt-2">
            <Card className="border-0 shadow-none bg-transparent">
              <CardHeader className="pb-2 pt-0 px-0">
              </CardHeader>
              <CardContent className="p-0">
                <Button
                  variant="outline"
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleGoogleSignIn}
                  className="w-full h-11 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors"
                >
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <svg className="mr-2 h-5 w-5" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                  )}
                  <span className="font-medium">{content.continueWithGoogle}</span>
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <p className="mt-6 text-center text-xs text-gray-500 dark:text-gray-400">
          {content.byClickingAgree}{" "}
          <Link href="/terms" className="underline underline-offset-4 hover:text-primary">
            {content.termsOfService}
          </Link>{" "}
          {content.and}{" "}
          <Link href="/privacy" className="underline underline-offset-4 hover:text-primary">
            {content.privacyPolicy}
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
