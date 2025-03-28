'use client'

import { Footer } from '@/components/footer'
import { Nav } from '@/components/nav'
import PaddleScript from '@/components/PaddleScript'
import { Button } from '@/components/ui/button'
import { ButtonLoading } from '@/components/ui/button-loading'
import { Card } from '@/components/ui/card'
import { toast } from '@/components/ui/use-toast'
import { useLanguage } from '@/contexts/LanguageContext'
import { openCreditsCheckout, openSubscriptionCheckout } from '@/lib/paddle'
import { AnimatePresence, motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { signIn, useSession } from 'next-auth/react'
import Link from 'next/link'
import { useEffect, useState } from 'react'

interface Question {
  q: string
  a: string
}

interface FAQSection {
  title: string
  questions: Question[]
}

interface ContentType {
  en: {
    title: string
    subtitle: string
    cta: string
    contact: string
    includedFeatures: string
    features: string[]
    currentDiscount: string
    off: string
    creditsDiscount: string
    mostPopular: string
    bestValue: string
    termsAndPrivacy: string
    terms: string
    and: string
    privacyPolicy: string
    faqTitle: string
    faqSections: FAQSection[]
  }
  zh: {
    title: string
    subtitle: string
    cta: string
    contact: string
    includedFeatures: string
    features: string[]
    currentDiscount: string
    off: string
    creditsDiscount: string
    mostPopular: string
    bestValue: string
    termsAndPrivacy: string
    terms: string
    and: string
    privacyPolicy: string
    faqTitle: string
    faqSections: FAQSection[]
  }
}

const content: ContentType = {
  en: {
    title: "Choose Your Plan",
    subtitle: "Find the perfect plan to create your heartfelt Memories",
    cta: "Need more information?",
    contact: "Contact us",
    includedFeatures: "All plans include",
    features: [
      "Upload photos",
      "Submit sender and recipient names",
      "Describe your story",
      "AI-powered letter generation",
    ],
    currentDiscount: "Current Discount",
    off: "off",
    creditsDiscount: "Credits Discount",
    mostPopular: "Most Popular",
    bestValue: "Best Value",
    termsAndPrivacy: "By using our service, you agree to our ",
    terms: "Terms of Service",
    and: " and ",
    privacyPolicy: "Privacy Policy",
    faqTitle: "Frequently Asked Questions",
    faqSections: [
      {
        title: "About Credits & Pricing",
        questions: [
          {
            q: "What are Credits?",
            a: "Credits are our in-app currency that you can use to unlock premium features like watermark removal, premium templates, and high-quality exports. 10 Credits = 1 premium letter generation.",
          },
          {
            q: "How do Credits work?",
            a: "When generating a letter, you can use Credits to:\n- Remove watermark\n- Access premium templates\n- Export in high quality\n- Use priority generation\nAll these features together cost 10 Credits per letter.",
          },
          {
            q: "What's included in the free plan?",
            a: "The free plan includes:\n- Basic letter generation with all core features\n- 30 free Credits monthly\n- Standard templates\n- Standard quality exports\n- Subtle watermark on generated letters\n- Standard generation queue",
          },
          {
            q: "What's the difference between Credits and Subscription?",
            a: "Credits: Pay-as-you-go option. Perfect if you generate letters occasionally. 10 Credits = 1 premium letter.\nSubscription: $6/month (regular $12), VIP users can use all templates for free and generate letters without consuming credits, plus priority support. Best value if you use the service regularly.",
          },
          {
            q: "Do Credits expire?",
            a: "Credits from purchases never expire. Free monthly Credits expire at the end of each month.",
          },
        ],
      },
      {
        title: "Features & Usage",
        questions: [
          {
            q: 'What does "priority generation" mean?',
            a: "Priority generation puts your request at the front of the queue, ensuring faster delivery during peak times.",
          },
          {
            q: "Can I use Credits for specific features only?",
            a: "Yes! You can choose which premium features to use. For example, you might use Credits just for watermark removal while keeping the standard template.",
          },
          {
            q: "What happens to my unused subscription Credits?",
            a: "Monthly subscription Credits reset at the beginning of each billing cycle. We recommend using them before they refresh.",
          },
        ],
      },
      {
        title: "Technical & Support",
        questions: [
          {
            q: "How do I know how many Credits I have left?",
            a: "Your Credit balance is always visible in your account dashboard and before each generation.",
          },
          {
            q: "What payment methods do you accept?",
            a: "We accept all major credit cards and PayPal through our secure payment processor, Paddle.",
          },
        ],
      },
      {
        title: "Value & Savings",
        questions: [
          {
            q: "What's the best value option?",
            a: "For regular users (20+ letters/month): Monthly subscription at $6\nFor occasional users: Credit packages, with larger packages offering better value\nFor first-time users: Start with the free plan to test our service",
          },
          {
            q: "Why choose the subscription over Credit packages?",
            a: "Subscription offers:\n- Better value (generate letters without consuming credits)\n- Priority support\n- Free access to all templates\n- 50% launch discount",
          },
        ],
      },
      {
        title: "Subscription & Refunds",
        questions: [
          {
            q: "How can I cancel my subscription?",
            a: "You can cancel your subscription anytime from the billing page. After cancellation, you'll retain access to your plan until the end of the current subscription period. Once the period ends, you'll transition to a free plan.",
          },
          {
            q: "What is your refund policy?",
            a: "We offer a 30-day refund policy for our services. However, please note that Credits that have already been used cannot be refunded. If you wish to request a refund, please contact our customer support within 30 days of your purchase.",
          },
        ],
      },
    ],
  },
  zh: {
    title: "选择你的计划",
    subtitle: "找到最适合创作你的真挚Memories的方案",
    cta: "需要更多信息？",
    contact: "联系我们",
    includedFeatures: "所有计划都包含",
    features: ["上传照片", "提交写信人和收信人名称", "描述你的故事", "AI驱动的信件生成"],
    currentDiscount: "当前折扣",
    off: "优惠",
    creditsDiscount: "点数折扣",
    mostPopular: "最受欢迎",
    bestValue: "最优惠",
    termsAndPrivacy: "使用我们的服务即表示您同意我们的",
    terms: "服务条款",
    and: "和",
    privacyPolicy: "隐私政策",
    faqTitle: "常见问题",
    faqSections: [
      {
        title: "关于点数和定价",
        questions: [
          {
            q: "什么是点数？",
            a: "点数是我们的应用内货币，您可以用它来解锁高级功能，如去除水印、高级模板和高质量导出。10点数 = 1封高级信件生成。",
          },
          {
            q: "点数如何使用？",
            a: "在生成信件时，您可以使用点数来：\n- 去除水印\n- 访问高级模板\n- 高质量导出\n- 使用优先生成\n所有这些功能一起每封信需要10点数。",
          },
          {
            q: "免费计划包括什么？",
            a: "免费计划包括：\n- 具有所有核心功能的基本信件生成\n- 每月30个免费点数\n- 标准模板\n- 标准质量导出\n- 生成的信件上有轻微水印\n- 标准生成队列",
          },
          {
            q: "点数和订阅有什么区别？",
            a: "点数：按需付费选项。适合偶尔生成信件的用户。10点数 = 1封高级信件。\n订阅：$6/月（原价$12），VIP用户可以免费使用所有模板，无需消耗积分生成信件，以及获得优先支持。对于经常使用的用户来说最具价值。",
          },
          {
            q: "点数会过期吗？",
            a: "免费的每月点数在每月底过期。",
          },
        ],
      },
      {
        title: "功能和使用",
        questions: [
          {
            q: '什么是"优先生成"？',
            a: "优先生成将您的请求放在队列的前面，确保在高峰时段更快地交付。",
          },
          {
            q: "我可以只为特定功能使用点数吗？",
            a: "是的！您可以选择使用哪些高级功能。例如，您可能只使用点数来去除水印，同时保留标准模板。",
          },
          {
            q: "未使用的订阅点数会怎样？",
            a: "每月订阅点数在每个计费周期开始时重置。我们建议在它们刷新之前使用它们。",
          },
        ],
      },
      {
        title: "技术和支持",
        questions: [
          {
            q: "我如何知道还剩多少点数？",
            a: "您的点数余额始终在您的账户仪表板和每次生成之前可见。",
          },
          {
            q: "你们接受哪些支付方式？",
            a: "我们通过安全的支付处理商Paddle接受所有主要信用卡和PayPal。",
          },
        ],
      },
      {
        title: "价值和节省",
        questions: [
          {
            q: "哪个选项最划算？",
            a: "对于常规用户（每月20+封信）：每月$6的订阅\n对于偶尔使用的用户：点数包，更大的包提供更好的价值\n对于首次使用的用户：从免费计划开始测试我们的服务",
          },
          {
            q: "为什么选择订阅而不是点数包？",
            a: "订阅提供：\n- 更好的价值（无需消耗积分生成信件）\n- 优先支持\n- 所有模板免费使用\n- 50%的启动折扣",
          },
        ],
      },
      {
        title: "订阅和退款",
        questions: [
          {
            q: "如何取消订阅？",
            a: "您可以随时从账单页面取消订阅。取消后，您将保留对您的计划的访问权限，直到当前订阅期结束。订阅期结束后，您将转换为免费计划。",
          },
          {
            q: "你们的退款政策是什么？",
            a: "我们对我们的服务提供30天退款政策。但是，请注意，已经使用的点数不能退款。如果您希望申请退款，请在购买后30天内联系我们的客户支持。",
          },
        ],
      },
    ],
  },
}

const plans = {
  en: [
    {
      name: "Free",
      price: "0",
      description: "Start your journey of emotional expression",
      features: [
        "All basic features",
        "Results with unobtrusive brand watermark",
        "Default template style",
        "Standard image export quality",
        "30 free credits per month",
      ],
      cta: "Get Started",
      popular: false,
    },
    {
      name: "Subscription",
      price: "6",
      originalPrice: "12",
      description: "Unleash your creativity without limits",
      features: [
        "All basic features",
        "Generate letters without consuming credits",
        "Remove watermarks",
        "Unlock all template styles",
        "Highest image export quality",
        "Priority generation (no queuing)",
        "Priority customer support",
      ],
      cta: "Subscribe Now",
      popular: true,
    },
  ],
  zh: [
    {
      name: "免费版",
      price: "0",
      description: "开启你的情感表达之旅",
      features: [
        "所有基础功能",
        "生成结果带有不影响阅读的品牌水印",
        "默认模板样式",
        "标准图片导出质量",
        "每月赠送30个点数",
      ],
      cta: "立即开始",
      popular: false,
    },
    {
      name: "订阅版",
      price: "6",
      originalPrice: "12",
      description: "无限释放你的创意",
      features: [
        "所有基础功能",
        "生成信件无需消耗积分",
        "去除水印",
        "解锁所有模板样式",
        "最高图片导出质量",
        "高速生成通道（无需排队）",
        "优先客户支持",
      ],
      cta: "立即订阅",
      popular: true,
    },
  ],
}

const creditPackages = {
  en: [
    { credits: 10, price: 0.99, originalPrice: 1.99, bestValue: false },
    { credits: 100, price: 10, originalPrice: 19.9, bestValue: false },
    { credits: 500, price: 38.9, originalPrice: 89.9, bestValue: false },
    { credits: 1000, price: 64.9, originalPrice: 159.9, bestValue: true },
  ],
  zh: [
    { credits: 10, price: 0.99, originalPrice: 1.99, bestValue: false },
    { credits: 100, price: 10, originalPrice: 19.9, bestValue: false },
    { credits: 500, price: 38.9, originalPrice: 89.9, bestValue: false },
    { credits: 1000, price: 64.9, originalPrice: 159.9, bestValue: true },
  ],
}

function FAQList({ questions, language }: { questions: Question[]; language: string }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const toggleQuestion = (index: number) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  return (
    <div className="space-y-4">
      {questions.map((item, index) => (
        <div
          key={index}
          className="border border-gray-200 rounded-lg overflow-hidden shadow-sm bg-white/60 backdrop-blur-sm"
        >
          <button
            className={`w-full text-left p-4 focus:outline-none transition-colors duration-300 ${
              language === "en" ? "font-serif" : "font-serif-zh"
            } ${openIndex === index ? "bg-gradient-to-r from-[#edf3ff]/70 to-[#fff0f7]/70" : "hover:bg-gray-50/50"}`}
            onClick={() => toggleQuestion(index)}
          >
            <div className="flex justify-between items-center">
              <span className="text-gray-800">{item.q}</span>
              <span
                className="text-gray-500 text-sm font-normal transition-transform duration-300"
                style={{ transform: openIndex === index ? "rotate(45deg)" : "rotate(0deg)" }}
              >
                +
              </span>
            </div>
          </button>
          <AnimatePresence>
            {openIndex === index && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div
                  className={`p-4 bg-gradient-to-r from-[#f5f8ff]/50 to-[#fff5fa]/50 ${
                    language === "en" ? "font-literary" : "font-serif-zh"
                  }`}
                >
                  <div className="text-gray-700 whitespace-pre-line">{item.a}</div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  )
}

export default function Pricing() {
  const { language } = useLanguage()
  const { data: session } = useSession()
  const allQuestions = content[language].faqSections.reduce<Question[]>((acc, section) => [...acc, ...section.questions], [])
  const [isVIP, setIsVIP] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isCheckoutLoading, setIsCheckoutLoading] = useState<number | null>(null)

  // 获取用户信息，检查是否为VIP
  useEffect(() => {
    const checkUserStatus = async () => {
      try {
        const response = await fetch('/api/user/info')
        if (response.ok) {
          const userData = await response.json()
          // 检查用户是否为有效的VIP
          const userIsVIP = userData.isVIP && (!userData.vipExpiresAt || new Date(userData.vipExpiresAt) > new Date())
          setIsVIP(userIsVIP)
        }
      } catch (error) {
        console.error('Failed to fetch user status:', error)
      }
    }
    
    checkUserStatus()
  }, [])

  // Paddle 相关处理函数
  const handleSubscribe = async () => {
    // 检查用户是否已登录
    if (!session?.user) {
      // 添加友好提示
      toast({
        title: language === 'en' ? 'Login Required' : '需要登录',
        description: language === 'en' 
          ? 'Redirecting to login page...' 
          : '正在跳转到登录页面...',
      });
      
      // 延迟跳转，让用户看到提示
      setTimeout(() => {
        // 未登录，引导用户登录，并设置回调地址为当前页面
        signIn(undefined, { callbackUrl: window.location.href })
      }, 1000);
      return
    }

    try {
      setIsLoading(true)
      
      // 显示加载状态
      const loadingToast = toast({
        title: language === 'en' ? 'Checking subscription status' : '正在检查订阅状态',
        description: language === 'en' ? 'Please wait...' : '请稍候...',
      });
      
      // 先检查用户是否已有订阅
      const response = await fetch('/api/user/check-subscription-status');
      
      // 关闭加载提示
      loadingToast.dismiss();
      
      if (!response.ok) {
        throw new Error(language === 'en' 
          ? 'Failed to check subscription status' 
          : '检查订阅状态失败'
        );
      }
      
      const data = await response.json();
      
      if (data.hasActiveSubscription) {
        // 用户已有订阅，显示提示
        toast({
          title: language === 'en' ? 'Subscription exists' : '已有订阅',
          description: language === 'en' 
            ? data.source === 'paddle' 
                ? 'We found your subscription in Paddle and synced it to your account.' 
                : 'You already have an active subscription.'
            : data.source === 'paddle' 
                ? '我们在 Paddle 发现了您的订阅并已同步到您的账户。' 
                : '您已有活跃的订阅。',
        });
        
        // 如果是从 Paddle 同步的，刷新页面以显示更新后的状态
        if (data.source === 'paddle' && data.synced) {
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        }
        
        return;
      }
      
      // 没有活跃订阅，继续开启订阅流程
      await openSubscriptionCheckout()
    } catch (error) {
      console.error('订阅支付失败:', error)
      // 显示友好的错误提示
      toast({
        title: language === 'en' ? 'Error' : '错误',
        description: language === 'en' 
          ? (error instanceof Error ? error.message : 'Payment system is not ready. Please try again in a moment.')
          : (error instanceof Error ? error.message : '支付系统尚未准备就绪，请稍后再试。'),
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  // 积分购买处理函数
  const handleBuyCredits = async (credits: number) => {
    // 检查用户是否已登录
    if (!session?.user) {
      // 添加友好提示
      toast({
        title: language === 'en' ? 'Login Required' : '需要登录',
        description: language === 'en' 
          ? 'Redirecting to login page...' 
          : '正在跳转到登录页面...',
      });
      
      // 延迟跳转，让用户看到提示
      setTimeout(() => {
        // 未登录，引导用户登录，并设置回调地址为当前页面
        signIn(undefined, { callbackUrl: window.location.href })
      }, 1000);
      return
    }

    try {
      setIsCheckoutLoading(credits)
      // 调用积分购买结账函数
      await openCreditsCheckout(credits)
    } catch (error) {
      console.error('积分购买失败:', error)
      // 显示友好的错误提示
      toast({
        title: language === 'en' ? 'Error' : '错误',
        description: language === 'en' 
          ? 'Payment system is not ready. Please try again in a moment.' 
          : '支付系统尚未准备就绪，请稍后再试。',
        variant: 'destructive'
      })
    } finally {
      setIsCheckoutLoading(null)
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* 加载 Paddle 脚本 */}
      <PaddleScript />
      
      <div
        className="fixed inset-0 z-0"
        style={{
          backgroundImage: `
            linear-gradient(135deg, 
              #738fbd 0%,
              #a8c3d4 20%,
              #dbd6df 40%,
              #ecc6c7 60%,
              #db88a4 80%,
              #cc8eb1 100%
            )
          `,
          opacity: 0.3,
        }}
      />

      <Nav />

      <div className="relative z-10 flex-1">
        <div className="max-w-7xl mx-auto px-6 py-20 pt-32">
          <div className="text-center space-y-4 mb-16">
            <h1 className={`text-4xl font-bold text-gray-900 ${language === "en" ? "font-serif" : "font-serif-zh"}`}>
              {content[language].title}
            </h1>
            <p
              className={`text-xl bg-gradient-to-r from-[#738fbd] via-[#db88a4] to-[#cc8eb1] bg-clip-text text-transparent max-w-xl mx-auto ${
                language === "en" ? "font-serif" : "font-serif-zh"
              }`}
            >
              {content[language].subtitle}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-16">
            {plans[language].map((plan) => (
              <div
                key={plan.name}
                className={`relative bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-sm border border-gray-100
                  ${plan.popular ? "ring-2 ring-[#738fbd]" : ""}
                `}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="bg-gradient-to-r from-[#738fbd] to-[#cc8eb1] text-white px-3 py-1 rounded-full text-sm">
                      {content[language].mostPopular}
                    </span>
                  </div>
                )}

                <div className="space-y-6">
                  <div>
                    <h2
                      className={`text-2xl font-bold text-gray-900 ${language === "en" ? "font-serif" : "font-serif-zh"}`}
                    >
                      {plan.name}
                    </h2>
                    <p className={`text-gray-600 mt-2 text-sm ${language === "en" ? "font-serif" : "font-serif-zh"}`}>
                      {plan.description}
                    </p>
                  </div>

                  <div className="flex items-baseline gap-2">
                    <span
                      className={`text-4xl font-bold text-gray-900 ${language === "en" ? "font-serif" : "font-serif-zh"}`}
                    >
                      ${plan.price}
                    </span>
                    {plan.originalPrice && (
                      <>
                        <span className="text-gray-500 line-through">${plan.originalPrice}</span>
                        <span className="text-[#cc8eb1] font-semibold">
                          {content[language].currentDiscount} {Math.round((1 - Number(plan.price) / Number(plan.originalPrice)) * 100)}%{" "}
                          {content[language].off}
                        </span>
                      </>
                    )}
                    {plan.price !== "0" && <span className="text-gray-500">/{language === "en" ? "mo" : "月"}</span>}
                  </div>

                  <ul className="space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start">
                        <Check className="h-5 w-5 text-[#738fbd] shrink-0" />
                        <span className={`text-gray-600 ml-2 ${language === "en" ? "font-serif" : "font-serif-zh"}`}>
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    className={`w-full rounded-full ${
                      plan.popular
                        ? "bg-gradient-to-r from-[#738fbd] to-[#cc8eb1] hover:opacity-90 text-white"
                        : "bg-gray-50 hover:bg-gray-100 text-gray-900"
                    } ${language === "en" ? "font-serif" : "font-serif-zh"}`}
                    onClick={plan.name.toLowerCase().includes("subscription") || plan.name.toLowerCase().includes("订阅") ? () => handleSubscribe() : undefined}
                    disabled={
                      ((plan.name.toLowerCase().includes("subscription") || plan.name.toLowerCase().includes("订阅")) && isVIP) || 
                      isLoading || 
                      (!(plan.name.toLowerCase().includes("subscription") || plan.name.toLowerCase().includes("订阅")) && !isVIP)
                    }
                  >
                    {(plan.name.toLowerCase().includes("subscription") || plan.name.toLowerCase().includes("订阅")) ? 
                      (isVIP ? 
                        (language === "en" ? "Current Plan" : "当前方案") : 
                        (isLoading ? 
                          (language === "en" ? "Processing..." : "处理中...") : 
                          plan.cta)
                      ) : 
                      (!isVIP ? (language === "en" ? "Current Plan" : "当前方案") : plan.cta)}
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-sm border border-gray-100 mb-16">
            <h2
              className={`text-2xl font-bold text-gray-900 mb-6 ${language === "en" ? "font-serif" : "font-serif-zh"}`}
            >
              {language === "en" ? "Credit Packages" : "点数套餐"}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {creditPackages[language].map((pkg) => (
                <Card
                  key={pkg.credits}
                  className={`relative overflow-hidden transition-all duration-300 hover:shadow-md hover:translate-y-[-4px] ${
                    pkg.bestValue 
                      ? "border-amber-300 shadow-amber-200/30 bg-gradient-to-b from-white to-amber-50/40" 
                      : "border-gray-200 hover:border-[#cc8eb1]/30 bg-white"
                  }`}
                >
                  {pkg.bestValue && (
                    <div className="absolute top-0 right-0">
                      <div
                        className={`text-xs font-bold px-4 py-1 rounded-bl bg-gradient-to-r from-amber-100 to-amber-200 text-amber-900 ${
                          language === "en" ? "font-serif" : "font-serif-zh"
                        }`}
                      >
                        {content[language].bestValue}
                      </div>
                    </div>
                  )}

                  <div className="p-5 flex flex-col h-full">
                    <div className="mb-3">
                      <h3 className={`text-xl font-semibold ${language === "en" ? "font-serif" : "font-serif-zh"}`}>
                        {pkg.credits} {language === "en" ? "Credits" : "积分"}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {language === "en" 
                          ? `Generate ${Math.floor(pkg.credits/10)} premium letters` 
                          : `可生成 ${Math.floor(pkg.credits/10)} 封高级信件`}
                      </p>
                    </div>

                    <div className="flex items-baseline gap-2 mb-4">
                      <span className={`text-3xl font-bold text-gray-900 ${language === "en" ? "font-serif" : "font-serif-zh"}`}>
                        ${pkg.price}
                      </span>
                      {pkg.originalPrice && (
                        <span className="text-sm text-gray-500 line-through">${pkg.originalPrice}</span>
                      )}
                    </div>

                    {pkg.originalPrice && (
                      <div className="mb-4 text-sm px-3 py-1 rounded-full bg-gradient-to-r from-[#738fbd]/10 to-[#cc8eb1]/10 text-[#cc8eb1] font-medium inline-block">
                        <span className="flex items-center gap-1">
                          <span>⚡</span>
                          <span>{Math.round(((pkg.originalPrice - pkg.price) / pkg.originalPrice) * 100)}% {content[language].off}</span>
                        </span>
                      </div>
                    )}
                    
                    <div className="my-4 border-t border-gray-100"></div>
                    
                    <div className={`text-sm text-gray-700 mb-4 ${language === "en" ? "font-serif" : "font-serif-zh"}`}>
                      {pkg.bestValue 
                        ? (language === "en" ? "✨ Our most popular option" : "✨ 我们最受欢迎的选择") 
                        : (language === "en" ? "✓ Never expires" : "✓ 永不过期")}
                    </div>

                    <div className="mt-auto">
                      {isCheckoutLoading === pkg.credits ? (
                        <ButtonLoading 
                          size="default" 
                          className={`w-full rounded-full ${pkg.bestValue 
                            ? "bg-gradient-to-r from-[#738fbd] to-[#cc8eb1] text-white" 
                            : ""}`}
                          isLoading={true}
                        >
                          {language === "en" ? "Processing..." : "处理中..."}
                        </ButtonLoading>
                      ) : (
                        <Button
                          size="default"
                          variant={pkg.bestValue ? "default" : "outline"}
                          className={`w-full rounded-full transition-all ${
                            pkg.bestValue 
                              ? "bg-gradient-to-r from-[#738fbd] to-[#cc8eb1] hover:opacity-90 text-white" 
                              : "hover:bg-gradient-to-r hover:from-[#738fbd]/10 hover:to-[#cc8eb1]/10 border-[#cc8eb1]/30"
                          } ${language === "en" ? "font-serif" : "font-serif-zh"}`}
                          onClick={() => handleBuyCredits(pkg.credits)}
                          disabled={isCheckoutLoading !== null}
                        >
                          {language === "en" ? "Buy Now" : "立即购买"}
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          <div className="text-center mb-16">
            <p className={`text-sm text-gray-600 ${language === "en" ? "font-serif" : "font-serif-zh"}`}>
              {content[language].termsAndPrivacy}
              <Link href="/terms" className="text-[#738fbd] hover:text-[#cc8eb1] transition-colors">
                {content[language].terms}
              </Link>
              {content[language].and}
              <Link href="/privacy" className="text-[#738fbd] hover:text-[#cc8eb1] transition-colors">
                {content[language].privacyPolicy}
              </Link>
            </p>
          </div>

          <div className="mb-16">
            <h2
              className={`text-3xl font-bold text-gray-900 mb-8 text-center ${
                language === "en" ? "font-serif" : "font-serif-zh"
              }`}
            >
              {content[language].faqTitle}
            </h2>
            <div className="max-w-3xl mx-auto">
              <FAQList questions={allQuestions} language={language} />
            </div>
          </div>

          <div className="mt-16 text-center space-y-4">
            <h3 className={`text-xl font-bold text-gray-900 ${language === "en" ? "font-serif" : "font-serif-zh"}`}>
              {content[language].includedFeatures}
            </h3>
            <div className="flex flex-wrap justify-center gap-8 text-sm text-gray-600">
              {content[language].features.map((feature, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-[#738fbd]" />
                  <span className={language === "en" ? "font-serif" : "font-serif-zh"}>{feature}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-16 text-center">
            <p className={`text-sm text-gray-500 ${language === "en" ? "font-serif" : "font-serif-zh"}`}>
              {content[language].cta}
              <Link href="mailto:sean@behindmemory.com" className="text-[#738fbd] hover:text-[#cc8eb1] transition-colors ml-1">
                {content[language].contact}
              </Link>
            </p>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}

