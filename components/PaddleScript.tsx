'use client'

import { toast } from '@/components/ui/use-toast'
import { useLanguage } from '@/contexts/LanguageContext'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Script from 'next/script'
import { useCallback, useEffect } from 'react'

declare global {
  interface Window {
    Paddle: any
    paddleProcessingEvent?: boolean
  }
}

export default function PaddleScript() {
  const router = useRouter()
  const { update } = useSession()
  const { language } = useLanguage()
  
  // 主动查询订阅状态的函数，使用useCallback包装
  const checkSubscriptionStatus = useCallback(async (subscriptionId: string, transactionId: string, attempt: number, locale: string) => {
    if (attempt > 3) {
      // 超过最大尝试次数
      toast({
        title: locale === 'zh-CN' ? '验证超时' : 'Verification timeout',
        description: locale === 'zh-CN' ? '请到账户页面查看订阅状态，或联系客服' : 'Please check your subscription status in account page or contact support',
        variant: 'destructive',
      })
      return
    }

    try {
      console.log(`尝试查询订阅状态 (${attempt}/3): ${subscriptionId}`)
      
      // 调用专门用于查询订阅状态的API
      const response = await fetch('/api/check-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ subscriptionId, transactionId }),
      })
      
      if (response.ok) {
        const result = await response.json()
        
        if (result.success) {
          // 订阅验证成功
          toast({
            title: locale === 'zh-CN' ? '订阅激活成功' : 'Subscription activated',
            description: locale === 'zh-CN' ? '您的VIP会员已激活' : 'Your VIP membership has been activated',
          })
          
          // 重定向到成功页面
          router.push(`/checkout/success?transaction_id=${transactionId}`)
          return
        }
      }
      
      // 如果验证失败且未达到最大尝试次数，则延迟后再次尝试
      toast({
        title: locale === 'zh-CN' ? `正在重试 (${attempt}/3)` : `Retrying (${attempt}/3)`,
        description: locale === 'zh-CN' ? '订阅验证中，请稍候...' : 'Verifying subscription, please wait...',
      })
      
      // 递增延迟时间，避免过于频繁的请求
      setTimeout(() => {
        checkSubscriptionStatus(subscriptionId, transactionId, attempt + 1, locale)
      }, 15000) // 15秒后重试
      
    } catch (error) {
      console.error('查询订阅状态失败:', error)
      
      // 出错后仍然尝试重试
      setTimeout(() => {
        checkSubscriptionStatus(subscriptionId, transactionId, attempt + 1, locale)
      }, 15000) // 15秒后重试
    }
  }, [router]); // 添加router作为依赖项
  
  useEffect(() => {
    // 当脚本加载完成后初始化Paddle
    const initializePaddle = () => {
      if (window.Paddle) {
        console.log('初始化Paddle...')
        try {
          // 设置为生产环境，移除沙盒模式
          window.Paddle.Environment.set('production')
          
          // 获取用户当前语言设置
          const userLanguage = language || localStorage.getItem('preferred_language') || 'zh'
          // 将语言转换为Paddle支持的locale格式
          const localeMap: Record<string, string> = {
            'zh': 'zh-CN', // 简体中文
            'en': 'en'     // 英文
          }
          const locale = localeMap[userLanguage] || 'zh-CN'
          console.log(`使用语言设置: ${userLanguage}, Paddle locale: ${locale}`)
          
          // 初始化Paddle，使用环境变量中的客户端令牌
          window.Paddle.Setup({ 
            token: process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN,
            // 设置默认的结账选项
            checkout: {
              settings: {
                locale: locale, // 设置结账窗口的默认语言
                displayMode: 'overlay', // 使用覆盖模式而不是弹出窗口
                theme: 'light' // 使用浅色主题
              }
            },
            // 添加事件回调
            eventCallback: async function(eventData: any) {
              console.log('Paddle事件:', eventData)
              
              // 防止多个事件同时处理
              if (window.paddleProcessingEvent) {
                console.log('已有Paddle事件正在处理，忽略此事件')
                return
              }
              
              window.paddleProcessingEvent = true
              
              try {
                // 处理特定事件
                if (eventData.name === 'checkout.completed') {
                  console.log('结账完成事件:', eventData.data)
                  
                  // 获取交易ID
                  const transactionId = eventData.data.transaction_id
                  const subscriptionId = eventData.data.subscription_id
                  
                  if (transactionId) {
                    try {
                      // 显示处理中提示
                      toast({
                        title: locale === 'zh-CN' ? '正在处理交易' : 'Processing transaction',
                        description: locale === 'zh-CN' ? '请稍候，系统正在处理您的订单...' : 'Please wait while we process your order...',
                      })

                      console.log(`调用验证API验证交易: ${transactionId}`)
                      const response = await fetch('/api/verify-transaction', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ transactionId }),
                      })
                      
                      if (!response.ok) {
                        throw new Error(`API返回状态错误: ${response.status}`)
                      }
                      
                      const result = await response.json()
                      console.log('验证结果:', result)
                      
                      if (result.success) {
                        // 更新提示
                        toast({
                          title: locale === 'zh-CN' ? '交易成功' : 'Transaction successful',
                          description: locale === 'zh-CN' ? '您的订单已处理完成' : 'Your order has been processed successfully',
                        })
                        
                        // 刷新用户会话，更新状态
                        await update()
                        
                        // 重定向到成功页面，并包含交易ID
                        router.push(`/checkout/success?transaction_id=${transactionId}`)
                      } else {
                        console.error('交易验证失败:', result.error)
                        
                        // 验证失败，如果是订阅，尝试通过另一种方式查询订阅状态
                        if (subscriptionId) {
                          toast({
                            title: locale === 'zh-CN' ? '正在验证订阅' : 'Verifying subscription',
                            description: locale === 'zh-CN' ? '首次验证失败，正在尝试替代方案...' : 'Initial verification failed, trying alternative method...',
                          })
                          
                          // 延迟10秒，然后检查订阅状态
                          setTimeout(() => {
                            checkSubscriptionStatus(subscriptionId, transactionId, 1, locale)
                          }, 10000) // 10秒后检查
                        } else {
                          // 非订阅商品，显示错误
                          toast({
                            title: locale === 'zh-CN' ? '交易验证失败' : 'Transaction verification failed',
                            description: locale === 'zh-CN' ? '请联系客服获取帮助' : 'Please contact customer support for assistance',
                            variant: 'destructive',
                          })
                        }
                      }
                    } catch (error) {
                      console.error('验证API调用失败:', error)
                      toast({
                        title: locale === 'zh-CN' ? '交易验证出错' : 'Transaction verification error',
                        description: locale === 'zh-CN' ? '请刷新页面再试' : 'Please refresh the page and try again',
                        variant: 'destructive',
                      })
                      
                      // 即使出错也触发订阅成功事件，尝试后台刷新状态
                      if (subscriptionId) {
                        const event = new CustomEvent('subscription:success')
                        window.dispatchEvent(event)
                      }
                    }
                  } else {
                    console.error('结账完成事件中没有交易ID')
                    toast({
                      title: locale === 'zh-CN' ? '交易ID缺失' : 'Missing transaction ID',
                      description: locale === 'zh-CN' ? '无法验证交易，请联系客服' : 'Cannot verify transaction, please contact support',
                      variant: 'destructive',
                    })
                  }
                } else if (eventData.name === 'checkout.closed') {
                  console.log('结账关闭事件:', eventData.data)
                }
              } finally {
                window.paddleProcessingEvent = false
              }
            }
          })
          
          console.log('Paddle初始化成功，客户端Token:', process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN ? '已设置' : '未设置')
        } catch (error) {
          console.error('Paddle初始化失败:', error)
        }
      } else {
        console.error('Paddle对象不存在，无法初始化')
      }
    }

    // 如果Paddle已经加载，则初始化
    if (window.Paddle) {
      console.log('Paddle已加载，直接初始化')
      initializePaddle()
    } else {
      console.log('等待Paddle脚本加载...')
    }
    
    // 添加事件监听器，当Paddle脚本加载完成时初始化
    window.addEventListener('paddle:loaded', initializePaddle)
    
    // 清理函数
    return () => {
      window.removeEventListener('paddle:loaded', initializePaddle)
    }
  }, [router, update, language, checkSubscriptionStatus]) // 添加checkSubscriptionStatus作为依赖项

  return (
    <Script
      src="https://cdn.paddle.com/paddle/v2/paddle.js"
      strategy="afterInteractive"
      onLoad={() => {
        console.log('Paddle脚本加载完成')
        window.dispatchEvent(new Event('paddle:loaded'))
      }}
      onError={(e) => {
        console.error('Paddle脚本加载失败:', e)
      }}
    />
  )
} 