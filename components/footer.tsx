"use client"

import Link from "next/link"
import { useLanguage } from "@/contexts/LanguageContext"
import { Twitter, Instagram } from "lucide-react"

const content = {
  en: {
    about: "About",
    pricing: "Pricing",
    terms: "Terms",
    privacy: "Privacy",
  },
  zh: {
    about: "关于",
    pricing: "定价",
    terms: "条款",
    privacy: "隐私",
  },
}

export function Footer() {
  const { language } = useLanguage()

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    })
  }

  return (
    <footer className="relative z-50 py-6 mt-auto">
      <div className="absolute inset-0 bg-white/10 backdrop-blur-xl" />

      <div className="container relative mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <Link
              href="/about"
              className="text-sm text-gray-700 hover:text-gray-900 transition-colors"
              onClick={scrollToTop}
            >
              {content[language].about}
            </Link>
            <Link
              href="/pricing"
              className="text-sm text-gray-700 hover:text-gray-900 transition-colors"
              onClick={scrollToTop}
            >
              {content[language].pricing}
            </Link>
            <Link
              href="/terms"
              className="text-sm text-gray-700 hover:text-gray-900 transition-colors"
              onClick={scrollToTop}
            >
              {content[language].terms}
            </Link>
            <Link
              href="/privacy"
              className="text-sm text-gray-700 hover:text-gray-900 transition-colors"
              onClick={scrollToTop}
            >
              {content[language].privacy}
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="https://twitter.com"
              className="text-gray-600 hover:text-gray-900 transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Twitter className="h-5 w-5" />
            </Link>
            <Link
              href="https://instagram.com"
              className="text-gray-600 hover:text-gray-900 transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Instagram className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}

