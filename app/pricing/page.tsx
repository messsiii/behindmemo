'use client'

import { BetaAlert } from '@/components/BetaAlert'
import { Footer } from '@/components/footer'
import { Nav } from '@/components/nav'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/contexts/LanguageContext'
import { Check } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

const content = {
  en: {
    title: 'Choose Your Creative Plan',
    subtitle:
      "Whether it's occasional heartfelt messages or continuous emotional expression, we have the right plan for you",
    cta: 'Need more information?',
    contact: 'Contact us',
    includedFeatures: 'All plans include',
    features: [
      '14-day money-back guarantee',
      'Free technical support',
      'Secure privacy protection',
      'Continuous feature updates',
    ],
  },
  zh: {
    title: '选择你的创作计划',
    subtitle: '无论是偶尔的心意传达，还是持续的情感表达， 我们都为你准备了合适的方案',
    cta: '需要更多信息？',
    contact: '联系我们',
    includedFeatures: '所有计划都包含',
    features: ['14天无理由退款', '免费技术支持', '安全隐私保护', '持续功能更新'],
  },
}

const plans = {
  en: [
    {
      name: 'Basic',
      price: '4.99',
      description: 'Perfect for individuals starting their AI love letter journey',
      features: [
        '20 letter credits included',
        'Basic emotion analysis',
        '3 writing styles',
        'Digital letter collection',
      ],
      cta: 'Get Started',
      popular: false,
    },
    {
      name: 'Creator',
      price: '9.99',
      description: 'Unleash your creativity, make every letter unique',
      features: [
        '50 letter credits included',
        'Advanced emotion analysis',
        '10 writing styles',
        'Digital letter collection',
        'Emotional tone adjustment',
        'Memory archive system',
      ],
      cta: 'Start Now',
      popular: true,
    },
    {
      name: 'Lifetime',
      price: '99',
      description: 'One-time payment, lifetime usage',
      features: [
        '50 letter credits per month',
        'Advanced emotion analysis',
        'All writing styles',
        'Digital letter collection',
        'Emotional tone adjustment',
        'Memory archive system',
        'Priority customer support',
      ],
      cta: 'Choose Lifetime',
      popular: false,
    },
  ],
  zh: [
    {
      name: '基础版',
      price: '29',
      description: '适合个人使用，开启AI情书创作之旅',
      features: [
        '赠送20次创作配额',
        '基础情感分析',
        '3种写作风格',
        '数字信件收藏'
      ],
      cta: '开始体验',
      popular: false,
    },
    {
      name: '创作者版',
      price: '79',
      description: '释放创意，让每一封信都独一无二',
      features: [
        '赠送50次创作配额',
        '高级情感分析',
        '10种写作风格',
        '数字信件收藏',
        '情感色温调节',
        '记忆存档系统',
      ],
      cta: '立即开始',
      popular: true,
    },
    {
      name: '永久版',
      price: '599',
      description: '一次付费，终身使用',
      features: [
        '每月赠送50次创作配额',
        '高级情感分析',
        '全部写作风格',
        '数字信件收藏',
        '情感色温调节',
        '记忆存档系统',
        '优先客户支持',
      ],
      cta: '选择永久版',
      popular: false,
    },
  ],
}

export default function Pricing() {
  const { language } = useLanguage()
  const [showBetaAlert, setShowBetaAlert] = useState(false)

  const handleSubscribe = (e: React.MouseEvent) => {
    e.preventDefault()
    setShowBetaAlert(true)
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
        <div className="max-w-6xl mx-auto px-6 py-20 pt-32">
          <div className="text-center space-y-4 mb-16">
            <h1
              className={`text-4xl font-bold text-gray-900 ${language === 'en' ? 'font-serif' : 'font-serif-zh'}`}
            >
              {content[language].title}
            </h1>
            <p
              className={`text-xl bg-gradient-to-r from-[#738fbd] via-[#db88a4] to-[#cc8eb1] bg-clip-text text-transparent max-w-xl mx-auto ${
                language === 'en' ? 'font-serif' : 'font-serif-zh'
              }`}
            >
              {content[language].subtitle}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {plans[language].map(plan => (
              <div
                key={plan.name}
                className={`relative bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-sm border border-gray-100
                  ${plan.popular ? 'ring-2 ring-[#738fbd]' : ''}
                `}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="bg-gradient-to-r from-[#738fbd] to-[#cc8eb1] text-white px-3 py-1 rounded-full text-sm">
                      {language === 'en' ? 'Most Popular' : '最受欢迎'}
                    </span>
                  </div>
                )}

                <div className="space-y-6">
                  <div>
                    <h2
                      className={`text-2xl font-bold text-gray-900 ${language === 'en' ? 'font-serif' : 'font-serif-zh'}`}
                    >
                      {plan.name}
                    </h2>
                    <p
                      className={`text-gray-600 mt-2 text-sm ${language === 'en' ? 'font-serif' : 'font-serif-zh'}`}
                    >
                      {plan.description}
                    </p>
                  </div>

                  <div className="flex items-baseline gap-1">
                    <span
                      className={`text-3xl text-gray-900 ${language === 'en' ? 'font-serif' : 'font-serif-zh'}`}
                    >
                      {language === 'en' ? '$' : '¥'}
                    </span>
                    <span
                      className={`text-4xl text-gray-900 ${language === 'en' ? 'font-serif' : 'font-serif-zh'}`}
                    >
                      {plan.price}
                    </span>
                    {plan.name !== (language === 'en' ? 'Lifetime' : '永久版') && (
                      <span className="text-gray-500">/{language === 'en' ? 'mo' : '月'}</span>
                    )}
                  </div>

                  <ul className="space-y-3">
                    {plan.features.map(feature => (
                      <li key={feature} className="flex items-start gap-3 text-sm">
                        <Check className="h-5 w-5 text-[#738fbd] shrink-0" />
                        <span
                          className={`text-gray-600 ${language === 'en' ? 'font-serif' : 'font-serif-zh'}`}
                        >
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    className={`w-full rounded-full ${
                      plan.popular
                        ? 'bg-gradient-to-r from-[#738fbd] to-[#cc8eb1] hover:opacity-90 text-white'
                        : 'bg-gray-50 hover:bg-gray-100 text-gray-900'
                    } ${language === 'en' ? 'font-serif' : 'font-serif-zh'}`}
                    onClick={handleSubscribe}
                  >
                    {plan.cta}
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-16 text-center space-y-4">
            <h3
              className={`text-xl font-bold text-gray-900 ${language === 'en' ? 'font-serif' : 'font-serif-zh'}`}
            >
              {content[language].includedFeatures}
            </h3>
            <div className="flex flex-wrap justify-center gap-8 text-sm text-gray-600">
              {content[language].features.map((feature, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-[#738fbd]" />
                  <span className={language === 'en' ? 'font-serif' : 'font-serif-zh'}>
                    {feature}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-16 text-center">
            <p
              className={`text-sm text-gray-500 ${language === 'en' ? 'font-serif' : 'font-serif-zh'}`}
            >
              {content[language].cta}
              <Link
                href="/contact"
                className="text-[#738fbd] hover:text-[#cc8eb1] transition-colors ml-1"
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
