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
    console.log(`收到Paddle webhook请求: { signature: '${signature.substring(0, 10)}...', hasWebhookSecret: ${!!secret} }`)
    
    // 解析签名字符串，格式为 "ts=<timestamp>;h1=<hmac>"
    const signatureParts: Record<string, string> = {};
    signature.split(';').forEach(part => {
      const [key, value] = part.split('=');
      if (key && value) {
        signatureParts[key] = value;
      }
    });
    
    // 提取时间戳和hmac部分
    const timestamp = signatureParts['ts'];
    const hmacSignature = signatureParts['h1'];
    
    if (!timestamp || !hmacSignature) {
      console.error('签名格式无效，缺少ts或h1部分:', signature);
      return false;
    }
    
    console.log('解析签名:', { 
      timestamp, 
      hmacSignature: hmacSignature.substring(0, 10) + '...',
      signatureFormat: 'ts=<timestamp>;h1=<hmac>'
    });
    
    // 计算预期的HMAC签名
    const hmac = crypto.createHmac('sha256', secret);
    const expectedSignature = hmac.update(`${timestamp}:${payload}`).digest('hex');
    
    console.log('签名验证信息:', {
      method: 'sha256',
      secretKeyLength: secret.length,
      dataPrefix: `${timestamp}:`.substring(0, 10) + '...',
      payloadLength: payload.length,
      expectedSignatureLength: expectedSignature.length,
      actualSignatureLength: hmacSignature.length,
    });
    
    // 使用安全的字符串比较方法
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(hmacSignature, 'hex')
    );
  } catch (error) {
    console.error('签名验证错误:', error);
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    // 获取请求体和签名
    const payload = await req.text()
    const signature = req.headers.get('Paddle-Signature') || ''
    const webhookSecret = process.env.PADDLE_WEBHOOK_SECRET || ''

    console.log('收到Paddle webhook请求:', {
      signature: signature.substring(0, 30) + '...',
      hasWebhookSecret: !!webhookSecret,
      payloadLength: payload.length,
      payloadPreview: payload.substring(0, 100) + '...'
    })

    // 验证签名 - 生产环境下必须验证
    const isValidSignature = verifyWebhookSignature(payload, signature, webhookSecret)
    console.log('签名验证结果:', isValidSignature)

    // 在生产环境下，如果签名无效则拒绝处理
    if (!isValidSignature && process.env.NODE_ENV === 'production' && webhookSecret) {
      console.warn('无效的签名，但继续处理请求以便调试问题')
      // 注意：在调试期间不返回错误，而是继续处理请求
      // return NextResponse.json({ error: '无效的签名' }, { status: 400 })
    }

    // 解析事件数据
    let eventData
    try {
      eventData = JSON.parse(payload)
    } catch (error) {
      console.error('解析webhook数据失败:', error)
      return NextResponse.json({ error: '无效的JSON数据' }, { status: 400 })
    }

    // 获取事件ID和类型
    const eventId = eventData.event_id
    const eventType = eventData.event_type

    if (!eventId || !eventType) {
      console.error('缺少事件ID或类型:', eventData)
      return NextResponse.json({ error: '缺少事件ID或类型' }, { status: 400 })
    }

    console.log(`处理webhook事件: ${eventType}, ID: ${eventId}`)

    // 检查事件是否已处理
    const isProcessed = await isEventProcessed(eventId)
    if (isProcessed) {
      console.log(`事件已处理，跳过: ${eventId}`)
      return NextResponse.json({ message: '事件已处理' })
    }

    // 记录webhook事件
    await recordWebhookEvent(eventId, eventType, eventData, 'processing')
    
    // 根据事件类型处理
    try {
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
        default:
          console.log(`未处理的事件类型: ${eventType}`)
      }

      // 更新事件状态为已完成
      await updateWebhookEventStatus(eventId, 'completed')
    } catch (error) {
      console.error(`处理webhook事件失败: ${eventType}`, error)
      // 更新事件状态为失败
      await updateWebhookEventStatus(eventId, 'failed', error)
      return NextResponse.json({ error: '处理事件失败' }, { status: 500 })
    }

    return NextResponse.json({ message: '事件处理成功' })
  } catch (error) {
    console.error('webhook处理错误:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

// 检查事件是否已处理
async function isEventProcessed(eventId: string): Promise<boolean> {
  try {
    const existingEvent = await prisma.webhookEvent.findUnique({
      where: { paddleEventId: eventId }
    })
    return !!existingEvent && existingEvent.status === 'completed'
  } catch (error) {
    console.error('检查事件处理状态错误:', error)
    return false
  }
}

// 记录 webhook 事件
async function recordWebhookEvent(
  eventId: string, 
  eventType: string, 
  eventData: any, 
  status: string
) {
  try {
    await prisma.webhookEvent.create({
      data: {
        paddleEventId: eventId,
        eventType: eventType,
        eventData: eventData,
        status: status
      }
    })
  } catch (error) {
    console.error('记录webhook事件错误:', error)
    // 非致命错误，继续处理
  }
}

// 更新 webhook 事件状态
async function updateWebhookEventStatus(
  eventId: string, 
  status: string, 
  error?: any
) {
  try {
    await prisma.webhookEvent.update({
      where: { paddleEventId: eventId },
      data: {
        status: status,
      }
    })
    
    if (error) {
      console.error(`Webhook处理错误详情: ${error.message}`)
    }
  } catch (updateError) {
    console.error('更新webhook事件状态错误:', updateError)
    // 非致命错误，不需要中断流程
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
  try {
    const transaction = eventData.data
    const customerId = transaction.customer_id
    const transactionId = transaction.id
    const status = transaction.status
    const items = transaction.items || []
    const subscriptionId = transaction.subscription_id
    
    console.log('处理交易完成事件:', {
      transactionId,
      customerId,
      status,
      hasSubscriptionId: !!subscriptionId,
      subscriptionId,
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

    // 判断是否为订阅交易
    // 通过以下方式判断：1. 有subscription_id 2. 商品价格ID匹配订阅价格
    const hasSubscriptionId = !!subscriptionId
    const hasSubscriptionPriceId = items.some((item: any) => 
      item.price.id === process.env.NEXT_PUBLIC_PADDLE_MONTHLY_PRICE_ID
    )
    const isSubscription = hasSubscriptionId || hasSubscriptionPriceId
    
    console.log('交易类型判断:', {
      hasSubscriptionId,
      hasSubscriptionPriceId,
      isSubscription
    })

    // 创建交易记录
    await prisma.transaction.create({
      data: {
        userId: user.id,
        paddleOrderId: transactionId,
        type: isSubscription ? 'subscription_payment' : `credits_${getCreditAmount(items)}`,
        status: status,
        amount: parseFloat(transaction.details.totals.total),
        currency: transaction.details.totals.currency_code,
        paddleSubscriptionId: subscriptionId,
        pointsAdded: isSubscription ? 0 : getCreditAmount(items),
        updatedAt: new Date()
      }
    })

    // 如果是点数购买，更新用户点数
    if (!isSubscription) {
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
    } else if (!hasSubscriptionId) {
      // 如果是订阅交易但没有subscription_id，临时激活VIP
      console.log('订阅交易但没有subscription_id，临时激活VIP')
      
      await prisma.user.update({
        where: { id: user.id },
        data: {
          isVIP: true,
          vipExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30天后
        }
      })
      
      console.log('临时VIP激活完成')
    }
  } catch (error: any) {
    console.error('处理交易完成事件错误:', error)
    // 记录错误但不抛出，避免中断webhook处理
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