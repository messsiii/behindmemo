'use client'

import { useLanguage } from '@/contexts/LanguageContext'
import Link from 'next/link'
import { useEffect, useState } from 'react'

export function Footer() {
  const { language } = useLanguage()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const content = {
    en: {
      copyright: '© 2025 Behind Memory. All rights reserved.',
    },
    zh: {
      copyright: '© 2025 Behind Memory. 保留所有权利。',
    },
  }

  const links = [
    { href: '/about', label: language === 'en' ? 'About' : '关于' },
    { href: '/terms', label: language === 'en' ? 'Terms' : '服务条款' },
    { href: '/privacy', label: language === 'en' ? 'Privacy' : '隐私政策' },
  ]

  // 在客户端渲染前返回一个骨架屏
  if (!mounted) {
    return (
      <footer className="relative z-10 py-6 bg-white/80 backdrop-blur-sm border-t">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="flex items-center space-x-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="w-10 h-4 bg-gray-200 animate-pulse rounded" />
              ))}
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
          <nav className="flex flex-wrap items-center gap-6">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-gray-700 hover:text-gray-900 transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="text-sm text-gray-700">{content[language].copyright}</div>
        </div>
      </div>
    </footer>
  )
}
