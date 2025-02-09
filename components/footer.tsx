'use client'

import Link from 'next/link'
import { useLanguage } from '@/contexts/LanguageContext'
import { useState, useEffect } from 'react'

export function Footer() {
  const { language } = useLanguage()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const content = {
    en: {
      terms: 'Terms',
      privacy: 'Privacy',
      copyright: '© 2024 AI Love Letter. All rights reserved.',
    },
    zh: {
      terms: '条款',
      privacy: '隐私',
      copyright: '© 2024 AI Love Letter. 保留所有权利。',
    },
  }

  // 在客户端渲染前返回一个骨架屏
  if (!mounted) {
    return (
      <footer className="relative z-10 py-6 bg-white/80 backdrop-blur-sm border-t">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="flex items-center space-x-6">
              <div className="w-10 h-4 bg-gray-200 animate-pulse rounded" />
              <div className="w-10 h-4 bg-gray-200 animate-pulse rounded" />
              <div className="w-10 h-4 bg-gray-200 animate-pulse rounded" />
            </div>
            <div className="w-48 h-4 bg-gray-200 animate-pulse rounded" />
          </div>
        </div>
      </footer>
    )
  }

  return (
    <footer className="relative z-10 py-6 bg-white/80 backdrop-blur-sm border-t">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <div className="flex items-center space-x-6">
            <Link
              href="/terms"
              className="text-sm text-gray-700 hover:text-gray-900 transition-colors"
            >
              {content[language].terms}
            </Link>
            <Link
              href="/privacy"
              className="text-sm text-gray-700 hover:text-gray-900 transition-colors"
            >
              {content[language].privacy}
            </Link>
          </div>
          <div className="text-sm text-gray-700">{content[language].copyright}</div>
        </div>
      </div>
    </footer>
  )
}
