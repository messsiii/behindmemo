import { prisma } from '@/lib/prisma'
import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'

// 验证Webhook签名
const verifyWebhookSignature = (
  payload: string,
  signature: string,
  secret: string
): boolean => {
  try {
    const hmac = crypto.createHmac('sha256', secret)
    const digest = hmac.update(payload).digest('hex')
    return crypto.timingSafeEqual(
      Buffer.from(digest, 'hex'),
      Buffer.from(signature, 'hex')
    )
  } catch (error) {
    console.error('签名验证错误:', error)
    return false
  }
}

export async function POST(req: NextRequest) {
  try {
    // 获取请求体和签名
    const payload = await req.text()
    const signature = req.headers.get('Paddle-Signature') || ''
    const webhookSecret = process.env.PADDLE_WEBHOOK_SECRET || ''

    console.log('收到Paddle webhook请求:', {
      signature: signature.substring(0, 10) + '...',
      hasWebhookSecret: !!webhookSecret,
      headers: Object.fromEntries(req.headers.entries())
    })

    // 在开发环境中，可以跳过签名验证
    const isDevelopment = process.env.NODE_ENV === 'development'
    let isValidSignature = false

    if (isDevelopment && !signature) {
      console.log('开发环境：跳过签名验证')
      isValidSignature = true
    } else {
      // 验证签名
      isValidSignature = verifyWebhookSignature(payload, signature, webhookSecret)
      console.log('签名验证结果:', isValidSignature)
    }

    if (!isValidSignature) {
      console.error('无效的签名')
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      )
    }

    // 解析事件数据
    const eventData = JSON.parse(payload)
    const eventType = eventData.event_type
    const eventId = eventData.event_id

    // 记录事件到日志（不使用数据库）
    console.log(`接收到Paddle事件: ${eventType}, ID: ${eventId}`)
    console.log('事件数据:', JSON.stringify(eventData))

    // 根据事件类型处理不同的逻辑
    switch (eventType) {
      case 'subscription.created':
        await handleSubscriptionCreated(eventData)
        break
      case 'subscription.updated':
        await handleSubscriptionUpdated(eventData)
        break
      case 'subscription.canceled':
        await handleSubscriptionCanceled(eventData)
        break
      case 'transaction.completed':
        await handleTransactionCompleted(eventData)
        break
      case 'customer.created':
        await handleCustomerCreated(eventData)
        break
      // 添加其他事件处理...
      default:
        console.log(`未处理的事件类型: ${eventType}`)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Webhook处理错误:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// 处理订阅创建事件
async function handleSubscriptionCreated(eventData: any) {
  const subscription = eventData.data
  const customerId = subscription.customer_id
  const subscriptionId = subscription.id
  const status = subscription.status
  const priceId = subscription.items[0]?.price.id

  // 查找用户
  const user = await prisma.user.findFirst({
    where: { paddleCustomerId: customerId }
  })

  if (!user) {
    console.error('未找到用户:', customerId)
    return
  }

  // 创建订阅记录
  await prisma.subscription.create({
    data: {
      userId: user.id,
      paddleSubscriptionId: subscriptionId,
      status: status,
      planType: 'monthly', // 根据实际情况设置
      priceId: priceId,
      startedAt: new Date(subscription.current_billing_period.starts_at),
      nextBillingAt: new Date(subscription.current_billing_period.ends_at),
      metadata: subscription
    }
  })

  // 更新用户VIP状态
  await prisma.user.update({
    where: { id: user.id },
    data: {
      isVIP: true,
      vipExpiresAt: new Date(subscription.current_billing_period.ends_at),
      paddleSubscriptionId: subscriptionId,
      paddleSubscriptionStatus: status
    }
  })
}

// 处理订阅更新事件
async function handleSubscriptionUpdated(eventData: any) {
  const subscription = eventData.data
  const subscriptionId = subscription.id
  const status = subscription.status

  // 查找订阅记录
  const subscriptionRecord = await prisma.subscription.findUnique({
    where: { paddleSubscriptionId: subscriptionId },
    include: { user: true }
  })

  if (!subscriptionRecord) {
    console.error('未找到订阅记录:', subscriptionId)
    return
  }

  // 更新订阅记录
  await prisma.subscription.update({
    where: { paddleSubscriptionId: subscriptionId },
    data: {
      status: status,
      nextBillingAt: subscription.current_billing_period?.ends_at
        ? new Date(subscription.current_billing_period.ends_at)
        : undefined,
      canceledAt: subscription.canceled_at
        ? new Date(subscription.canceled_at)
        : undefined,
      metadata: subscription
    }
  })

  // 更新用户VIP状态
  if (status === 'active') {
    await prisma.user.update({
      where: { id: subscriptionRecord.userId },
      data: {
        isVIP: true,
        vipExpiresAt: subscription.current_billing_period?.ends_at
          ? new Date(subscription.current_billing_period.ends_at)
          : null,
        paddleSubscriptionStatus: status
      }
    })
  } else if (status === 'canceled' || status === 'paused') {
    // 如果订阅被取消或暂停，保留VIP直到当前计费周期结束
    await prisma.user.update({
      where: { id: subscriptionRecord.userId },
      data: {
        vipExpiresAt: subscription.current_billing_period?.ends_at
          ? new Date(subscription.current_billing_period.ends_at)
          : null,
        paddleSubscriptionStatus: status
      }
    })
  }
}

// 处理订阅取消事件
async function handleSubscriptionCanceled(eventData: any) {
  const subscription = eventData.data
  const subscriptionId = subscription.id

  // 查找订阅记录
  const subscriptionRecord = await prisma.subscription.findUnique({
    where: { paddleSubscriptionId: subscriptionId },
    include: { user: true }
  })

  if (!subscriptionRecord) {
    console.error('未找到订阅记录:', subscriptionId)
    return
  }

  // 更新订阅记录
  await prisma.subscription.update({
    where: { paddleSubscriptionId: subscriptionId },
    data: {
      status: 'canceled',
      canceledAt: new Date(),
      endedAt: subscription.current_billing_period?.ends_at
        ? new Date(subscription.current_billing_period.ends_at)
        : new Date(),
      metadata: subscription
    }
  })

  // 更新用户VIP状态（保留VIP直到当前计费周期结束）
  await prisma.user.update({
    where: { id: subscriptionRecord.userId },
    data: {
      vipExpiresAt: subscription.current_billing_period?.ends_at
        ? new Date(subscription.current_billing_period.ends_at)
        : new Date(),
      paddleSubscriptionStatus: 'canceled'
    }
  })
}

// 处理交易完成事件
async function handleTransactionCompleted(eventData: any) {
  const transaction = eventData.data
  const customerId = transaction.customer_id
  const transactionId = transaction.id
  const status = transaction.status
  const items = transaction.items || []
  
  console.log('处理交易完成事件:', {
    transactionId,
    customerId,
    status,
    items: JSON.stringify(items)
  })
  
  // 查找用户
  const user = await prisma.user.findFirst({
    where: { paddleCustomerId: customerId }
  })

  if (!user) {
    console.error('未找到用户:', customerId)
    return
  }

  console.log('找到用户:', {
    userId: user.id,
    email: user.email,
    currentCredits: user.credits
  })

  // 创建交易记录
  await prisma.transaction.create({
    data: {
      userId: user.id,
      paddleOrderId: transactionId,
      type: transaction.subscription_id ? 'subscription_payment' : 'one_time_purchase',
      status: status,
      amount: parseFloat(transaction.details.totals.total),
      currency: transaction.details.totals.currency_code,
      paddleSubscriptionId: transaction.subscription_id,
      pointsAdded: getCreditAmount(items),
      updatedAt: new Date()
    }
  })

  // 如果是点数购买，更新用户点数
  if (!transaction.subscription_id) {
    const creditAmount = getCreditAmount(items)
    console.log('计算点数金额:', {
      creditAmount,
      items: JSON.stringify(items)
    })
    
    if (creditAmount > 0) {
      console.log('更新用户点数:', {
        userId: user.id,
        currentCredits: user.credits,
        addingCredits: creditAmount
      })
      
      await prisma.user.update({
        where: { id: user.id },
        data: {
          credits: { increment: creditAmount }
        }
      })
      
      console.log('点数更新完成')
    } else {
      console.error('无法确定点数金额，未更新用户点数')
    }
  }
}

// 获取购买的点数数量
function getCreditAmount(items: any[]): number {
  // 这里需要根据你的价格ID和点数包对应关系来实现
  // 示例实现
  console.log('计算点数金额，价格ID:', {
    CREDITS_10: process.env.NEXT_PUBLIC_PADDLE_CREDITS_10_PRICE_ID,
    CREDITS_100: process.env.NEXT_PUBLIC_PADDLE_CREDITS_100_PRICE_ID,
    CREDITS_500: process.env.NEXT_PUBLIC_PADDLE_CREDITS_500_PRICE_ID,
    CREDITS_1000: process.env.NEXT_PUBLIC_PADDLE_CREDITS_1000_PRICE_ID
  })
  
  for (const item of items) {
    const priceId = item.price.id
    console.log('检查价格ID:', priceId)
    
    // 根据价格ID判断点数包
    if (priceId === process.env.NEXT_PUBLIC_PADDLE_CREDITS_10_PRICE_ID) {
      return 10
    } else if (priceId === process.env.NEXT_PUBLIC_PADDLE_CREDITS_100_PRICE_ID) {
      return 100
    } else if (priceId === process.env.NEXT_PUBLIC_PADDLE_CREDITS_500_PRICE_ID) {
      return 500
    } else if (priceId === process.env.NEXT_PUBLIC_PADDLE_CREDITS_1000_PRICE_ID) {
      return 1000
    }
  }
  
  return 0
}

// 处理客户创建事件
async function handleCustomerCreated(eventData: any) {
  const customer = eventData.data
  const customerId = customer.id
  const customerEmail = customer.email
  const customData = customer.custom_data || {}
  const userId = customData.userId
  
  console.log(`处理客户创建事件: ${customerId}, 邮箱: ${customerEmail}, 用户ID: ${userId}`)
  
  // 如果有用户ID，直接通过ID查找用户
  if (userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })
    
    if (user) {
      // 更新用户的Paddle客户ID
      await prisma.user.update({
        where: { id: userId },
        data: { paddleCustomerId: customerId }
      })
      console.log(`已将Paddle客户ID ${customerId} 关联到用户 ${userId}`)
      return
    }
  }
  
  // 如果没有用户ID或找不到用户，尝试通过邮箱查找
  if (customerEmail) {
    const user = await prisma.user.findUnique({
      where: { email: customerEmail }
    })
    
    if (user) {
      // 更新用户的Paddle客户ID
      await prisma.user.update({
        where: { id: user.id },
        data: { paddleCustomerId: customerId }
      })
      console.log(`已将Paddle客户ID ${customerId} 关联到邮箱为 ${customerEmail} 的用户`)
      return
    }
  }
  
  console.error(`无法找到与Paddle客户关联的用户: ${customerId}, 邮箱: ${customerEmail}`)
} 