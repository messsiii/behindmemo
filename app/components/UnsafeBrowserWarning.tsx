'use client'

import { Button } from '@/components/ui/button'
import { useLanguage } from '@/contexts/LanguageContext'
import { ExternalLink } from 'lucide-react'
import { useEffect, useState } from 'react'

export function UnsafeBrowserWarning() {
  const { language } = useLanguage()
  const [isUnsafeEnvironment, setIsUnsafeEnvironment] = useState(false)
  const [mounted, setMounted] = useState(false)
  
  // 内容翻译
  const content = {
    en: {
      title: "Open in browser for full features",
      description: "Google login is not supported in social media browsers",
      openButton: "Open in browser",
      close: "Not now"
    },
    zh: {
      title: "在浏览器中打开以获取完整功能",
      description: "社交媒体内置浏览器不支持Google登录",
      openButton: "在浏览器中打开",
      close: "暂不需要"
    }
  }
  
  // 检测不安全的浏览器环境
  useEffect(() => {
    setMounted(true)
    checkBrowserEnvironment()
  }, [])
  
  const checkBrowserEnvironment = () => {
    if (typeof window === 'undefined') return
    
    const userAgent = navigator.userAgent.toLowerCase()
    
    // 检测是否在社交媒体App的内置浏览器中
    const isInstagram = userAgent.includes('instagram')
    const isFacebook = userAgent.includes('fbav') || userAgent.includes('fban')
    const isWeChat = userAgent.includes('micromessenger')
    const isLineApp = userAgent.includes('line/')
    const isSnapchat = userAgent.includes('snapchat')
    const isInAppBrowser = userAgent.includes('wv') || 
                         /mozilla\/[\d\.]+ \((?:iphone|ipad|ipod|android).*applewebkit\/[\d\.]+.*mobile.*safari\/[\d\.]+(?!.+chrome)/i.test(userAgent)
    
    setIsUnsafeEnvironment(isInstagram || isFacebook || isWeChat || isLineApp || isSnapchat || isInAppBrowser)
  }
  
  // 在外部浏览器中打开
  const openInExternalBrowser = () => {
    const currentUrl = window.location.href
    window.open(currentUrl, '_blank')
  }
  
  // 关闭提示
  const [closed, setClosed] = useState(false)
  const handleClose = () => {
    setClosed(true)
    // 存储状态，避免重复显示
    try {
      sessionStorage.setItem('browser_warning_closed', 'true')
    } catch (e) {
      console.error('Failed to save to sessionStorage:', e)
    }
  }
  
  // 检查是否已经关闭过
  useEffect(() => {
    if (mounted) {
      try {
        const wasClosed = sessionStorage.getItem('browser_warning_closed') === 'true'
        if (wasClosed) {
          setClosed(true)
        }
      } catch (e) {
        console.error('Failed to read from sessionStorage:', e)
      }
    }
  }, [mounted])
  
  if (!mounted || !isUnsafeEnvironment || closed) {
    return null
  }
  
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 text-white py-3 px-4 z-50 shadow-lg animate-slideUp">
      <div className="max-w-screen-lg mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div className="flex-1">
          <h3 className="font-medium text-base">{content[language].title}</h3>
          <p className="text-sm text-white/80">{content[language].description}</p>
        </div>
        <div className="flex gap-2 self-end sm:self-center mt-2 sm:mt-0">
          <Button 
            onClick={openInExternalBrowser} 
            className="bg-white text-blue-700 hover:bg-white/90 hover:text-blue-800 whitespace-nowrap flex items-center gap-1"
            size="sm"
          >
            <ExternalLink className="h-3 w-3" />
            {content[language].openButton}
          </Button>
          <Button 
            onClick={handleClose} 
            variant="ghost" 
            size="sm"
            className="text-white/80 hover:text-white hover:bg-white/10"
          >
            {content[language].close}
          </Button>
        </div>
      </div>
    </div>
  )
} 