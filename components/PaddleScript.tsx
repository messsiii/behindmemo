'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Script from 'next/script'
import { useEffect } from 'react'

declare global {
  interface Window {
    Paddle: any
  }
}

export default function PaddleScript() {
  const router = useRouter()
  const { update } = useSession()
  
  useEffect(() => {
    // 当脚本加载完成后初始化Paddle
    const initializePaddle = () => {
      if (window.Paddle) {
        console.log('初始化Paddle...')
        try {
          // 设置为生产环境，移除沙盒模式
          window.Paddle.Environment.set('production')
          
          // 初始化Paddle，使用环境变量中的客户端令牌
          window.Paddle.Setup({ 
            token: process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN,
            // 添加事件回调
            eventCallback: async function(eventData: any) {
              console.log('Paddle事件:', eventData)
              
              // 处理特定事件
              if (eventData.name === 'checkout.completed') {
                console.log('结账完成事件:', eventData.data)
                
                // 获取交易ID
                const transactionId = eventData.data.transaction_id
                if (transactionId) {
                  try {
                    console.log(`调用验证API验证交易: ${transactionId}`)
                    const response = await fetch('/api/verify-transaction', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({ transactionId }),
                    })
                    
                    const result = await response.json()
                    console.log('验证结果:', result)
                    
                    if (result.success) {
                      // 不再调用 update()，避免重定向循环
                      // 直接重定向到成功页面，并包含交易ID
                      router.push(`/checkout/success?transaction_id=${transactionId}`)
                    } else {
                      console.error('交易验证失败:', result.error)
                      // 可以考虑显示错误消息或重定向到错误页面
                    }
                  } catch (error) {
                    console.error('验证API调用失败:', error)
                  }
                } else {
                  console.error('结账完成事件中没有交易ID')
                }
              } else if (eventData.name === 'checkout.closed') {
                console.log('结账关闭事件:', eventData.data)
              }
            }
          })
          
          console.log('Paddle初始化成功，客户端Token:', process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN)
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
  }, [router, update])

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