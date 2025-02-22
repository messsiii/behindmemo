import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { useLanguage } from '@/contexts/LanguageContext'
import { motion } from 'framer-motion'
import { Download, X } from 'lucide-react'
import Image from 'next/image'
import { useEffect, useState } from 'react'

interface ImagePreviewDialogProps {
  isOpen: boolean
  onClose: () => void
  imageUrl: string
  onDownload: () => void
}

export function ImagePreviewDialog({
  isOpen,
  onClose,
  imageUrl,
  onDownload,
}: ImagePreviewDialogProps) {
  const { language } = useLanguage()
  const [isMobile, setIsMobile] = useState(false)

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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden bg-transparent border-0">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="relative bg-gradient-to-b from-black/95 via-gray-900/95 to-black/95 backdrop-blur-xl rounded-2xl overflow-hidden border border-white/10"
        >
          <DialogHeader className="p-6 border-b border-white/10">
            <DialogTitle className="text-xl font-semibold text-center text-white">
              {language === 'en' ? 'Your Love Letter Preview' : '你的情书预览'}
            </DialogTitle>
            <DialogDescription className="text-center text-white/60">
              {isMobile 
                ? (language === 'en' 
                    ? 'Press and hold the image to save to your photos'
                    : '长按图片可保存到相册')
                : (language === 'en'
                    ? 'Preview your love letter before downloading'
                    : '预览你的情书并下载')}
            </DialogDescription>
          </DialogHeader>

          {/* 关闭按钮 */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>

          {/* 图片预览 */}
          <div className="p-6">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-lg overflow-hidden shadow-2xl bg-gradient-to-b from-black/40 to-black/20"
            >
              <div className="relative aspect-[4/3] w-full">
                <Image
                  src={imageUrl}
                  alt="Love Letter Preview"
                  fill
                  className="object-contain"
                  unoptimized
                />
              </div>
            </motion.div>
          </div>

          {/* 操作按钮 */}
          <div className="p-6 flex justify-center gap-4 border-t border-white/10">
            <Button
              variant="outline"
              className="rounded-full px-8 py-2 bg-white/5 text-white border-white/10 hover:bg-white/10 hover:border-white/20 backdrop-blur-sm text-sm transition-all duration-300"
              onClick={onClose}
            >
              {language === 'en' ? 'Close' : '关闭'}
            </Button>
            {!isMobile && (
              <Button
                variant="outline"
                className="rounded-full px-8 py-2 bg-white/5 text-white border-white/10 hover:bg-white/10 hover:border-white/20 backdrop-blur-sm text-sm transition-all duration-300 group"
                onClick={onDownload}
              >
                <Download className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
                {language === 'en' ? 'Download' : '下载'}
              </Button>
            )}
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  )
} 