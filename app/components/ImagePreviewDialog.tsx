import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { useLanguage } from '@/contexts/LanguageContext'
import { cn } from '@/lib/utils'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Download, X } from 'lucide-react'
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
            <div className="relative w-full h-full">
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
              onClick={onDownload}
            >
              <Download className="w-4 h-4 mr-2" />
              {language === 'en' ? 'Download' : '下载'}
            </Button>
          </div>
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
  templates,
  selectedTemplate,
  onTemplateChange,
  isGenerating,
}: ImagePreviewDialogProps) {
  const { language } = useLanguage()
  const [isMobile, setIsMobile] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

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
  }, [])

  // 处理 Dialog 关闭
  const handleDialogClose = () => {
    if (isFullscreen) {
      setIsFullscreen(false)
    } else {
      onClose()
    }
  }

  // 获取当前模板的索引
  const currentTemplateIndex = Object.keys(templates).indexOf(selectedTemplate)
  const totalTemplates = Object.keys(templates).length

  // 切换到下一个或上一个模板
  const switchTemplate = (direction: 'next' | 'prev') => {
    const templateKeys = Object.keys(templates)
    let newIndex = currentTemplateIndex
    
    if (direction === 'next') {
      newIndex = (currentTemplateIndex + 1) % totalTemplates
    } else {
      newIndex = (currentTemplateIndex - 1 + totalTemplates) % totalTemplates
    }
    
    onTemplateChange(templateKeys[newIndex] as "classic" | "postcard" | "magazine")
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-transparent border-0 h-[calc(100vh-2rem)] sm:h-[calc(100vh-4rem)] my-[1rem] sm:my-[2rem] flex flex-col">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="relative bg-gradient-to-b from-black/95 via-gray-900/95 to-black/95 backdrop-blur-xl rounded-2xl overflow-hidden border border-white/10 flex flex-col h-full"
          >
            <DialogHeader className="p-4 sm:p-6 border-b border-white/10 flex-shrink-0">
              <DialogTitle className="text-lg sm:text-xl font-semibold text-center text-white">
                {language === 'en' ? 'Choose Your Style' : '选择你的样式'}
              </DialogTitle>
              <DialogDescription className="text-center text-white/60 text-sm sm:text-base">
                {isMobile 
                  ? (language === 'en' 
                      ? 'Press and hold the image to save to your photos'
                      : '长按图片可保存到相册')
                  : (language === 'en'
                      ? 'Preview your love letter in different styles'
                      : '预览不同风格的情书')}
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
                        />
                      </div>
                    )}
                  </div>
                </motion.div>

                {/* 模板切换按钮 */}
                <div className={cn(
                  "absolute left-0 right-0 flex justify-between pointer-events-none",
                  isMobile ? "top-[45%] px-2" : "top-1/2 -translate-y-1/2 px-4"
                )}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "rounded-full bg-black/60 text-white hover:bg-black/80 pointer-events-auto",
                      isMobile ? "h-7 w-7" : "h-8 w-8 sm:h-10 sm:w-10"
                    )}
                    onClick={() => switchTemplate('prev')}
                    disabled={isGenerating}
                  >
                    <ChevronLeft className={cn(
                      isMobile ? "h-4 w-4" : "h-4 w-4 sm:h-6 sm:w-6"
                    )} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "rounded-full bg-black/60 text-white hover:bg-black/80 pointer-events-auto",
                      isMobile ? "h-7 w-7" : "h-8 w-8 sm:h-10 sm:w-10"
                    )}
                    onClick={() => switchTemplate('next')}
                    disabled={isGenerating}
                  >
                    <ChevronRight className={cn(
                      isMobile ? "h-4 w-4" : "h-4 w-4 sm:h-6 sm:w-6"
                    )} />
                  </Button>
                </div>
              </div>
            </div>

            {/* 模板选择器 */}
            <div className="px-4 sm:px-6 py-4 sm:py-6 flex-shrink-0 border-t border-white/10">
              <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
                {Object.entries(templates).map(([key, template]) => (
                  <Button
                    key={key}
                    variant={selectedTemplate === key ? "default" : "outline"}
                    className={cn(
                      "rounded-full px-4 sm:px-6 py-1.5 sm:py-2 text-xs sm:text-sm transition-all duration-300",
                      selectedTemplate === key
                        ? "bg-gradient-to-r from-[#738fbd] to-[#cc8eb1] text-white shadow-lg shadow-black/20"
                        : "bg-black/20 text-white/70 hover:text-white hover:bg-black/40 border-white/10 hover:shadow-lg hover:shadow-black/10"
                    )}
                    onClick={() => onTemplateChange(key as "classic" | "postcard" | "magazine")}
                    disabled={isGenerating}
                  >
                    {template.name}
                  </Button>
                ))}
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
                  onClick={onDownload}
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