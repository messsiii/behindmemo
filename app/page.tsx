"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import FeatureSection from "@/components/FeatureSection"
import { useLanguage } from "@/contexts/LanguageContext"
import { Nav } from "@/components/nav"
import { Footer } from "@/components/footer"

export default function Home() {
  const { language } = useLanguage()
  const [_scrollY, setScrollY] = useState(0)

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY)
    }

    window.addEventListener("scroll", handleScroll)

    return () => {
      window.removeEventListener("scroll", handleScroll)
    }
  }, [])

  const content = {
    en: {
      hero: {
        title: "Express Your Heart",
        subtitle: "Words that connect souls.",
        description:
          "In this digital age, let AI help you express your deepest emotions. Whether it's to family, friends, or someone special - make every word meaningful.",
        cta: "Start Writing",
      },
      features: [
        {
          title: "Cherished Memories",
          description:
            '"Remember the little moments that matter?" AI helps you capture the essence of your precious memories.',
        },
        {
          title: "Emotional Resonance",
          description:
            "Our unique emotional tone technology helps you find the perfect words to express your feelings.",
        },
        {
          title: "Genuine Connection",
          description:
            "Maintaining the authenticity of your voice while helping you articulate your thoughts more clearly.",
        },
      ],
      cta: {
        title: "Ready to strengthen your connections?",
        description:
          "Whether it's gratitude, appreciation, or deep emotional bonds, let AI help you express what's in your heart.",
        button: "Begin Your Journey",
      },
    },
    zh: {
      hero: {
        title: "传递心意",
        subtitle: "连接心灵的桥梁。",
        description: "在这个数字化时代，让AI助你表达内心情感。无论是对家人、朋友还是特别的人，让每一字都充满意义。",
        cta: "开始写作",
      },
      features: [
        {
          title: "珍贵回忆",
          description: "「还记得那些重要的小时刻吗？」AI帮你捕捉记忆中最珍贵的瞬间",
        },
        {
          title: "情感共鸣",
          description: "独特的情感语调技术，帮你找到表达心意的最佳方式",
        },
        {
          title: "真诚连接",
          description: "保持你的真实声音，同时帮助你更清晰地表达想法",
        },
      ],
      cta: {
        title: "准备好加深情感连接了吗？",
        description: "无论是感恩、欣赏还是深厚的情感羁绊，让AI助你表达内心所想",
        button: "开启旅程",
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
            <div className="max-w-4xl mx-auto text-center">
              <motion.h1
                className={`text-5xl sm:text-7xl font-bold mb-6 text-gray-900 ${
                  language === "en" ? "font-serif" : "font-serif-zh"
                }`}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.2 }}
              >
                {content[language].hero.title}
              </motion.h1>
              <motion.p
                className={`text-3xl sm:text-4xl mb-8 bg-gradient-to-r from-[#738fbd] via-[#db88a4] to-[#cc8eb1] bg-clip-text text-transparent ${
                  language === "en" ? "font-serif" : "font-serif-zh"
                }`}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.4 }}
              >
                {content[language].hero.subtitle}
              </motion.p>
              <motion.p
                className={`text-xl text-gray-600 mb-12 max-w-2xl mx-auto ${language === "en" ? "font-literary" : ""}`}
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
                  className={`rounded-full bg-gradient-to-r from-[#738fbd] to-[#cc8eb1] hover:opacity-90 text-white px-8 py-6 text-lg ${
                    language === "en" ? "font-serif" : "font-serif-zh"
                  }`}
                  asChild
                >
                  <Link href="/write">{content[language].hero.cta}</Link>
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
                repeatType: "reverse",
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-[#738fbd]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
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
              imageSrc="/placeholder.svg?height=800&width=1200"
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
                  language === "en" ? "font-serif" : "font-serif-zh"
                }`}
              >
                {content[language].cta.title}
              </h2>
              <p className={`text-xl text-gray-600 ${language === "en" ? "font-literary" : ""}`}>
                {content[language].cta.description}
              </p>
              <Button
                size="lg"
                className={`rounded-full bg-gradient-to-r from-[#738fbd] to-[#cc8eb1] hover:opacity-90 text-white px-8 py-6 text-lg ${
                  language === "en" ? "font-serif" : "font-serif-zh"
                }`}
                asChild
              >
                <Link href="/write">{content[language].cta.button}</Link>
              </Button>
            </div>
          </div>
        </section>
      </div>

      <Footer />
    </div>
  )
}

