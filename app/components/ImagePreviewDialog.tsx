'use client'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import { useLanguage } from '@/contexts/LanguageContext'
import { AnimatePresence, motion } from 'framer-motion'
import { Download, Save, Smartphone, X } from 'lucide-react'
import Image from 'next/image'
import { useEffect, useState } from 'react'

interface Template {
  name: string
  style: {
    width: number
    padding: number
    background: string
    titleFont: string
    contentFont: string
  }
}

interface ImagePreviewDialogProps {
  isOpen: boolean
  onClose: () => void
  imageUrl: string
  onDownload: () => void
  templates: Record<string, Template>
  selectedTemplate: string
  onTemplateChange: (template: "classic" | "postcard" | "magazine") => void
  isGenerating: boolean
}

function FullscreenPreview({
  isOpen,
  onClose,
  imageUrl,
  onDownload,
  language,
}: {
  isOpen: boolean
  onClose: () => void
  imageUrl: string
  onDownload: () => void
  language: string
}) {
  const { toast } = useToast()
  const [touchStartTime, setTouchStartTime] = useState<number | null>(null)
  const [longPressDetected, setLongPressDetected] = useState(false)

  // 图片保存成功提示
  const handleImageSaved = () => {
    toast({
      title: language === 'en' ? "Image Saved" : "图片已保存",
      description: language === 'en' ? "The image has been saved to your device." : "图片已成功保存到您的设备。",
      variant: "default"
    })
  }
  
  // 处理触摸开始事件
  const handleTouchStart = () => {
    setTouchStartTime(Date.now());
    setLongPressDetected(false);
  };
  
  // 处理触摸结束事件
  const handleTouchEnd = () => {
    if (touchStartTime && !longPressDetected) {
      const touchDuration = Date.now() - touchStartTime;
      // 如果触摸时间超过700毫秒，判定为长按，可能是用户保存了图片
      if (touchDuration > 700) {
        setLongPressDetected(true);
        // 用户可能通过长按菜单保存了图片，显示成功提示
        setTimeout(() => {
          handleImageSaved();
        }, 500);
      }
    }
    setTouchStartTime(null);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center"
        >
          {/* 关闭按钮 */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-[102] text-white/70 hover:text-white transition-colors bg-black/40 rounded-full p-2"
          >
            <X className="w-6 h-6" />
          </button>

          {/* 图片容器 */}
          <div className="absolute inset-[40px] sm:inset-[60px] md:inset-[80px]">
            <div 
              className="relative w-full h-full" 
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              onContextMenu={(e) => {
                // 右键菜单事件，可能是PC端保存图片
                e.preventDefault()
                handleImageSaved()
              }}
            >
              <Image
                src={imageUrl}
                alt="Full Preview"
                fill
                className="object-contain"
                quality={100}
                priority
                sizes="100vw"
              />
            </div>
          </div>

          {/* 底部操作栏 */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-4 px-6 py-3 bg-black/40 backdrop-blur-sm rounded-full">
            <Button
              variant="ghost"
              size="sm"
              className="text-white/90 hover:text-white hover:bg-white/10"
              onClick={onClose}
            >
              {language === 'en' ? 'Close' : '关闭'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-white/90 hover:text-white hover:bg-white/10"
              onClick={() => {
                onDownload()
                handleImageSaved()
              }}
            >
              <Download className="w-4 h-4 mr-2" />
              {language === 'en' ? 'Download' : '下载'}
            </Button>
          </div>

          {/* 移动端底部提示 - 持久显示 */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute bottom-20 left-1/2 -translate-x-1/2 px-4 py-2 bg-white/15 backdrop-blur-sm rounded-full text-white/90 text-sm border border-white/20 shadow-lg"
          >
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4" />
              {language === 'en' ? 'Press and hold to save image' : '长按图片可保存至相册'}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function ImagePreviewDialog({
  isOpen,
  onClose,
  imageUrl,
  onDownload,
  templates: _templates,
  selectedTemplate: _selectedTemplate,
  onTemplateChange: _onTemplateChange,
  isGenerating,
}: ImagePreviewDialogProps) {
  const { language } = useLanguage()
  const { toast } = useToast()
  const [isMobile, setIsMobile] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [touchStartTime, setTouchStartTime] = useState<number | null>(null)
  const [longPressDetected, setLongPressDetected] = useState(false)

  // 检测移动设备
  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent.toLowerCase()
      const isMobileDevice = /iphone|ipad|ipod|android|mobile/.test(userAgent)
      setIsMobile(isMobileDevice)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [isOpen])

  // 处理 Dialog 关闭
  const handleDialogClose = () => {
    if (isFullscreen) {
      setIsFullscreen(false)
    } else {
      onClose()
    }
  }

  // 处理下载并显示成功提示
  const handleDownloadWithToast = () => {
    onDownload()
    toast({
      title: language === 'en' ? "Image Saved" : "图片已保存",
      description: language === 'en' ? "The image has been saved to your device." : "图片已成功保存到您的设备。",
      variant: "default"
    })
  }
  
  // 处理触摸开始事件
  const handleTouchStart = () => {
    setTouchStartTime(Date.now());
    setLongPressDetected(false);
  };
  
  // 处理触摸结束事件
  const handleTouchEnd = () => {
    if (touchStartTime && !longPressDetected) {
      const touchDuration = Date.now() - touchStartTime;
      // 如果触摸时间超过700毫秒，判定为长按，可能是用户保存了图片
      if (touchDuration > 700) {
        setLongPressDetected(true);
        // 用户可能通过长按菜单保存了图片，显示成功提示
        setTimeout(() => {
          toast({
            title: language === 'en' ? "Image Saved" : "图片已保存",
            description: language === 'en' ? "The image has been saved to your device." : "图片已成功保存到您的设备。",
            variant: "default"
          })
        }, 500);
      }
    }
    setTouchStartTime(null);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleDialogClose}>
        <DialogContent 
          className="max-w-4xl p-0 overflow-hidden bg-transparent border-0 flex flex-col"
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            height: 'calc(90vh)',
            maxHeight: '800px',
            margin: '0'
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="relative bg-gradient-to-b from-black/95 via-gray-900/95 to-black/95 backdrop-blur-xl rounded-2xl overflow-hidden border border-white/10 flex flex-col h-full"
          >
            <DialogHeader className="p-4 sm:p-6 border-b border-white/10 flex-shrink-0">
              <DialogTitle className="text-lg sm:text-xl font-semibold text-center text-white">
                {language === 'en' ? 'Your Love Letter' : '你的情书'}
              </DialogTitle>
              <DialogDescription className="text-center text-white/60 text-sm sm:text-base">
                {isMobile 
                  ? (language === 'en' 
                      ? 'Press and hold the image to save to your photos'
                      : '长按图片可保存到相册')
                  : (language === 'en'
                      ? 'Download your love letter as a beautiful image'
                      : '将你的情书下载为精美图片')}
              </DialogDescription>
            </DialogHeader>

            {/* 关闭按钮 */}
            <button
              onClick={handleDialogClose}
              className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors duration-200 w-8 h-8 rounded-full flex items-center justify-center bg-black/20 hover:bg-black/40 backdrop-blur-sm"
            >
              <X className="w-4 h-4" />
            </button>

            {/* 图片预览 */}
            <div className="flex-grow flex items-center justify-center p-4 sm:p-6">
              <div className="relative w-full h-full">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="rounded-lg overflow-hidden shadow-2xl bg-gradient-to-b from-black/40 to-black/20 h-full"
                >
                  <div className="relative w-full h-full">
                    {isGenerating ? (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                        <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                      </div>
                    ) : (
                      <div className="absolute inset-0 w-full h-full">
                        <Image
                          src={imageUrl}
                          alt="Love Letter Preview"
                          fill
                          className="object-contain"
                          unoptimized
                          onTouchStart={handleTouchStart}
                          onTouchEnd={handleTouchEnd}
                        />
                        
                        {/* 移动端保存指引图标 - 更加明显 */}
                        {isMobile && (
                          <motion.div
                            initial={{ opacity: 0.7, y: 0 }}
                            animate={{ opacity: 1, y: [-5, 0, -5] }}
                            transition={{ 
                              repeat: Infinity, 
                              duration: 3
                            }}
                            className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center"
                          >
                            <div className="flex items-center justify-center gap-2 px-4 py-3 rounded-full bg-black/70 border border-white/30 shadow-lg">
                              <Save className="w-4 h-4 text-white" />
                              <span className="text-white font-medium text-sm">
                                {language === 'en' ? 'Press & hold to save' : '长按保存图片'}
                              </span>
                            </div>
                            <div className="w-px h-14 bg-gradient-to-b from-white/50 to-transparent mt-1"></div>
                          </motion.div>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="px-4 sm:px-6 py-4 sm:py-6 flex justify-center gap-3 sm:gap-4 border-t border-white/10 flex-shrink-0 bg-black/20">
              <Button
                variant="outline"
                className="rounded-full px-6 sm:px-8 py-1.5 sm:py-2 bg-white/5 text-white/90 border-white/10 hover:bg-white/10 hover:border-white/20 hover:text-white backdrop-blur-sm text-xs sm:text-sm transition-all duration-300 shadow-sm hover:shadow-lg hover:shadow-black/20"
                onClick={handleDialogClose}
              >
                {language === 'en' ? 'Close' : '关闭'}
              </Button>
              {!isMobile && (
                <Button
                  variant="outline"
                  className="rounded-full px-6 sm:px-8 py-1.5 sm:py-2 bg-white/5 text-white/90 border-white/10 hover:bg-white/10 hover:border-white/20 hover:text-white backdrop-blur-sm text-xs sm:text-sm transition-all duration-300 group shadow-sm hover:shadow-lg hover:shadow-black/20"
                  onClick={handleDownloadWithToast}
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <>
                      <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                      {language === 'en' ? 'Generating' : '生成中'}
                    </>
                  ) : (
                    <>
                      <Download className="w-3 h-3 sm:w-4 sm:h-4 mr-2 group-hover:scale-110 transition-transform" />
                      {language === 'en' ? 'Download' : '下载'}
                    </>
                  )}
                </Button>
              )}
            </div>
          </motion.div>
        </DialogContent>
      </Dialog>

      <FullscreenPreview
        isOpen={isFullscreen}
        onClose={() => setIsFullscreen(false)}
        imageUrl={imageUrl}
        onDownload={onDownload}
        language={language}
      />
    </>
  )
} 