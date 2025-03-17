'use client'

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useLanguage } from "@/contexts/LanguageContext"
import { AlertTriangle, ExternalLink } from "lucide-react"
import { signIn } from "next-auth/react"
import { useEffect, useState } from "react"

interface LoginDialogProps {
  isOpen: boolean
  onClose: () => void
}

export function LoginDialog({ isOpen, onClose }: LoginDialogProps) {
  const { language } = useLanguage()
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [isUnsafeEnvironment, setIsUnsafeEnvironment] = useState(false)
  
  // 检测不安全的浏览器环境
  useEffect(() => {
    if (isOpen) {
      checkBrowserEnvironment()
    }
  }, [isOpen])
  
  const checkBrowserEnvironment = () => {
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
  
  const content = {
    en: {
      title: "One step away from your letter",
      description: "Log in quickly to generate your personalized love letter based on your memories. Your information will be safely preserved.",
      googleButton: "Continue with Google",
      unsafeEnvironment: {
        title: "Browser Not Supported for Login",
        description: "Google blocks logins from Instagram, Facebook, and other social media in-app browsers due to security concerns.",
        alertTitle: "Login Blocked by Google",
        alertDescription: "To continue, please use one of these options:",
        openInBrowser: "Open in Safari/Chrome",
        orCopy: "Copy link:",
        copyButton: "Copy URL",
        qrCodeTab: "QR Code",
        linkTab: "Copy Link",
        scanQrCode: "Scan QR Code",
        scanQrDescription: "Scan this QR code with your camera to open in an external browser",
        copySuccess: "Link copied to clipboard!"
      }
    },
    zh: {
      title: "距离您的信件只有一步之遥",
      description: "快速登录以生成基于您记忆的专属情书。您的信息将被安全保留。",
      googleButton: "使用 Google 账号登录",
      unsafeEnvironment: {
        title: "浏览器不支持登录",
        description: "由于安全原因，Google 阻止了从 Instagram、微信等应用内置浏览器的登录请求。",
        alertTitle: "Google 已阻止登录",
        alertDescription: "请使用以下方式继续操作：",
        openInBrowser: "在浏览器中打开",
        orCopy: "复制链接：",
        copyButton: "复制链接",
        qrCodeTab: "二维码",
        linkTab: "复制链接",
        scanQrCode: "扫描二维码",
        scanQrDescription: "使用相机扫描此二维码在外部浏览器中打开网站",
        copySuccess: "链接已复制到剪贴板！"
      }
    }
  }

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true)
    try {
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.set('returnFrom', 'login');
      
      localStorage.setItem('hasFormDataPending', 'true');
      
      signIn('google', { 
        redirect: true,
        callbackUrl: currentUrl.toString()
      });
      
    } catch (error) {
      console.error('Login error:', error)
      setIsLoggingIn(false)
    }
  }
  
  // 在外部浏览器中打开
  const openInExternalBrowser = () => {
    const currentUrl = window.location.href;
    window.open(currentUrl, '_blank');
  }
  
  // 复制当前URL到剪贴板
  const copyUrlToClipboard = () => {
    const currentUrl = window.location.href;
    navigator.clipboard.writeText(currentUrl).then(() => {
      alert(content[language].unsafeEnvironment.copySuccess);
    }).catch(err => {
      console.error('Failed to copy: ', err);
    });
  }
  
  // 获取QR码URL
  const getQRCodeUrl = () => {
    const currentUrl = encodeURIComponent(window.location.href);
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${currentUrl}`;
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) onClose()
    }}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isUnsafeEnvironment 
            ? content[language].unsafeEnvironment.title 
            : content[language].title}
          </DialogTitle>
          <DialogDescription>
            {isUnsafeEnvironment 
              ? content[language].unsafeEnvironment.description 
              : content[language].description}
          </DialogDescription>
        </DialogHeader>
        
        {isUnsafeEnvironment ? (
          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>{content[language].unsafeEnvironment.alertTitle}</AlertTitle>
              <AlertDescription>
                {content[language].unsafeEnvironment.alertDescription}
              </AlertDescription>
            </Alert>
            
            <Button 
              onClick={openInExternalBrowser}
              className="w-full flex items-center justify-center gap-2"
              variant="default"
            >
              <ExternalLink className="h-4 w-4" />
              {content[language].unsafeEnvironment.openInBrowser}
            </Button>
            
            <Tabs defaultValue="qrcode" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="qrcode">{content[language].unsafeEnvironment.qrCodeTab}</TabsTrigger>
                <TabsTrigger value="copy">{content[language].unsafeEnvironment.linkTab}</TabsTrigger>
              </TabsList>
              
              <TabsContent value="qrcode" className="space-y-2 pt-2">
                <div className="flex justify-center py-2">
                  <img 
                    src={getQRCodeUrl()} 
                    alt="QR Code" 
                    className="w-48 h-48 border rounded"
                  />
                </div>
                <p className="text-center text-sm text-gray-500">
                  {content[language].unsafeEnvironment.scanQrDescription}
                </p>
              </TabsContent>
              
              <TabsContent value="copy" className="space-y-2 pt-2">
                <div className="text-sm text-gray-500 mb-2">
                  {content[language].unsafeEnvironment.orCopy}
                </div>
                
                <div className="flex items-center">
                  <div className="border rounded-l px-3 py-2 bg-muted text-xs truncate flex-1 overflow-hidden">
                    {window.location.href}
                  </div>
                  <Button 
                    onClick={copyUrlToClipboard} 
                    className="rounded-l-none"
                    size="sm"
                  >
                    {content[language].unsafeEnvironment.copyButton}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <DialogFooter className="flex justify-center mt-4">
            <Button 
              onClick={handleGoogleLogin} 
              className="relative w-full bg-white text-black hover:bg-gray-100 border border-gray-300"
              disabled={isLoggingIn}
            >
              {isLoggingIn ? (
                <div className="h-5 w-5 rounded-full border-2 border-black/30 border-t-black animate-spin mr-2"></div>
              ) : (
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
              )}
              {content[language].googleButton}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
} 