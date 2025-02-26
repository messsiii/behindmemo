// Paddle客户端工具函数
import { getSession } from 'next-auth/react';

// 定义价格ID类型
export type PriceId = string;

// 定义Paddle结账配置的类型
interface PaddleCheckoutConfig {
  items: { priceId: string; quantity: number }[];
  customData: { userId: string };
  success_url: string;
  customer?: {
    email: string;
  };
}

// 定义结账项目类型
export interface CheckoutItem {
  priceId: PriceId;
  quantity: number;
}

// 打开Paddle结账页面
export async function openCheckout(priceId: string) {
  if (!window.Paddle) {
    console.error('Paddle未初始化')
    return
  }

  try {
    // 获取当前用户会话
    const session = await getSession()
    if (!session?.user) {
      console.error('用户未登录')
      return
    }

    // 创建结账配置
    const checkoutConfig: PaddleCheckoutConfig = {
      items: [{ priceId, quantity: 1 }],
      customData: {
        userId: session.user.id
      },
      success_url: `${window.location.origin}/checkout/success?transaction_id={transaction_id}`
    }

    // 如果用户有邮箱，添加到客户信息中
    if (session.user.email) {
      checkoutConfig.customer = {
        email: session.user.email
      }
    }

    console.log('打开Paddle结账:', checkoutConfig)
    window.Paddle.Checkout.open(checkoutConfig)
  } catch (error) {
    console.error('打开Paddle结账失败:', error)
  }
}

// 打开订阅结账页面
export async function openSubscriptionCheckout() {
  const priceId = process.env.NEXT_PUBLIC_PADDLE_MONTHLY_PRICE_ID
  if (!priceId) {
    console.error('缺少订阅价格ID')
    return
  }
  
  try {
    // 获取当前用户会话
    const session = await getSession()
    if (!session?.user) {
      console.error('用户未登录')
      return
    }

    // 创建结账配置
    const checkoutConfig: PaddleCheckoutConfig = {
      items: [{ priceId, quantity: 1 }],
      customData: {
        userId: session.user.id
      },
      success_url: `${window.location.origin}/checkout/success?transaction_id={transaction_id}`
    }

    // 如果用户有邮箱，添加到客户信息中
    if (session.user.email) {
      checkoutConfig.customer = {
        email: session.user.email
      }
    }

    console.log('打开订阅结账:', checkoutConfig)
    window.Paddle.Checkout.open(checkoutConfig)
  } catch (error) {
    console.error('打开订阅结账失败:', error)
  }
}

// 打开点数购买结账页面
export async function openCreditsCheckout(amount: number) {
  let priceId = ''
  
  // 根据点数金额选择对应的价格ID
  switch (amount) {
    case 10:
      priceId = process.env.NEXT_PUBLIC_PADDLE_CREDITS_10_PRICE_ID || ''
      break
    case 100:
      priceId = process.env.NEXT_PUBLIC_PADDLE_CREDITS_100_PRICE_ID || ''
      break
    case 500:
      priceId = process.env.NEXT_PUBLIC_PADDLE_CREDITS_500_PRICE_ID || ''
      break
    case 1000:
      priceId = process.env.NEXT_PUBLIC_PADDLE_CREDITS_1000_PRICE_ID || ''
      break
    default:
      console.error('无效的点数金额')
      return
  }
  
  if (!priceId) {
    console.error(`缺少${amount}点数的价格ID`)
    return
  }
  
  try {
    // 获取当前用户会话
    const session = await getSession()
    if (!session?.user) {
      console.error('用户未登录')
      return
    }

    // 创建结账配置
    const checkoutConfig: PaddleCheckoutConfig = {
      items: [{ priceId, quantity: 1 }],
      customData: {
        userId: session.user.id
      },
      success_url: `${window.location.origin}/checkout/success?transaction_id={transaction_id}`
    }

    // 如果用户有邮箱，添加到客户信息中
    if (session.user.email) {
      checkoutConfig.customer = {
        email: session.user.email
      }
    }

    console.log('打开点数购买结账:', checkoutConfig)
    window.Paddle.Checkout.open(checkoutConfig)
  } catch (error) {
    console.error('打开点数购买结账失败:', error)
  }
}

// 模拟webhook事件（仅用于开发环境测试）
export async function simulateWebhookEvent(eventType: string, userId: string, creditAmount: number = 100) {
  if (process.env.NODE_ENV !== 'development') {
    console.error('此功能仅在开发环境可用')
    return
  }
  
  try {
    const response = await fetch('/api/dev/simulate-webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        eventType,
        userId,
        creditAmount
      }),
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const result = await response.json()
    console.log('模拟webhook结果:', result)
    return result
  } catch (error) {
    console.error('模拟webhook失败:', error)
    throw error
  }
} 