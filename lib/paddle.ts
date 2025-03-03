// Paddle客户端工具函数
import axios from 'axios';
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
  locale?: string; // 添加语言设置选项
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

    // 获取用户当前语言设置
    const userLanguage = localStorage.getItem('preferred_language') || 'zh'
    // 将语言转换为Paddle支持的locale格式
    const localeMap: Record<string, string> = {
      'zh': 'zh-CN', // 简体中文
      'en': 'en'     // 英文
    }
    const locale = localeMap[userLanguage] || 'zh-CN'

    // 创建结账配置
    const checkoutConfig: PaddleCheckoutConfig = {
      items: [{ priceId, quantity: 1 }],
      customData: {
        userId: session.user.id
      },
      success_url: `${window.location.origin}/checkout/success?transaction_id={transaction_id}`,
      locale: locale // 设置结账窗口的语言
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

    // 获取用户当前语言设置
    const userLanguage = localStorage.getItem('preferred_language') || 'zh'
    // 将语言转换为Paddle支持的locale格式
    const localeMap: Record<string, string> = {
      'zh': 'zh-CN', // 简体中文
      'en': 'en'     // 英文
    }
    const locale = localeMap[userLanguage] || 'zh-CN'

    // 创建结账配置
    const checkoutConfig: PaddleCheckoutConfig = {
      items: [{ priceId, quantity: 1 }],
      customData: {
        userId: session.user.id
      },
      success_url: `${window.location.origin}/checkout/success?transaction_id={transaction_id}`,
      locale: locale // 设置结账窗口的语言
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

    // 获取用户当前语言设置
    const userLanguage = localStorage.getItem('preferred_language') || 'zh'
    // 将语言转换为Paddle支持的locale格式
    const localeMap: Record<string, string> = {
      'zh': 'zh-CN', // 简体中文
      'en': 'en'     // 英文
    }
    const locale = localeMap[userLanguage] || 'zh-CN'

    // 创建结账配置
    const checkoutConfig: PaddleCheckoutConfig = {
      items: [{ priceId, quantity: 1 }],
      customData: {
        userId: session.user.id
      },
      success_url: `${window.location.origin}/checkout/success?transaction_id={transaction_id}`,
      locale: locale // 设置结账窗口的语言
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

export class PaddleClient {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    // 生产环境模式 - 移除开发/生产环境的动态判断，直接使用生产环境 URL
    this.baseUrl = process.env.PADDLE_API_URL || 'https://api.paddle.com';
    this.apiKey = process.env.PADDLE_API_KEY || '';
    
    if (!this.apiKey) {
      console.warn('Paddle API密钥未设置，API调用可能会失败');
    }
    
    console.log(`Paddle客户端初始化: 使用生产环境 URL=${this.baseUrl}`);
  }

  /**
   * 获取当前使用的API基础URL
   * @returns API基础URL字符串
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * 取消订阅
   * @param subscriptionId Paddle订阅ID
   * @param effectiveFrom 取消生效时间，可以是'immediately'或'next_billing_period'
   */
  async cancelSubscription(subscriptionId: string, effectiveFrom: 'immediately' | 'next_billing_period' = 'next_billing_period') {
    try {
      const url = `${this.baseUrl}/subscriptions/${subscriptionId}/cancel`;
      
      // 添加调试信息
      console.log(`尝试取消订阅: ${subscriptionId}，生效时间: ${effectiveFrom}`);
      console.log(`API URL: ${url}`);
      
      // 检查环境变量
      if (!this.apiKey) {
        throw new Error('缺少Paddle API密钥配置，请检查环境变量');
      }
      
      const headers = {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      };
      
      const data = {
        effective_from: effectiveFrom
      };
      
      // 调用 API
      const response = await axios.post(url, data, { headers });
      console.log('Paddle API响应成功:', response.status);
      return response.data;
    } catch (error) {
      console.error('取消订阅时出错:', error);
      throw error;
    }
  }
} 