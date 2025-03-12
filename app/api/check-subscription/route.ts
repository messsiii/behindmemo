import { authConfig } from '@/auth'
import { getTransaction, logPaddleOperation, verifySubscriptionStatus } from '@/lib/paddle-api'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth/next'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    // 获取当前用户会话
    const session = await getServerSession(authConfig)
    if (!session?.user) {
      return NextResponse.json({ error: '未授权' }, { status: 401 })
    }

    // 获取订阅ID和交易ID
    const { subscriptionId, transactionId } = await req.json()
    if (!subscriptionId) {
      return NextResponse.json({ error: '缺少订阅ID' }, { status: 400 })
    }

    logPaddleOperation('检查订阅状态', { 
      subscriptionId, 
      transactionId, 
      userId: session.user.id 
    })

    // 检查用户是否已经是VIP
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isVIP: true, vipExpiresAt: true, paddleSubscriptionId: true }
    })

    if (user?.isVIP && user.paddleSubscriptionId === subscriptionId) {
      logPaddleOperation('用户已经是VIP', { 
        subscriptionId, 
        userId: session.user.id 
      })
      return NextResponse.json({ 
        success: true, 
        message: '用户已是VIP', 
        alreadyVIP: true,
      })
    }

    // 检查交易是否已处理
    if (transactionId) {
      const existingTransaction = await prisma.transaction.findFirst({
        where: { paddleOrderId: transactionId }
      })
      
      if (existingTransaction) {
        logPaddleOperation('交易已处理', { 
          transactionId,
          status: existingTransaction.status
        })
        return NextResponse.json({ 
          success: true, 
          message: '交易已处理', 
          alreadyProcessed: true,
          transaction: existingTransaction
        })
      }
    }

    // 验证订阅状态（使用新的API工具库）
    logPaddleOperation('验证订阅状态', { subscriptionId })
    const { valid, status, subscription, error } = await verifySubscriptionStatus(subscriptionId)
    
    if (!valid) {
      logPaddleOperation('订阅状态无效', {
        subscriptionId,
        status,
        error: error ? String(error) : undefined
      })
      return NextResponse.json({ 
        error: '订阅未激活', 
        status: status 
      }, { status: 400 })
    }

    // 验证订阅所属客户
    const customerId = subscription.customer_id
    
    // 检查用户是否已有Paddle Customer ID，如果没有，存储它
    const userToUpdate = await prisma.user.findUnique({
      where: { id: session.user.id },
    })

    let userNeedsPaddleCustomerIdUpdate = false
    if (!userToUpdate?.paddleCustomerId && customerId) {
      userNeedsPaddleCustomerIdUpdate = true
    }

    // 创建订阅记录（如果尚未存在）
    const existingSubscription = await prisma.subscription.findUnique({
      where: { paddleSubscriptionId: subscriptionId }
    })

    if (!existingSubscription) {
      await prisma.subscription.create({
        data: {
          userId: session.user.id,
          paddleSubscriptionId: subscriptionId,
          status: subscription.status,
          planType: 'monthly', // 根据实际情况设置
          priceId: subscription.items[0]?.price.id || '',
          startedAt: new Date(subscription.current_billing_period.starts_at),
          nextBillingAt: new Date(subscription.current_billing_period.ends_at),
          metadata: subscription
        }
      })
      logPaddleOperation('创建订阅记录', { subscriptionId })
    }

    // 创建交易记录（如果提供了交易ID且记录不存在）
    let newTransaction = null
    if (transactionId) {
      try {
        // 查询交易详情 - 使用新工具库的缓存和重试功能
        logPaddleOperation('获取交易详情', { transactionId })
        const transactionResponse = await getTransaction(transactionId)
        const paddleTransaction = transactionResponse.data

        // 创建交易记录
        newTransaction = await prisma.transaction.create({
          data: {
            userId: session.user.id,
            paddleOrderId: transactionId,
            type: 'subscription_payment',
            status: 'completed',
            amount: parseFloat(paddleTransaction.details.totals.total),
            currency: paddleTransaction.details.totals.currency_code,
            paddleSubscriptionId: subscriptionId,
            updatedAt: new Date()
          }
        });
        logPaddleOperation('创建交易记录成功', { transactionId });
      } catch (error) {
        logPaddleOperation('获取交易详情失败', { 
          transactionId, 
          error: String(error) 
        });
        // 不中断流程，因为只要订阅验证成功，即使缺少交易记录也可以激活VIP
      }
    }

    // 更新用户VIP状态和Paddle Customer ID（如需要）
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        isVIP: true,
        vipExpiresAt: new Date(subscription.current_billing_period.ends_at),
        paddleSubscriptionId: subscriptionId,
        paddleSubscriptionStatus: subscription.status,
        ...(userNeedsPaddleCustomerIdUpdate && customerId ? { paddleCustomerId: customerId } : {})
      }
    })

    logPaddleOperation('订阅处理完成', { 
      userId: session.user.id, 
      isVIP: true, 
      expiresAt: subscription.current_billing_period.ends_at 
    })
    
    return NextResponse.json({ 
      success: true, 
      message: '订阅验证成功，已激活VIP', 
      transaction: newTransaction,
      subscriptionId
    })
  } catch (error) {
    logPaddleOperation('检查订阅状态错误', { error: String(error) })
    
    // 增强错误响应
    const errorMessage = error instanceof Error ? error.message : String(error)
    const statusCode = (error as any)?.status || 500
    
    return NextResponse.json({ 
      error: '服务器错误', 
      message: errorMessage 
    }, { status: statusCode })
  }
} 