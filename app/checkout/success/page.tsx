'use client'

import { Footer } from '@/components/footer'
import { Nav } from '@/components/nav'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/contexts/LanguageContext'
import { simulateWebhookEvent } from '@/lib/paddle'
import { CheckCircle } from 'lucide-react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

const content = {
  en: {
    title: 'Payment Successful',
    subtitle: 'Thank you for your purchase!',
    description: 'Your payment has been processed successfully. Your account has been updated with your purchase.',
    subscriptionNote: 'If you purchased a subscription, it will be activated immediately. If you purchased credits, they have been added to your account.',
    backToHome: 'Back to Home',
    viewAccount: 'View My Account',
    testButton: 'Simulate Credits (Dev Only)',
    testingMessage: 'Testing webhook...',
    verifyingPayment: 'Verifying your payment...',
    verificationFailed: 'Payment verification failed. Please contact support.'
  },
  zh: {
    title: '支付成功',
    subtitle: '感谢您的购买！',
    description: '您的支付已成功处理。您的账户已根据您的购买进行更新。',
    subscriptionNote: '如果您购买了订阅，它将立即激活。如果您购买了点数，它们已添加到您的账户中。',
    backToHome: '返回首页',
    viewAccount: '查看我的账户',
    testButton: '模拟点数到账（仅开发环境）',
    testingMessage: '正在测试webhook...',
    verifyingPayment: '正在验证您的支付...',
    verificationFailed: '支付验证失败，请联系客服。'
  }
}

export default function CheckoutSuccess() {
  const { language } = useLanguage()
  const t = content[language as keyof typeof content]
  const { data: session, update } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isTesting, setIsTesting] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [verificationError, setVerificationError] = useState('')
  const [hasVerified, setHasVerified] = useState(false)
  const [effectRan, setEffectRan] = useState(false)
  const isDev = process.env.NODE_ENV === 'development'
  
  // 在页面加载时刷新用户数据并验证交易
  useEffect(() => {
    // 防止重复执行
    if (effectRan) return;
    
    const refreshUserData = async () => {
      if (session) {
        // 不再调用 update()，避免重定向循环
        console.log('检查交易ID')
        
        // 检查URL参数中是否有交易ID，且尚未验证过
        const transactionId = searchParams.get('transaction_id')
        if (transactionId && !hasVerified) {
          setIsVerifying(true)
          setVerificationError('')
          
          try {
            console.log(`从URL参数获取到交易ID: ${transactionId}，调用验证API`)
            const response = await fetch('/api/verify-transaction', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ transactionId }),
            })
            
            const result = await response.json()
            console.log('验证结果:', result)
            
            if (!result.success) {
              setVerificationError(result.error || t.verificationFailed)
            }
            
            // 标记已验证，避免重复验证
            setHasVerified(true)
          } catch (error) {
            console.error('验证API调用失败:', error)
            setVerificationError(t.verificationFailed)
            // 即使出错也标记为已验证，避免无限重试
            setHasVerified(true)
          } finally {
            setIsVerifying(false)
          }
        }
      } else {
        // 如果没有会话，重定向到登录页面
        router.push('/login')
      }
      
      // 标记 effect 已运行
      setEffectRan(true)
    }
    
    refreshUserData()
  }, [session, router, searchParams, t.verificationFailed, hasVerified, effectRan])
  
  // 模拟webhook事件（仅用于测试）
  const handleSimulateWebhook = async () => {
    if (!session?.user?.id) return
    
    setIsTesting(true)
    try {
      await simulateWebhookEvent('transaction.completed', session.user.id, 100)
      // 刷新用户数据
      await update()
    } catch (error) {
      console.error('模拟webhook失败:', error)
    } finally {
      setIsTesting(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Nav />
      <main className="flex-1">
        <div className="container max-w-md mx-auto px-4 py-16 md:py-24 lg:py-32 flex flex-col items-center text-center">
          {isVerifying ? (
            <>
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-500 mb-6"></div>
              <h1 className="text-3xl font-bold tracking-tighter mb-2">{t.verifyingPayment}</h1>
            </>
          ) : verificationError ? (
            <>
              <div className="h-16 w-16 text-red-500 mb-6 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="15" y1="9" x2="9" y2="15"></line>
                  <line x1="9" y1="9" x2="15" y2="15"></line>
                </svg>
              </div>
              <h1 className="text-3xl font-bold tracking-tighter mb-2 text-red-500">{verificationError}</h1>
            </>
          ) : (
            <>
              <CheckCircle className="h-16 w-16 text-green-500 mb-6" />
              <h1 className="text-3xl font-bold tracking-tighter mb-2">{t.title}</h1>
              <p className="text-xl font-medium mb-4">{t.subtitle}</p>
              <p className="text-gray-500 mb-4">{t.description}</p>
              <p className="text-sm text-gray-400 mb-8">{t.subscriptionNote}</p>
            </>
          )}
          
          <div className="flex flex-col sm:flex-row gap-4 w-full mt-4">
            <Button asChild className="flex-1">
              <Link href="/">{t.backToHome}</Link>
            </Button>
            <Button asChild variant="outline" className="flex-1">
              <Link href="/account">{t.viewAccount}</Link>
            </Button>
          </div>
          
          {/* 开发环境测试按钮 */}
          {isDev && (
            <div className="mt-8 w-full">
              <Button 
                onClick={handleSimulateWebhook} 
                disabled={isTesting}
                variant="outline" 
                className="w-full mt-4 border-dashed border-gray-300"
              >
                {isTesting ? t.testingMessage : t.testButton}
              </Button>
              <p className="text-xs text-gray-400 mt-2">
                {language === 'en' 
                  ? 'This button is only visible in development mode and simulates a webhook event to add 100 credits to your account.'
                  : '此按钮仅在开发模式下可见，用于模拟webhook事件，向您的账户添加100点数。'
                }
              </p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
} 