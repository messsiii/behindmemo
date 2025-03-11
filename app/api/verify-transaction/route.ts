import { authConfig } from '@/auth'
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

    // 获取交易ID
    const { transactionId } = await req.json()
    if (!transactionId) {
      return NextResponse.json({ error: '缺少交易ID' }, { status: 400 })
    }

    console.log(`开始验证交易: ${transactionId}, 用户: ${session.user.id}`)

    // 检查交易是否已处理
    const existingTransaction = await prisma.transaction.findFirst({
      where: { paddleOrderId: transactionId }
    })
    
    if (existingTransaction) {
      console.log(`交易 ${transactionId} 已处理过`)
      return NextResponse.json({ 
        success: true, 
        message: '交易已处理', 
        alreadyProcessed: true,
        transaction: existingTransaction
      })
    }

    // 调用Paddle API验证交易
    const paddleApiKey = process.env.PADDLE_API_KEY
    if (!paddleApiKey) {
      console.error('缺少Paddle API密钥')
      return NextResponse.json({ error: 'API配置错误' }, { status: 500 })
    }

    console.log(`调用Paddle API验证交易: ${transactionId}`)
    
    // 直接使用生产环境URL
    const paddleApiBaseUrl = 'https://api.paddle.com'
    
    console.log(`使用Paddle API环境: 生产, 基础URL: ${paddleApiBaseUrl}`)
    
    const paddleApiResponse = await fetch(`${paddleApiBaseUrl}/transactions/${transactionId}`, {
      headers: {
        'Authorization': `Bearer ${paddleApiKey}`,
        'Content-Type': 'application/json'
      }
    })

    if (!paddleApiResponse.ok) {
      const errorText = await paddleApiResponse.text()
      console.error(`Paddle API错误: ${errorText}`)
      return NextResponse.json({ 
        error: '无法验证交易', 
        paddleError: errorText 
      }, { status: 500 })
    }

    const paddleTransaction = await paddleApiResponse.json()
    console.log(`Paddle交易数据:`, paddleTransaction.data)
    
    // 验证交易状态
    const validStatuses = ['completed', 'paid'];
    if (!validStatuses.includes(paddleTransaction.data.status)) {
      console.log(`交易状态无效: ${paddleTransaction.data.status}，有效状态: ${validStatuses.join(', ')}`)
      return NextResponse.json({ 
        error: '交易未完成', 
        status: paddleTransaction.data.status 
      }, { status: 400 })
    }

    // 验证交易所属用户
    const customData = paddleTransaction.data.custom_data || {}
    if (customData.userId && customData.userId !== session.user.id) {
      console.error(`交易用户ID不匹配: ${customData.userId} vs ${session.user.id}`)
      return NextResponse.json({ error: '交易不属于当前用户' }, { status: 403 })
    }

    // 计算点数金额
    const items = paddleTransaction.data.items || []
    let creditAmount = 0
    let isSubscription = false
    
    for (const item of items) {
      const priceId = item.price.id
      
      if (priceId === process.env.NEXT_PUBLIC_PADDLE_MONTHLY_PRICE_ID) {
        isSubscription = true
        break
      } else if (priceId === process.env.NEXT_PUBLIC_PADDLE_CREDITS_10_PRICE_ID) {
        creditAmount = 10
      } else if (priceId === process.env.NEXT_PUBLIC_PADDLE_CREDITS_100_PRICE_ID) {
        creditAmount = 100
      } else if (priceId === process.env.NEXT_PUBLIC_PADDLE_CREDITS_500_PRICE_ID) {
        creditAmount = 500
      } else if (priceId === process.env.NEXT_PUBLIC_PADDLE_CREDITS_1000_PRICE_ID) {
        creditAmount = 1000
      }
    }

    // 处理订阅
    if (isSubscription) {
      console.log(`处理订阅交易`)
      // 创建订阅记录
      const subscriptionId = paddleTransaction.data.subscription_id
      if (!subscriptionId) {
        return NextResponse.json({ error: '缺少订阅ID' }, { status: 400 })
      }

      // 获取订阅详情
      const subscriptionResponse = await fetch(`${paddleApiBaseUrl}/subscriptions/${subscriptionId}`, {
        headers: {
          'Authorization': `Bearer ${paddleApiKey}`,
          'Content-Type': 'application/json'
        }
      })

      if (!subscriptionResponse.ok) {
        const errorText = await subscriptionResponse.text()
        console.error(`获取订阅详情失败: ${errorText}`)
        return NextResponse.json({ 
          error: '无法获取订阅详情', 
          paddleError: errorText 
        }, { status: 500 })
      }

      const subscriptionData = await subscriptionResponse.json()
      const subscription = subscriptionData.data

      // 创建订阅记录
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

      // 更新用户VIP状态
      await prisma.user.update({
        where: { id: session.user.id },
        data: {
          isVIP: true,
          vipExpiresAt: new Date(subscription.current_billing_period.ends_at),
          paddleSubscriptionId: subscriptionId,
          paddleSubscriptionStatus: subscription.status
        }
      })

      // 创建交易记录
      const newTransaction = await prisma.transaction.create({
        data: {
          userId: session.user.id,
          paddleOrderId: transactionId,
          type: 'subscription_payment',
          status: 'completed',
          amount: parseFloat(paddleTransaction.data.details.totals.total),
          currency: paddleTransaction.data.details.totals.currency_code,
          paddleSubscriptionId: subscriptionId,
          pointsAdded: 200, // 订阅包含200点数
          updatedAt: new Date()
        }
      })

      // 更新用户点数
      await prisma.user.update({
        where: { id: session.user.id },
        data: {
          credits: { increment: 200 } // 订阅包含200点数
        }
      })

      console.log(`订阅处理完成，已添加200点数`)
      return NextResponse.json({ 
        success: true, 
        message: '订阅验证成功，已激活VIP并添加点数', 
        transaction: newTransaction,
        creditsAdded: 200,
        subscriptionId
      })
    }
    // 处理点数购买
    else if (creditAmount > 0) {
      console.log(`处理点数购买: ${creditAmount}点`)
      // 创建交易记录
      const newTransaction = await prisma.transaction.create({
        data: {
          userId: session.user.id,
          paddleOrderId: transactionId,
          type: 'one_time_purchase',
          status: 'completed',
          amount: parseFloat(paddleTransaction.data.details.totals.total),
          currency: paddleTransaction.data.details.totals.currency_code,
          pointsAdded: creditAmount,
          updatedAt: new Date()
        }
      })

      // 更新用户点数
      await prisma.user.update({
        where: { id: session.user.id },
        data: {
          credits: { increment: creditAmount }
        }
      })

      console.log(`点数购买处理完成，已添加${creditAmount}点数`)
      return NextResponse.json({ 
        success: true, 
        message: '交易验证成功，已添加点数', 
        transaction: newTransaction,
        creditsAdded: creditAmount
      })
    } else {
      console.error(`无法确定商品类型`)
      return NextResponse.json({ error: '无效的商品' }, { status: 400 })
    }
  } catch (error) {
    console.error('交易验证错误:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
} 