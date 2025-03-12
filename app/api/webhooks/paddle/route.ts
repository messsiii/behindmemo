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
    
    // 1. 解析 Paddle-Signature 头部，提取时间戳和签名值
    // 格式通常是: ts=1671552777;h1=eb4d0dc8853be92b7f063b9f3ba5233eb920a09459b6e6b2c26705b4364db151
    const parts = signatureHeader.split(';')
    let timestamp = ''
    let signature = ''
    
    for (const part of parts) {
      if (part.startsWith('ts=')) {
        timestamp = part.substring(3)
      } else if (part.startsWith('h1=')) {
        signature = part.substring(3)
      }
    }
    
    if (!timestamp || !signature) {
      console.error('无法从签名头中提取时间戳或签名值:', signatureHeader)
      return false
    }
    
    console.log('提取的时间戳:', timestamp)
    console.log('提取的签名值:', signature)
    
    // 2. 构建签名有效载荷: 时间戳 + ":" + 原始请求体
    const signedPayload = `${timestamp}:${payload}`
    
    // 3. 使用HMAC-SHA256计算签名
    const hmac = crypto.createHmac('sha256', secret)
    const calculatedSignature = hmac.update(signedPayload).digest('hex')
    
    console.log('计算的签名值前10位:', calculatedSignature.substring(0, 10))
    
    // 4. 不区分大小写比较签名
    const isValid = signature.toLowerCase() === calculatedSignature.toLowerCase()
    
    logPaddleOperation('签名验证详情', {
      timestamp,
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

  // 尝试通过客户ID查找用户
  let user = await prismaClient.user.findFirst({
    where: { paddleCustomerId: customerId }
  })

  // 如果通过客户ID找不到用户，尝试获取客户详情并通过邮箱查找
  if (!user) {
    // 记录未找到用户信息
    logPaddleOperation('通过Paddle客户ID未找到用户，尝试获取客户信息', { customerId })
    
    // 尝试从订阅数据中获取客户信息
    try {
      let customerEmail = null
      
      // 尝试获取客户详情中的邮箱
      if (subscription.customer && subscription.customer.email) {
        customerEmail = subscription.customer.email
      }
      
      if (customerEmail) {
        logPaddleOperation('从订阅数据中获取到客户邮箱', { customerEmail })
        
        // 通过邮箱查找用户
        user = await prismaClient.user.findUnique({
          where: { email: customerEmail }
        })
        
        if (user) {
          logPaddleOperation('通过邮箱找到用户', { 
            userId: user.id, 
            email: customerEmail 
          })
          
          // 更新用户的Paddle客户ID
          await prismaClient.user.update({
            where: { id: user.id },
            data: { paddleCustomerId: customerId }
          })
          
          logPaddleOperation('已更新用户的Paddle客户ID', { 
            userId: user.id, 
            paddleCustomerId: customerId 
          })
        }
      }
    } catch (error) {
      logPaddleOperation('获取客户详情失败', { 
        error: error instanceof Error ? error.message : String(error) 
      })
    }
  }

  if (!user) {
    logPaddleOperation('未找到用户，无法处理订阅创建', { 
      customerId,
      subscriptionId 
    })
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
  const customerId = subscription.customer_id
  const status = subscription.status
  const canceledAt = subscription.canceled_at
  
  // 检查是否有计划的取消操作（下一周期取消）
  const scheduledChange = subscription.scheduled_change
  const hasScheduledCancel = scheduledChange && scheduledChange.action === 'cancel'
  const scheduledCancelDate = hasScheduledCancel ? scheduledChange.effective_at : null
  const nextBilledAt = subscription.next_billed_at
  
  // 综合判断是否取消
  const isCanceled = !!canceledAt || hasScheduledCancel
  const cancelReason = canceledAt ? 'immediate' : (hasScheduledCancel ? 'scheduled' : null)

  // 日志记录更多信息
  logPaddleOperation('处理订阅更新事件', { 
    subscriptionId,
    customerId,
    status,
    isCanceled,
    cancelReason,
    canceledAt: canceledAt || '未立即取消',
    hasScheduledCancel,
    scheduledCancelDate: scheduledCancelDate || '无计划取消',
    nextBilledAt: nextBilledAt || '无下次计费',
    currentBillingPeriodStarts: subscription.current_billing_period?.starts_at || '未知',
    currentBillingPeriodEnds: subscription.current_billing_period?.ends_at || '未知'
  })

  // 查找订阅记录
  let subscriptionRecord = await prismaClient.subscription.findUnique({
    where: { paddleSubscriptionId: subscriptionId },
    include: { user: true }
  })

  // 如果找不到订阅记录但有客户ID，尝试查找用户并创建订阅记录
  if (!subscriptionRecord && customerId) {
    logPaddleOperation('未找到订阅记录，尝试通过客户ID查找用户', { 
      subscriptionId, 
      customerId 
    })

    // 尝试通过客户ID查找用户
    let user = await prismaClient.user.findFirst({
      where: { paddleCustomerId: customerId }
    })

    // 如果通过客户ID找不到用户，尝试通过邮箱查找
    if (!user) {
      try {
        let customerEmail = null
        
        // 尝试获取客户详情中的邮箱
        if (subscription.customer && subscription.customer.email) {
          customerEmail = subscription.customer.email
        }
        
        if (customerEmail) {
          logPaddleOperation('从订阅数据中获取到客户邮箱', { customerEmail })
          
          // 通过邮箱查找用户
          user = await prismaClient.user.findUnique({
            where: { email: customerEmail }
          })
          
          if (user) {
            logPaddleOperation('通过邮箱找到用户', { 
              userId: user.id, 
              email: customerEmail 
            })
            
            // 更新用户的Paddle客户ID
            await prismaClient.user.update({
              where: { id: user.id },
              data: { paddleCustomerId: customerId }
            })
            
            logPaddleOperation('已更新用户的Paddle客户ID', { 
              userId: user.id, 
              paddleCustomerId: customerId 
            })
          }
        }
      } catch (error) {
        logPaddleOperation('获取客户详情失败', { 
          error: error instanceof Error ? error.message : String(error) 
        })
      }
    }

    // 如果找到用户，创建新的订阅记录
    if (user) {
      try {
        logPaddleOperation('找到用户，创建新的订阅记录', { 
          userId: user.id, 
          subscriptionId 
        })
        
        // 创建新的订阅记录
        const newSubscription = await prismaClient.subscription.create({
          data: {
            userId: user.id,
            paddleSubscriptionId: subscriptionId,
            status: status,
            planType: 'monthly',
            priceId: subscription.items[0]?.price.id || '',
            startedAt: subscription.current_billing_period?.starts_at 
              ? new Date(subscription.current_billing_period.starts_at) 
              : new Date(),
            nextBillingAt: subscription.current_billing_period?.ends_at
              ? new Date(subscription.current_billing_period.ends_at)
              : null,
            metadata: subscription
          },
          include: { user: true }
        })
        
        // 更新订阅记录变量，以便后续处理
        subscriptionRecord = newSubscription
        
        logPaddleOperation('成功创建新的订阅记录', { 
          subscriptionId,
          userId: user.id
        })
      } catch (error) {
        logPaddleOperation('创建订阅记录失败', { 
          error: error instanceof Error ? error.message : String(error),
          userId: user.id,
          subscriptionId
        })
      }
    }
  }

  if (!subscriptionRecord) {
    logPaddleOperation('未找到订阅记录，无法处理订阅更新', { subscriptionId })
    return
  }

  // 记录订阅状态变化
  logPaddleOperation('更新订阅记录', { 
    subscriptionId,
    oldStatus: subscriptionRecord.status, 
    newStatus: status,
    oldCanceledAt: subscriptionRecord.canceledAt ? subscriptionRecord.canceledAt.toISOString() : null,
    newCanceledAt: canceledAt || null,
    hasScheduledCancel,
    scheduledCancelDate,
    userId: subscriptionRecord.userId
  })

  // 确定订阅数据更新内容
  const subscriptionUpdateData: any = {
    status: status,
    metadata: subscription,
  }

  // 处理下一次计费日期
  if (subscription.current_billing_period?.ends_at) {
    // 重要变更：即使在计划取消的情况下，也保留nextBillingAt字段
    // 这样前端可以显示"已取消"而不是完全不显示任何内容
    if (hasScheduledCancel) {
      // 对于计划取消的情况，我们设置nextBillingAt为计费周期结束日期
      // 这样前端可以根据订阅metadata中的scheduled_change字段判断它是"已计划取消"
      subscriptionUpdateData.nextBillingAt = new Date(subscription.current_billing_period.ends_at)
      
      logPaddleOperation('设置计划取消订阅的nextBillingAt', {
        nextBillingAt: subscriptionUpdateData.nextBillingAt.toISOString(),
        reason: '保留下次计费日期以便前端显示为已取消'
      })
    } else if (subscription.next_billed_at) {
      // 正常的下次计费日期
      subscriptionUpdateData.nextBillingAt = new Date(subscription.next_billed_at)
    } else {
      // 没有提供下次计费日期，使用当前计费周期结束日期作为备选
      subscriptionUpdateData.nextBillingAt = new Date(subscription.current_billing_period.ends_at)
    }
  }

  // 处理取消状态
  if (canceledAt) {
    // 立即取消情况
    subscriptionUpdateData.canceledAt = new Date(canceledAt)
    
    // 判断是否是立即取消还是下一周期结束取消
    const currentDate = new Date()
    const billingPeriodEndsDate = subscription.current_billing_period?.ends_at 
      ? new Date(subscription.current_billing_period.ends_at) 
      : null

    // 如果取消日期等于或接近当前日期，且状态为"canceled"，则是立即取消
    const isImmediateCancellation = status === 'canceled' && 
      (!billingPeriodEndsDate || Math.abs(currentDate.getTime() - new Date(canceledAt).getTime()) < 24 * 60 * 60 * 1000)

    if (isImmediateCancellation) {
      subscriptionUpdateData.endedAt = currentDate
      // 对于立即取消的情况，我们可以将nextBillingAt设置为null
      subscriptionUpdateData.nextBillingAt = null
      
      logPaddleOperation('检测到立即取消订阅', { 
        subscriptionId,
        userId: subscriptionRecord.userId,
        canceledAt
      })
    } else {
      // 下一周期结束取消的情况
      if (billingPeriodEndsDate) {
        subscriptionUpdateData.endedAt = billingPeriodEndsDate
      }
      logPaddleOperation('检测到下一周期取消订阅', { 
        subscriptionId, 
        userId: subscriptionRecord.userId,
        billingPeriodEnds: billingPeriodEndsDate ? billingPeriodEndsDate.toISOString() : '未知'
      })
    }
  } else if (hasScheduledCancel) {
    // 处理下一周期取消情况 (scheduled_change)
    // 相关信息已经存储在metadata中的scheduled_change字段里
    
    // 设置结束日期为计划取消的生效日期
    if (scheduledCancelDate) {
      subscriptionUpdateData.endedAt = new Date(scheduledCancelDate)
    } else if (subscription.current_billing_period?.ends_at) {
      subscriptionUpdateData.endedAt = new Date(subscription.current_billing_period.ends_at)
    }
    
    logPaddleOperation('检测到计划取消订阅', { 
      subscriptionId,
      userId: subscriptionRecord.userId,
      scheduledCancelDate: scheduledCancelDate || '未知',
      currentBillingPeriodEnds: subscription.current_billing_period?.ends_at || '未知',
      nextBillingAt: subscriptionUpdateData.nextBillingAt.toISOString()
    })
  } else if (status === 'active' && (subscriptionRecord.canceledAt)) {
    // 如果订阅重新激活，但之前有取消日期，则清除这些字段
    subscriptionUpdateData.canceledAt = null
    subscriptionUpdateData.endedAt = null
    logPaddleOperation('订阅重新激活，清除取消相关信息', { subscriptionId })
  }

  // 更新订阅记录
  await prismaClient.subscription.update({
    where: { paddleSubscriptionId: subscriptionId },
    data: subscriptionUpdateData
  })

  // 确定用户数据更新内容
  const userUpdateData: any = {
    paddleSubscriptionStatus: status,
  }

  // 处理不同状态的VIP权限
  if (status === 'active') {
    // 活跃状态 - 即使是下一周期取消，也保持VIP状态直到周期结束
    userUpdateData.isVIP = true
    if (subscription.current_billing_period?.ends_at) {
      userUpdateData.vipExpiresAt = new Date(subscription.current_billing_period.ends_at)
    }
    
    // 关键改动：使用paddleSubscriptionStatus字段存储计划取消信息
    // 使用 "active_canceling" 状态表示活跃但已计划取消
    if (hasScheduledCancel) {
      userUpdateData.paddleSubscriptionStatus = "active_canceling"
      logPaddleOperation('设置用户订阅状态为active_canceling以表示计划取消', {
        userId: subscriptionRecord.userId
      })
    }
    
    logPaddleOperation('订阅活跃' + (hasScheduledCancel ? '（已计划取消）' : ''), { 
      userId: subscriptionRecord.userId,
      expiresAt: userUpdateData.vipExpiresAt ? userUpdateData.vipExpiresAt.toISOString() : null,
      hasScheduledCancel
    })
  } else if (status === 'canceled') {
    // 判断是否是立即取消
    const currentDate = new Date()
    const billingPeriodEndsDate = subscription.current_billing_period?.ends_at 
      ? new Date(subscription.current_billing_period.ends_at) 
      : null
    
    const isImmediateCancellation = canceledAt && 
      (!billingPeriodEndsDate || Math.abs(currentDate.getTime() - new Date(canceledAt).getTime()) < 24 * 60 * 60 * 1000)

    if (isImmediateCancellation) {
      // 立即取消 - 立即移除VIP状态
      userUpdateData.isVIP = false
      userUpdateData.vipExpiresAt = null
      logPaddleOperation('订阅已立即取消，立即移除VIP状态', { 
        userId: subscriptionRecord.userId
      })
    } else {
      // 下一周期取消 - 保留VIP直到当前计费周期结束
      if (billingPeriodEndsDate) {
        userUpdateData.vipExpiresAt = billingPeriodEndsDate
        // 使用特殊状态表示取消但保留VIP状态直到计费周期结束
        userUpdateData.paddleSubscriptionStatus = "canceled_end_of_term"
        logPaddleOperation('订阅将在周期结束后取消，VIP状态保留至计费周期结束', { 
          userId: subscriptionRecord.userId,
          expiresAt: userUpdateData.vipExpiresAt.toISOString()
        })
      }
    }
  } else if (status === 'paused') {
    // 暂停状态 - 通常保留VIP直到计费周期结束
    if (subscription.current_billing_period?.ends_at) {
      userUpdateData.vipExpiresAt = new Date(subscription.current_billing_period.ends_at)
      logPaddleOperation('订阅已暂停，VIP状态保留至计费周期结束', { 
        userId: subscriptionRecord.userId,
        expiresAt: userUpdateData.vipExpiresAt.toISOString()
      })
    }
  }

  // 更新用户VIP状态
  try {
    await prismaClient.user.update({
      where: { id: subscriptionRecord.userId },
      data: userUpdateData
    })
    
    logPaddleOperation('用户订阅状态已更新', {
      userId: subscriptionRecord.userId,
      isVIP: userUpdateData.isVIP,
      paddleSubscriptionStatus: userUpdateData.paddleSubscriptionStatus || status
    })
  } catch (error) {
    logPaddleOperation('用户订阅状态更新失败', {
      error: error instanceof Error ? error.message : String(error),
      userId: subscriptionRecord.userId
    })
    
    // 如果出错，确保至少更新基本的VIP信息
    await prismaClient.user.update({
      where: { id: subscriptionRecord.userId },
      data: {
        isVIP: userUpdateData.isVIP !== undefined ? userUpdateData.isVIP : true,
        vipExpiresAt: userUpdateData.vipExpiresAt,
        paddleSubscriptionStatus: status // 如果自定义状态失败，回退到标准状态
      }
    })
    
    logPaddleOperation('已使用基本信息更新用户订阅状态', {
      userId: subscriptionRecord.userId,
      isVIP: userUpdateData.isVIP !== undefined ? userUpdateData.isVIP : true
    })
  }
  
  logPaddleOperation('订阅更新处理完成', { 
    userId: subscriptionRecord.userId,
    status,
    isCanceled,
    cancelReason,
    isVIP: userUpdateData.isVIP !== undefined ? userUpdateData.isVIP : (status === 'active'),
    hasScheduledCancel,
    expiresAt: userUpdateData.vipExpiresAt ? userUpdateData.vipExpiresAt.toISOString() : '未设置'
  })
}

// 处理订阅取消事件
async function handleSubscriptionCanceled(eventData: any, prismaClient: any) {
  const subscription = eventData.data
  const subscriptionId = subscription.id
  const customerId = subscription.customer_id
  const canceledAt = subscription.canceled_at || new Date().toISOString()

  logPaddleOperation('处理订阅取消事件', { 
    subscriptionId,
    customerId,
    canceledAt,
    currentBillingPeriodStarts: subscription.current_billing_period?.starts_at || '未知',
    currentBillingPeriodEnds: subscription.current_billing_period?.ends_at || '未知'
  })

  // 查找订阅记录
  let subscriptionRecord = await prismaClient.subscription.findUnique({
    where: { paddleSubscriptionId: subscriptionId },
    include: { user: true }
  })

  // 如果找不到订阅记录但有客户ID，尝试查找用户
  if (!subscriptionRecord && customerId) {
    logPaddleOperation('未找到订阅记录，尝试通过客户ID查找用户', { 
      subscriptionId, 
      customerId 
    })

    // 尝试通过客户ID查找用户
    const user = await prismaClient.user.findFirst({
      where: { paddleCustomerId: customerId }
    })

    if (user) {
      logPaddleOperation('通过客户ID找到用户，查找该用户的订阅记录', { 
        userId: user.id, 
        customerId
      })

      // 查找该用户的所有订阅记录
      const userSubscriptions = await prismaClient.subscription.findMany({
        where: { 
          userId: user.id,
          status: { in: ['active', 'past_due'] }
        },
        orderBy: { startedAt: 'desc' },
        include: { user: true }
      })

      if (userSubscriptions.length > 0) {
        logPaddleOperation('找到用户的活跃订阅', { 
          userId: user.id, 
          subscriptionCount: userSubscriptions.length 
        })
        
        // 使用第一个（最新的）订阅记录
        subscriptionRecord = userSubscriptions[0]
      }
    }
  }

  if (!subscriptionRecord) {
    logPaddleOperation('未找到订阅记录，无法处理订阅取消', { 
      subscriptionId,
      customerId 
    })
    return
  }

  // 判断是否是立即取消
  const currentDate = new Date()
  const billingPeriodEndsDate = subscription.current_billing_period?.ends_at 
    ? new Date(subscription.current_billing_period.ends_at) 
    : null
      
  // 如果当前取消事件是立即取消，则判断如下
  // 1. 没有计费周期结束日期
  // 2. 取消日期接近当前日期
  // 3. canceled_at 日期接近 current_billing_period.starts_at (同一天内取消)
  const canceledAtDate = new Date(canceledAt)
  const billingPeriodStartsDate = subscription.current_billing_period?.starts_at
    ? new Date(subscription.current_billing_period.starts_at)
    : null

  const isImmediateCancellation = 
    !billingPeriodEndsDate || 
    Math.abs(currentDate.getTime() - canceledAtDate.getTime()) < 24 * 60 * 60 * 1000 ||
    (billingPeriodStartsDate && Math.abs(canceledAtDate.getTime() - billingPeriodStartsDate.getTime()) < 24 * 60 * 60 * 1000);

  // 记录订阅取消详情
  logPaddleOperation('订阅取消详情', { 
    subscriptionId,
    userId: subscriptionRecord.userId,
    oldStatus: subscriptionRecord.status,
    canceledAt,
    isImmediateCancellation,
    billingPeriodStarts: billingPeriodStartsDate ? billingPeriodStartsDate.toISOString() : null,
    billingPeriodEnds: billingPeriodEndsDate ? billingPeriodEndsDate.toISOString() : null
  })

  // 确定订阅更新内容
  const subscriptionUpdateData: any = {
    status: 'canceled',
    canceledAt: new Date(canceledAt),
    metadata: subscription,
  }
  
  // 处理结束日期和下一次计费日期
  if (isImmediateCancellation) {
    // 立即取消的情况，结束日期设为当前日期，下次计费日期设为null
    subscriptionUpdateData.endedAt = currentDate
    subscriptionUpdateData.nextBillingAt = null
    
    logPaddleOperation('立即取消订阅，清除下次计费日期', {
      subscriptionId,
      userId: subscriptionRecord.userId
    })
  } else if (billingPeriodEndsDate) {
    // 周期结束取消的情况，结束日期设为计费周期结束日期
    subscriptionUpdateData.endedAt = billingPeriodEndsDate
    
    // 保留下次计费日期，以便前端可以显示"已取消"
    if (subscription.current_billing_period?.ends_at) {
      subscriptionUpdateData.nextBillingAt = new Date(subscription.current_billing_period.ends_at)
      
      logPaddleOperation('设置周期结束取消订阅的nextBillingAt', {
        nextBillingAt: subscriptionUpdateData.nextBillingAt.toISOString(),
        reason: '保留下次计费日期以便前端显示为已取消'
      })
    }
  } else {
    // 没有计费周期结束日期的情况，默认为当前日期
    subscriptionUpdateData.endedAt = currentDate
    subscriptionUpdateData.nextBillingAt = null
  }

  // 更新订阅记录
  await prismaClient.subscription.update({
    where: { paddleSubscriptionId: subscriptionId },
    data: subscriptionUpdateData
  })

  // 确定用户更新内容
  const userUpdateData: any = {
    paddleSubscriptionStatus: isImmediateCancellation ? 'canceled' : 'canceled_end_of_term',
  }
  
  // 设置VIP状态
  if (isImmediateCancellation) {
    // 立即取消 - 立即移除VIP状态
    userUpdateData.isVIP = false
    userUpdateData.vipExpiresAt = null
    logPaddleOperation('立即取消订阅，立即移除VIP状态', { 
      userId: subscriptionRecord.userId
    })
  } else if (billingPeriodEndsDate) {
    // 周期结束取消 - 保留VIP直到计费周期结束
    userUpdateData.vipExpiresAt = billingPeriodEndsDate
    logPaddleOperation('订阅将在周期结束后取消，VIP状态保留至计费周期结束', { 
      userId: subscriptionRecord.userId,
      expiresAt: userUpdateData.vipExpiresAt.toISOString()
    })
  } else {
    // 其他情况 - 保守起见，立即移除VIP状态
    userUpdateData.isVIP = false
    userUpdateData.vipExpiresAt = null
    logPaddleOperation('无法确定取消类型，保守移除VIP状态', { 
      userId: subscriptionRecord.userId
    })
  }

  // 更新用户VIP状态
  try {
    await prismaClient.user.update({
      where: { id: subscriptionRecord.userId },
      data: userUpdateData
    })
    
    logPaddleOperation('用户订阅状态已更新', {
      userId: subscriptionRecord.userId,
      isVIP: userUpdateData.isVIP,
      paddleSubscriptionStatus: userUpdateData.paddleSubscriptionStatus
    })
  } catch (error) {
    logPaddleOperation('用户订阅状态更新失败', {
      error: error instanceof Error ? error.message : String(error),
      userId: subscriptionRecord.userId
    })
    
    // 如果出错，确保至少更新基本的VIP信息
    await prismaClient.user.update({
      where: { id: subscriptionRecord.userId },
      data: {
        isVIP: userUpdateData.isVIP,
        vipExpiresAt: userUpdateData.vipExpiresAt,
        paddleSubscriptionStatus: 'canceled' // 简化的状态
      }
    })
  }
  
  logPaddleOperation('订阅取消处理完成', { 
    userId: subscriptionRecord.userId,
    isImmediateCancellation,
    isVIP: !isImmediateCancellation && !!billingPeriodEndsDate,
    vipUntil: userUpdateData.vipExpiresAt ? userUpdateData.vipExpiresAt.toISOString() : '立即结束',
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
  
  // 尝试通过客户ID查找用户
  let user = await prismaClient.user.findFirst({
    where: { paddleCustomerId: customerId }
  })

  // 如果通过客户ID找不到用户，尝试获取客户详情并通过邮箱查找
  if (!user) {
    // 记录未找到用户信息
    logPaddleOperation('通过Paddle客户ID未找到用户，尝试获取客户详情', { customerId })
    
    // 尝试从交易数据中获取客户信息
    try {
      let customerEmail = null
      
      // 从交易数据中获取客户邮箱
      if (transaction.customer && transaction.customer.email) {
        customerEmail = transaction.customer.email
      } else if (transaction.billing_details && transaction.billing_details.email) {
        customerEmail = transaction.billing_details.email
      }
      
      if (customerEmail) {
        logPaddleOperation('从交易数据中获取到客户邮箱', { customerEmail })
        
        // 通过邮箱查找用户
        user = await prismaClient.user.findUnique({
          where: { email: customerEmail }
        })
        
        if (user) {
          logPaddleOperation('通过邮箱找到用户', { 
            userId: user.id, 
            email: customerEmail 
          })
          
          // 更新用户的Paddle客户ID
          await prismaClient.user.update({
            where: { id: user.id },
            data: { paddleCustomerId: customerId }
          })
          
          logPaddleOperation('已更新用户的Paddle客户ID', { 
            userId: user.id, 
            paddleCustomerId: customerId 
          })
        }
      }
    } catch (error) {
      logPaddleOperation('获取客户详情失败', { 
        error: error instanceof Error ? error.message : String(error) 
      })
    }
  }

  if (!user) {
    logPaddleOperation('未找到用户，无法处理交易', { 
      customerId,
      transactionId
    })
    return
  }

  logPaddleOperation('找到用户，处理交易', {
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