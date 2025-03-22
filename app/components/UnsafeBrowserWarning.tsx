'use client'

import { Button } from '@/components/ui/button'
import { useLanguage } from '@/contexts/LanguageContext'
import { InfoIcon } from 'lucide-react'
import { useEffect, useState } from 'react'

export function UnsafeBrowserWarning() {
  const { language } = useLanguage()
  const [isUnsafeEnvironment, setIsUnsafeEnvironment] = useState(false)
  const [browserType, setBrowserType] = useState<'instagram' | 'facebook' | 'wechat' | 'other'>('other')
  const [mounted, setMounted] = useState(false)
  const [closed, setClosed] = useState(false)  // 简化为仅当前浏览状态
  
  // 内容翻译
  const content = {
    en: {
      title: "Open in browser for full features",
      description: {
        instagram: "Tap ··· in the top right and select \"Open in browser\"",
        facebook: "Tap ··· in the top right and select \"Open in browser\"",
        wechat: "Tap ··· in the top right and select \"Open in browser\"",
        other: "Please open this website in Safari, Chrome or other browsers"
      },
      close: "Got it"
    },
    zh: {
      title: "在浏览器中打开以获取完整功能",
      description: {
        instagram: "点击右上角 ··· 选择「在浏览器中打开」",
        facebook: "点击右上角 ··· 选择「在浏览器中打开」",
        wechat: "点击右上角 ··· 选择「在浏览器中打开」",
        other: "请在Safari、Chrome或其他浏览器中打开本网站"
      },
      close: "我知道了"
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
    
    // 仅检测特定的社交媒体App内置浏览器，而非所有移动浏览器
    const isInstagram = userAgent.includes('instagram')
    const isFacebook = userAgent.includes('fbav') || userAgent.includes('fban')
    const isWeChat = userAgent.includes('micromessenger')
    const isLineApp = userAgent.includes('line/')
    const isSnapchat = userAgent.includes('snapchat')
    const isTikTok = userAgent.includes('tiktok') || userAgent.includes('musical_ly')
    const isTwitter = userAgent.includes('twitter') || userAgent.includes('twitter_app')
    
    // 设置具体的浏览器类型
    if (isInstagram) {
      setBrowserType('instagram')
    } else if (isFacebook) {
      setBrowserType('facebook')
    } else if (isWeChat) {
      setBrowserType('wechat')
    } else {
      setBrowserType('other')
    }
    
    // 仅在特定社交媒体内置浏览器中显示警告
    const isUnsafeSocialBrowser = 
      isInstagram || isFacebook || isWeChat || isLineApp || isSnapchat || isTikTok || isTwitter
    
    setIsUnsafeEnvironment(isUnsafeSocialBrowser)
  }
  
  // 简化关闭提示逻辑，仅在当前状态中保存
  const handleClose = () => {
    setClosed(true)
  }
  
  if (!mounted || !isUnsafeEnvironment || closed) {
    return null
  }
  
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 text-white py-4 px-5 z-50 shadow-lg animate-slideUp">
      <div className="max-w-screen-lg mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex-1 flex items-start gap-3">
          <InfoIcon className="h-6 w-6 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-lg mb-1">{content[language].title}</h3>
            <p className="text-base text-white">{content[language].description[browserType]}</p>
          </div>
        </div>
        <div className="self-end sm:self-center mt-2 sm:mt-0">
          <Button 
            onClick={handleClose} 
            variant="ghost" 
            size="sm"
            className="text-white hover:text-white hover:bg-white/10 text-base px-4 py-2"
          >
            {content[language].close}
          </Button>
        </div>
      </div>
    </div>
  )
} 