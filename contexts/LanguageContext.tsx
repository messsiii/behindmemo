'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

type Language = 'en' | 'zh'

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  toggleLanguage: () => void
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // 使用状态来跟踪客户端挂载
  const [mounted, setMounted] = useState(false)
  const [language, setLanguage] = useState<Language>('zh') // 默认使用中文

  // 在客户端首次加载时设置语言
  useEffect(() => {
    setMounted(true)
    const savedLanguage = localStorage.getItem('preferred_language')
    if (savedLanguage === 'en' || savedLanguage === 'zh') {
      setLanguage(savedLanguage)
    } else {
      // 如果没有保存的语言设置，使用浏览器语言
      const browserLang = navigator.language.toLowerCase()
      const defaultLang = browserLang.includes('zh') ? 'zh' : 'en'
      setLanguage(defaultLang)
      localStorage.setItem('preferred_language', defaultLang)
    }
  }, [])

  const handleSetLanguage = (lang: Language) => {
    if (mounted) {
      setLanguage(lang)
      localStorage.setItem('preferred_language', lang)
    }
  }

  const toggleLanguage = () => {
    const newLang = language === 'en' ? 'zh' : 'en'
    handleSetLanguage(newLang)
  }

  // 在客户端渲染前使用默认值
  if (!mounted) {
    return (
      <LanguageContext.Provider
        value={{
          language: 'zh',
          setLanguage: () => {},
          toggleLanguage: () => {},
        }}
      >
        {children}
      </LanguageContext.Provider>
    )
  }

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage: handleSetLanguage,
        toggleLanguage,
      }}
    >
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}
