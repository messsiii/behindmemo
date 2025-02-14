'use client'

import FeatureSection from '@/components/FeatureSection'
import { Footer } from '@/components/footer'
import { Nav } from '@/components/nav'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/contexts/LanguageContext'
import { motion } from 'framer-motion'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { useEffect, useState } from 'react'

export default function Home() {
  const { language } = useLanguage()
  const [mounted, setMounted] = useState(false)
  const [_scrollY, setScrollY] = useState(0)
  const { status } = useSession()

  useEffect(() => {
    setMounted(true)
    const handleScroll = () => {
      setScrollY(window.scrollY)
    }

    window.addEventListener('scroll', handleScroll)
    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  // 在客户端渲染前返回一个占位内容
  if (!mounted) {
    return (
      <div className="min-h-screen flex flex-col">
        <div className="fixed inset-0 z-0 opacity-30 bg-gradient-to-br from-rose-500/10 via-purple-500/10 to-blue-500/10" />
        <Nav />
        <div className="relative z-10 flex-1">
          <section className="relative h-screen flex items-center justify-center">
            <div className="container mx-auto px-4">
              <div className="max-w-4xl mx-auto text-center space-y-8">
                <div className="h-12 w-3/4 mx-auto bg-gray-200 animate-pulse rounded" />
                <div className="h-8 w-1/2 mx-auto bg-gray-200 animate-pulse rounded" />
                <div className="h-24 w-2/3 mx-auto bg-gray-200 animate-pulse rounded" />
                <div className="h-12 w-48 mx-auto bg-gray-200 animate-pulse rounded-full" />
              </div>
            </div>
          </section>
        </div>
        <Footer />
      </div>
    )
  }

  const content = {
    en: {
      hero: {
        title: 'Turn Photos into Letters, Memories into Words',
        subtitle:
          'Not just another AI writer - we help you express your true feelings to the ones you love',
        description:
          "Unlike traditional AI writers, we don't generate generic letters. We help you find your own words, turn your photos into inspiration, and guide you through emotional expression.",
        cta: 'Start Writing',
      },
      features: [
        {
          title: 'Photo-Triggered Authenticity',
          description:
            "From Memory to Message: Upload a photo of you and your loved ones, and let the memories guide your words. Every photo tells a story - let's tell yours.",
        },
        {
          title: 'Guided Expression',
          description:
            "We Don't Write For You - We Write With You. Through personal writing guidance and thoughtful prompts based on your photos, we help you tell your story in your own voice.",
        },
        {
          title: 'Emotional Connection',
          description:
            'Beyond Words: Create lasting emotional connections through beautiful photo-letter designs. Perfect for parents, partners, and friends - turn your feelings into lasting memories.',
        },
      ],
      cta: {
        title: 'Ready to express your true feelings?',
        description:
          '✓ No generic letters\n✓ Your own words, your story\n✓ Photos as inspiration\n✓ Guided emotional expression',
        button: 'Begin Your Journey',
      },
    },
    zh: {
      hero: {
        title: '照片化为文字，回忆成就情书',
        subtitle: '不只是AI写作 - 我们帮你向爱的人表达真挚情感',
        description:
          '不同于传统AI写作，我们不生成模板化的内容。我们帮你找到自己的语言，将照片转化为灵感，引导你表达真实情感。',
        cta: '开始写作',
      },
      features: [
        {
          title: '照片激发真实情感',
          description:
            '从回忆到文字：上传你和挚爱的照片，让回忆指引文字。每张照片都是一个故事 - 让我们讲述你的故事。',
        },
        {
          title: '引导式写作体验',
          description:
            '我们不替你写 - 我们与你同写。通过个性化写作指导和基于照片的智能提示，帮助你用自己的声音讲述故事。',
        },
        {
          title: '情感连接',
          description:
            '超越文字：通过精美的照片信件设计创造持久的情感连接。适合父母、伴侣和朋友 - 将感情化作永恒回忆。',
        },
      ],
      cta: {
        title: '准备好表达真挚情感了吗？',
        description: '✓ 告别模板化内容\n✓ 你的文字，你的故事\n✓ 照片化作灵感\n✓ 情感表达引导',
        button: '开启心动之旅',
      },
    },
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
        {/* Hero Section */}
        <section className="relative h-screen flex items-center justify-center overflow-hidden">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto text-center">
              <motion.h1
                className={`text-5xl sm:text-7xl font-bold mb-6 text-gray-900 ${
                  language === 'en' ? 'font-serif' : 'font-serif-zh'
                }`}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.2 }}
              >
                {content[language].hero.title}
              </motion.h1>
              <motion.p
                className={`text-3xl sm:text-4xl mb-8 bg-gradient-to-r from-[#738fbd] via-[#db88a4] to-[#cc8eb1] bg-clip-text text-transparent ${
                  language === 'en' ? 'font-serif' : 'font-serif-zh'
                }`}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.4 }}
              >
                {content[language].hero.subtitle}
              </motion.p>
              <motion.p
                className={`text-xl text-gray-600 mb-12 max-w-2xl mx-auto ${language === 'en' ? 'font-literary' : ''}`}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.6 }}
              >
                {content[language].hero.description}
              </motion.p>
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.8 }}
              >
                <Button
                  className="rounded-full bg-gradient-to-r from-[#738fbd] to-[#cc8eb1] hover:opacity-90 text-white px-8 py-6 text-lg"
                  asChild
                >
                  <Link href={status === 'authenticated' ? '/write' : '/auth/signin?callbackUrl=/write&source=hero'}>
                    {content[language].hero.cta}
                  </Link>
                </Button>
              </motion.div>
            </div>
          </div>
          <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2">
            <motion.div
              animate={{
                y: [0, 10, 0],
              }}
              transition={{
                duration: 1.5,
                repeat: Number.POSITIVE_INFINITY,
                repeatType: 'reverse',
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-[#738fbd]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 14l-7 7m0 0l-7-7m7 7V3"
                />
              </svg>
            </motion.div>
          </div>
        </section>

        {/* Feature Sections */}
        {content[language].features.map((feature, index) => (
          <section key={index} className="py-20">
            <FeatureSection
              title={feature.title}
              description={feature.description}
              imageSrc={`/images/features/feature-${index + 1}.webp`}
              imageAlt={`${feature.title} feature showcase`}
              reverse={index % 2 !== 0}
              language={language}
            />
          </section>
        ))}

        {/* Call to Action Section */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="text-center space-y-8 max-w-3xl mx-auto">
              <h2
                className={`text-4xl font-bold leading-tight text-gray-900 ${
                  language === 'en' ? 'font-serif' : 'font-serif-zh'
                }`}
              >
                {content[language].cta.title}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left max-w-2xl mx-auto">
                {content[language].cta.description.split('\n').map((point, index) => (
                  <div
                    key={index}
                    className="flex items-start space-x-3 bg-white/50 backdrop-blur-sm p-4 rounded-lg"
                  >
                    <span className="text-primary font-bold">{point.split(' ')[0]}</span>
                    <span className="text-gray-700">{point.split(' ').slice(1).join(' ')}</span>
                  </div>
                ))}
              </div>
              <Button
                size="lg"
                className={`rounded-full bg-gradient-to-r from-[#738fbd] to-[#cc8eb1] hover:opacity-90 text-white px-8 py-6 text-lg mt-8 ${
                  language === 'en' ? 'font-serif' : 'font-serif-zh'
                }`}
                asChild
              >
                <Link href={status === 'authenticated' ? '/write' : '/auth/signin?callbackUrl=/write&source=cta'}>
                  {content[language].cta.button}
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </div>

      <Footer />
    </div>
  )
}
