const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  // 清除现有价格数据
  await prisma.price.deleteMany({})

  // 创建订阅价格
  await prisma.price.create({
    data: {
      id: process.env.NEXT_PUBLIC_PADDLE_MONTHLY_PRICE_ID || 'pri_monthly',
      type: 'subscription',
      name: 'Monthly Subscription',
      description: 'Monthly subscription with 200 credits',
      unitAmount: '6.00',
      currency: 'USD',
      interval: 'month',
      creditAmount: 200,
      isActive: true,
      metadata: {
        originalPrice: '12.00',
        discount: '50%'
      }
    }
  })

  // 创建点数包价格
  await prisma.price.create({
    data: {
      id: process.env.NEXT_PUBLIC_PADDLE_CREDITS_10_PRICE_ID || 'pri_credits_10',
      type: 'one_time',
      name: '10 Credits',
      description: '10 credits for premium features',
      unitAmount: '1.99',
      currency: 'USD',
      creditAmount: 10,
      isActive: true
    }
  })

  await prisma.price.create({
    data: {
      id: process.env.NEXT_PUBLIC_PADDLE_CREDITS_100_PRICE_ID || 'pri_credits_100',
      type: 'one_time',
      name: '100 Credits',
      description: '100 credits for premium features',
      unitAmount: '9.99',
      currency: 'USD',
      creditAmount: 100,
      isActive: true,
      metadata: {
        originalPrice: '19.99',
        discount: '50%'
      }
    }
  })

  await prisma.price.create({
    data: {
      id: process.env.NEXT_PUBLIC_PADDLE_CREDITS_500_PRICE_ID || 'pri_credits_500',
      type: 'one_time',
      name: '500 Credits',
      description: '500 credits for premium features',
      unitAmount: '39.99',
      currency: 'USD',
      creditAmount: 500,
      isActive: true,
      metadata: {
        originalPrice: '99.99',
        discount: '60%'
      }
    }
  })

  await prisma.price.create({
    data: {
      id: process.env.NEXT_PUBLIC_PADDLE_CREDITS_1000_PRICE_ID || 'pri_credits_1000',
      type: 'one_time',
      name: '1000 Credits',
      description: '1000 credits for premium features',
      unitAmount: '69.99',
      currency: 'USD',
      creditAmount: 1000,
      isActive: true,
      metadata: {
        originalPrice: '199.99',
        discount: '65%'
      }
    }
  })

  console.log('价格数据已成功添加')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  }) 