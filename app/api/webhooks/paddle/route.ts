import { logPaddleOperation } from '@/lib/paddle-api'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'

// 验证Webhook签名
const verifyWebhookSignature = (
  payload: string,
  signatureHeader: string,
  secret: string
): boolean => {
  try {
    if (!payload || !signatureHeader || !secret) {
      console.error('缺少必要参数:', {
        hasPayload: !!payload,
        hasSignature: !!signatureHeader,
        hasSecret: !!secret
      })
      return false
    }
    
    // 记录详细信息以便调试
    console.log('验证签名 - 原始签名头:', signatureHeader)
    console.log('签名密钥长度:', secret.length)
    
    // 如果签名头包含时间戳格式（t=timestamp,s=signature）
    let signature = signatureHeader
    if (signatureHeader.includes(',s=')) {
      const matches = signatureHeader.match(/s=([a-zA-Z0-9]+)/)
      if (matches && matches[1]) {
        signature = matches[1]
      }
    }
    
    console.log('提取的签名值:', signature)
    
    // 计算HMAC签名
    const hmac = crypto.createHmac('sha256', secret)
    const calculatedSignature = hmac.update(payload).digest('hex')
    
    console.log('计算的签名值前10位:', calculatedSignature.substring(0, 10))
    
    // 不区分大小写比较
    const isValid = signature.toLowerCase() === calculatedSignature.toLowerCase()
    
    logPaddleOperation('签名验证详情', {
      receivedSignature: signature.substring(0, 10) + '...',
      calculatedSignature: calculatedSignature.substring(0, 10) + '...',
      signatureLength: signature.length,
      digestLength: calculatedSignature.length,
      payloadLength: payload.length,
      secretLength: secret.length,
      isValid: isValid
    })
    
    return isValid
  } catch (error) {
    console.error('签名验证过程出错:', error)
    return false
  }
}

// 确保webhook处理是幂等的，无论处理多少次结果都一致
export async function POST(req: NextRequest) {
  // 获取请求体和签名
  let payload = '';
  let eventData: any = null;
  let eventType = '';
  let eventId = '';

  try {
    payload = await req.text()
    const signatureHeader = req.headers.get('Paddle-Signature') || ''
    const webhookSecret = process.env.PADDLE_WEBHOOK_SECRET || ''

    logPaddleOperation('收到Paddle webhook请求', {
      url: req.url,
      method: req.method,
      signature: signatureHeader ? (signatureHeader.substring(0, 10) + '...') : 'missing',
      hasWebhookSecret: !!webhookSecret,
      contentType: req.headers.get('content-type'),
      payloadLength: payload.length,
    })

    // 解析事件数据
    try {
      eventData = JSON.parse(payload)
      eventType = eventData.event_type
      eventId = eventData.event_id
      
      logPaddleOperation('Webhook事件信息', {
        eventType,
        eventId,
        dataPreview: JSON.stringify(eventData).substring(0, 200) + '...'
      })
      
      // 存储原始事件数据，无论签名是否验证成功
      await prisma.webhookEvent.upsert({
        where: { paddleEventId: eventId },
        update: {
          eventType: eventType,
          eventData: eventData,
          // 如果状态已经是completed，保持不变
          status: {
            set: await isEventStatusCompleted(eventId) ? 'completed' : 'pending'
          }
        },
        create: {
          paddleEventId: eventId,
          eventType: eventType,
          eventData: eventData,
          status: 'pending',
        }
      })
      
      logPaddleOperation('存储Webhook事件', { eventId, eventType })
    } catch (parseError) {
      console.error('事件数据解析错误:', parseError)
      console.log('原始载荷预览:', payload.substring(0, 200))
      return NextResponse.json(
        { error: 'Invalid payload format' },
        { status: 400 }
      )
    }

    // 验证签名 - 生产环境下必须验证
    const isValidSignature = verifyWebhookSignature(payload, signatureHeader, webhookSecret)
    logPaddleOperation('签名验证结果', { isValid: isValidSignature })

    if (!isValidSignature) {
      console.error('无效的签名')
      
      // 更新事件状态为签名验证失败
      if (eventId) {
        await updateWebhookEventStatus(
          eventId,
          'signature_failed',
          new Error('签名验证失败')
        )
      }
      
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      )
    }

    // 检查是否已处理过该事件
    const isProcessed = await isEventProcessed(eventId)
    if (isProcessed) {
      logPaddleOperation('事件已处理，跳过', { eventId })
      return NextResponse.json({ success: true, message: 'Event already processed' })
    }

    // 记录事件开始处理
    await updateWebhookEventStatus(eventId, 'processing')

    try {
      // 使用事务包装事件处理，确保原子性
      await prisma.$transaction(async (tx) => {
        // 根据事件类型处理不同的逻辑
        switch (eventType) {
          case 'subscription.created':
            await handleSubscriptionCreated(eventData, tx)
            break
          case 'subscription.updated':
            await handleSubscriptionUpdated(eventData, tx)
            break
          case 'subscription.canceled':
            await handleSubscriptionCanceled(eventData, tx)
            break
          case 'transaction.completed':
            await handleTransactionCompleted(eventData, tx)
            break
          case 'customer.created':
            await handleCustomerCreated(eventData, tx)
            break
          // 添加其他事件处理...
          default:
            logPaddleOperation('未处理的事件类型', { eventType })
        }
      }, {
        // 事务配置
        maxWait: 5000, // 最长等待时间
        timeout: 10000 // 事务超时时间
      })

      // 更新事件状态为已完成
      await updateWebhookEventStatus(eventId, 'completed')
      return NextResponse.json({ success: true })
    } catch (error) {
      console.error(`处理 ${eventType} 事件错误:`, error)
      // 更新事件状态为失败
      await updateWebhookEventStatus(eventId, 'failed', error)
      // 返回 200 状态码，避免 Paddle 重试
      return NextResponse.json({ 
        success: false, 
        error: `Error processing ${eventType} event` 
      })
    }
  } catch (error) {
    console.error('Webhook处理错误:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
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

// 检查事件状态是否为completed
async function isEventStatusCompleted(eventId: string): Promise<boolean> {
  try {
    const existingEvent = await prisma.webhookEvent.findUnique({
      where: { paddleEventId: eventId }
    })
    return !!existingEvent && existingEvent.status === 'completed'
  } catch (error) {
    return false
  }
}

// 更新 webhook 事件状态
async function updateWebhookEventStatus(
  eventId: string, 
  status: string, 
  error?: any
) {
  try {
    const data: any = { status }
    
    if (error) {
      data.error = error instanceof Error ? error.message : String(error)
      data.processedAt = new Date()
    } else if (status === 'completed') {
      data.processedAt = new Date()
    }
    
    await prisma.webhookEvent.update({
      where: { paddleEventId: eventId },
      data
    })
    
    if (error) {
      logPaddleOperation('Webhook处理错误', { 
        eventId, 
        status, 
        error: data.error 
      })
    } else {
      logPaddleOperation('Webhook状态更新', { eventId, status })
    }
  } catch (updateError) {
    console.error('更新webhook事件状态错误:', updateError)
    // 非致命错误，不需要中断流程
  }
}

// 处理订阅创建事件
async function handleSubscriptionCreated(eventData: any, prismaClient: any) {
  const subscription = eventData.data
  const customerId = subscription.customer_id
  const subscriptionId = subscription.id
  const status = subscription.status
  const priceId = subscription.items[0]?.price.id

  logPaddleOperation('处理订阅创建事件', { 
    subscriptionId,
    customerId,
    status
  })

  // 查找用户
  const user = await prismaClient.user.findFirst({
    where: { paddleCustomerId: customerId }
  })

  if (!user) {
    logPaddleOperation('未找到用户', { customerId })
    return
  }

  // 创建订阅记录 - 使用upsert确保幂等性
  await prismaClient.subscription.upsert({
    where: { paddleSubscriptionId: subscriptionId },
    update: {
      status: status,
      startedAt: new Date(subscription.current_billing_period.starts_at),
      nextBillingAt: new Date(subscription.current_billing_period.ends_at),
      metadata: subscription
    },
    create: {
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
  await prismaClient.user.update({
    where: { id: user.id },
    data: {
      isVIP: true,
      vipExpiresAt: new Date(subscription.current_billing_period.ends_at),
      paddleSubscriptionId: subscriptionId,
      paddleSubscriptionStatus: status
    }
  })
  
  logPaddleOperation('订阅创建处理完成', { 
    userId: user.id,
    subscriptionId
  })
}

// 处理订阅更新事件
async function handleSubscriptionUpdated(eventData: any, prismaClient: any) {
  const subscription = eventData.data
  const subscriptionId = subscription.id
  const status = subscription.status

  logPaddleOperation('处理订阅更新事件', { 
    subscriptionId,
    status
  })

  // 查找订阅记录
  const subscriptionRecord = await prismaClient.subscription.findUnique({
    where: { paddleSubscriptionId: subscriptionId },
    include: { user: true }
  })

  if (!subscriptionRecord) {
    logPaddleOperation('未找到订阅记录', { subscriptionId })
    return
  }

  // 更新订阅记录
  await prismaClient.subscription.update({
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
    await prismaClient.user.update({
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
    await prismaClient.user.update({
      where: { id: subscriptionRecord.userId },
      data: {
        vipExpiresAt: subscription.current_billing_period?.ends_at
          ? new Date(subscription.current_billing_period.ends_at)
          : null,
        paddleSubscriptionStatus: status
      }
    })
  }
  
  logPaddleOperation('订阅更新处理完成', { 
    userId: subscriptionRecord.userId,
    status
  })
}

// 处理订阅取消事件
async function handleSubscriptionCanceled(eventData: any, prismaClient: any) {
  const subscription = eventData.data
  const subscriptionId = subscription.id

  logPaddleOperation('处理订阅取消事件', { subscriptionId })

  // 查找订阅记录
  const subscriptionRecord = await prismaClient.subscription.findUnique({
    where: { paddleSubscriptionId: subscriptionId },
    include: { user: true }
  })

  if (!subscriptionRecord) {
    logPaddleOperation('未找到订阅记录', { subscriptionId })
    return
  }

  // 更新订阅记录
  await prismaClient.subscription.update({
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
  await prismaClient.user.update({
    where: { id: subscriptionRecord.userId },
    data: {
      vipExpiresAt: subscription.current_billing_period?.ends_at
        ? new Date(subscription.current_billing_period.ends_at)
        : new Date(),
      paddleSubscriptionStatus: 'canceled'
    }
  })
  
  logPaddleOperation('订阅取消处理完成', { 
    userId: subscriptionRecord.userId
  })
}

// 处理交易完成事件
async function handleTransactionCompleted(eventData: any, prismaClient: any) {
  const transaction = eventData.data
  const customerId = transaction.customer_id
  const transactionId = transaction.id
  const status = transaction.status
  const items = transaction.items || []
  
  logPaddleOperation('处理交易完成事件', {
    transactionId,
    customerId,
    status
  })
  
  // 查找用户
  const user = await prismaClient.user.findFirst({
    where: { paddleCustomerId: customerId }
  })

  if (!user) {
    logPaddleOperation('未找到用户', { customerId })
    return
  }

  logPaddleOperation('找到用户', {
    userId: user.id,
    email: user.email,
    currentCredits: user.credits
  })

  // 创建交易记录 - 使用upsert确保幂等性
  const tx = await prismaClient.transaction.upsert({
    where: { paddleOrderId: transactionId },
    update: {
      status: status,
      updatedAt: new Date()
    },
    create: {
      userId: user.id,
      paddleOrderId: transactionId,
      type: transaction.subscription_id ? 'subscription_payment' : 'one_time_purchase',
      status: status,
      amount: parseFloat(transaction.details.totals.total),
      currency: transaction.details.totals.currency_code,
      paddleSubscriptionId: transaction.subscription_id,
      pointsAdded: transaction.subscription_id ? null : getCreditAmount(items),
      updatedAt: new Date()
    }
  })

  // 如果是点数购买，并且是新创建的交易（而非更新），更新用户点数
  if (!transaction.subscription_id && tx.pointsAdded) {
    const creditAmount = tx.pointsAdded
    logPaddleOperation('更新用户点数', {
      userId: user.id,
      currentCredits: user.credits,
      addingCredits: creditAmount
    })
    
    await prismaClient.user.update({
      where: { id: user.id },
      data: {
        credits: { increment: creditAmount }
      }
    })
    
    logPaddleOperation('点数更新完成', {
      userId: user.id,
      creditAmount
    })
  }
}

// 获取购买的点数数量
function getCreditAmount(items: any[]): number {
  // 这里需要根据你的价格ID和点数包对应关系来实现
  // 示例实现
  logPaddleOperation('计算点数金额，价格ID', {
    CREDITS_10: process.env.NEXT_PUBLIC_PADDLE_CREDITS_10_PRICE_ID,
    CREDITS_100: process.env.NEXT_PUBLIC_PADDLE_CREDITS_100_PRICE_ID,
    CREDITS_500: process.env.NEXT_PUBLIC_PADDLE_CREDITS_500_PRICE_ID,
    CREDITS_1000: process.env.NEXT_PUBLIC_PADDLE_CREDITS_1000_PRICE_ID
  })
  
  for (const item of items) {
    const priceId = item.price.id
    
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
async function handleCustomerCreated(eventData: any, prismaClient: any) {
  const customer = eventData.data
  const customerId = customer.id
  const customerEmail = customer.email
  const customData = customer.custom_data || {}
  const userId = customData.userId
  
  logPaddleOperation('处理客户创建事件', { 
    customerId, 
    customerEmail, 
    userId 
  })
  
  // 如果有用户ID，直接通过ID查找用户
  if (userId) {
    const user = await prismaClient.user.findUnique({
      where: { id: userId }
    })
    
    if (user) {
      // 更新用户的Paddle客户ID
      await prismaClient.user.update({
        where: { id: userId },
        data: { paddleCustomerId: customerId }
      })
      logPaddleOperation('已关联Paddle客户ID到用户', { 
        userId, 
        customerId 
      })
      return
    }
  }
  
  // 如果没有用户ID或找不到用户，尝试通过邮箱查找
  if (customerEmail) {
    const user = await prismaClient.user.findUnique({
      where: { email: customerEmail }
    })
    
    if (user) {
      // 更新用户的Paddle客户ID
      await prismaClient.user.update({
        where: { id: user.id },
        data: { paddleCustomerId: customerId }
      })
      logPaddleOperation('已关联Paddle客户ID到邮箱用户', { 
        email: customerEmail, 
        userId: user.id, 
        customerId 
      })
      return
    }
  }
  
  logPaddleOperation('无法找到与Paddle客户关联的用户', { 
    customerId, 
    customerEmail 
  })
} 