'use client'

import { BetaAlert } from '@/components/BetaAlert'
import { Footer } from '@/components/footer'
import { Nav } from '@/components/nav'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/contexts/LanguageContext'
import { Check } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'

const content = {
  en: {
    title: "Choose Your Plan",
    subtitle: "Find the perfect plan to create your heartfelt letters",
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
  },
  zh: {
    title: "选择你的计划",
    subtitle: "找到最适合创作你的真挚信件的方案",
    cta: "需要更多信息？",
    contact: "联系我们",
    includedFeatures: "所有计划都包含",
    features: ["上传照片", "提交写信人和收信人名称", "描述你的故事", "AI驱动的信件生成"],
    currentDiscount: "当前折扣",
    off: "优惠",
    creditsDiscount: "点数折扣",
    mostPopular: "最受欢迎",
    bestValue: "最优惠",
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
        "200 credits per month for premium features",
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
        "每月赠送200个点数用于高级功能",
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
    { credits: 10, price: 0.99, originalPrice: 1.99 },
    { credits: 100, price: 10, originalPrice: 19.9 },
    { credits: 500, price: 38.9, originalPrice: 89.9 },
    { credits: 1000, price: 64.9, originalPrice: 159.9, bestValue: true },
  ],
  zh: [
    { credits: 10, price: 0.99, originalPrice: 1.99 },
    { credits: 100, price: 10, originalPrice: 19.9 },
    { credits: 500, price: 38.9, originalPrice: 89.9 },
    { credits: 1000, price: 64.9, originalPrice: 159.9, bestValue: true },
  ],
}

export default function Pricing() {
  const { language } = useLanguage()
  const [showBetaAlert, setShowBetaAlert] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleSubscribe = (e: React.MouseEvent) => {
    e.preventDefault()
    setShowBetaAlert(true)
  }

  if (!mounted) {
    return (
      <div className="min-h-screen flex flex-col">
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
              <div className="h-12 w-96 mx-auto bg-white/20 animate-pulse rounded-lg" />
              <div className="h-8 w-80 mx-auto bg-white/20 animate-pulse rounded-lg" />
            </div>
            <div className="grid md:grid-cols-2 gap-8 mb-16">
              {[1, 2].map((i) => (
                <div key={i} className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-sm border border-gray-100 animate-pulse">
                  <div className="space-y-6">
                    <div className="h-8 w-48 bg-gray-200 rounded" />
                    <div className="h-4 w-full bg-gray-200 rounded" />
                    <div className="h-24 w-full bg-gray-200 rounded" />
                    <div className="h-12 w-full bg-gray-200 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
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
                          {content[language].currentDiscount} {Math.round((1 - parseInt(plan.price) / parseInt(plan.originalPrice)) * 100)}%{" "}
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
                    onClick={handleSubscribe}
                  >
                    {plan.cta}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {creditPackages[language].map((pkg, index) => (
                <div
                  key={index}
                  className={`relative ${
                    pkg.bestValue
                      ? "bg-gradient-to-br from-[#738fbd] to-[#cc8eb1] text-white transform scale-105 z-10"
                      : "bg-gray-50 text-gray-900"
                  } rounded-lg p-4 text-center transition-all duration-300 hover:shadow-lg ${
                    pkg.bestValue ? "shadow-md" : ""
                  }`}
                >
                  {pkg.bestValue && (
                    <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-yellow-400 text-gray-900 px-2 py-1 rounded text-xs font-bold">
                      {language === "en" ? "Best Value" : "最优惠"}
                    </div>
                  )}
                  <h3 className={`text-lg font-semibold ${language === "en" ? "font-serif" : "font-serif-zh"}`}>
                    {pkg.credits} {language === "en" ? "Credits" : "点数"}
                  </h3>
                  <div className="mt-2">
                    <span className={`text-2xl font-bold ${pkg.bestValue ? "text-white" : "text-gray-900"}`}>
                      ${pkg.price}
                    </span>
                    <span className={`text-sm ml-2 ${pkg.bestValue ? "text-gray-200" : "text-gray-500"} line-through`}>
                      ${pkg.originalPrice}
                    </span>
                  </div>
                  {pkg.bestValue && (
                    <p className="mt-2 text-sm">{language === "en" ? "Most popular choice!" : "最受欢迎的选择！"}</p>
                  )}
                </div>
              ))}
            </div>
            <div className="text-center">
              <Button
                className="rounded-full bg-gradient-to-r from-[#738fbd] to-[#cc8eb1] hover:opacity-90 text-white px-8 py-3 text-lg"
                onClick={handleSubscribe}
              >
                {language === "en" ? "Choose Your Credit Package" : "选择你的点数套餐"}
              </Button>
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
              <Link 
                href="mailto:sean@behindmemory.com" 
                className="text-[#738fbd] hover:text-[#cc8eb1] transition-colors ml-1 hover:underline"
              >
                {content[language].contact}
              </Link>
            </p>
          </div>
        </div>
      </div>

      <Footer />
      
      <BetaAlert open={showBetaAlert} onOpenChange={setShowBetaAlert} />
    </div>
  )
}
