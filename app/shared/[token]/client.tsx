'use client'

import { LoadingSpinner } from '@/app/components/LoadingSpinner'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/contexts/LanguageContext'
import { cn } from '@/lib/utils'
import { AnimatePresence, motion } from 'framer-motion'
import { PenLine } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import React, { useEffect, useRef, useState } from 'react'

// 添加全局 CSS 规则
const globalStyles = `
  :root {
    --bg-transition: none;
  }
  
  [style*="--bg-url"] {
    background-image: var(--bg-url);
  }
  
  [style*="--bg-url"]::before {
    background-image: var(--bg-url);
    transition: none;
  }
`

// 模板定义，与原页面一致
const TEMPLATES = {
  classic: {
    name: 'Classic Dark',
    style: {
      width: 800,
      padding: 49,
      background: 'linear-gradient(135deg, #000000 0%, #1a1a1a 50%, #000000 100%)',
      titleFont: '"Source Serif Pro", serif',
      contentFont: '"Source Serif Pro", serif',
    },
  },
  postcard: {
    name: 'Postcard',
    style: {
      width: 800,
      padding: 49,
      background: '#f9f7f7',
      titleFont: '"Source Serif Pro", serif',
      contentFont: '"Source Serif Pro", serif',
    },
  },
  magazine: {
    name: 'Magazine',
    style: {
      width: 800,
      padding: 49,
      background: '#ffffff',
      titleFont: '"Source Serif Pro", serif',
      contentFont: '"Source Serif Pro", serif',
    },
  },
  artisan: {
    name: 'Artisan',
    style: {
      width: 800,
      padding: 49,
      background: 'url(/images/artisan-red-bg.jpg) no-repeat center center / cover',
      titleFont: '"Source Serif Pro", serif',
      contentFont: '"Source Serif Pro", serif',
    },
  },
  natural: {
    name: 'Natural',
    style: {
      width: 800,
      padding: 49,
      background: 'url(/images/natural-bg.jpg) no-repeat center center / cover',
      titleFont: '"Source Serif Pro", serif',
      contentFont: '"Source Serif Pro", serif',
    },
  },
  darkWine: {
    name: 'Dark Wine',
    style: {
      width: 800,
      padding: 49,
      background: 'url(/images/dark-wine-bg.jpg) no-repeat center center / cover',
      titleFont: '"Source Serif Pro", serif',
      contentFont: '"Source Serif Pro", serif',
    },
  },
  paperMemo: {
    name: 'Paper Memoir',
    style: {
      width: 800,
      padding: 49,
      background: 'url(/images/annie-spratt-fDghTk7Typw-unsplash.jpg) no-repeat center center / cover',
      titleFont: '"Source Serif Pro", serif',
      contentFont: '"Source Serif Pro", serif',
    },
  },
  oceanBreeze: {
    name: 'Ocean Breeze',
    style: {
      width: 800,
      padding: 49,
      background: 'url(/images/pawel-czerwinski-YUGf6Hs1F3A-unsplash.jpg) no-repeat center center / cover',
      titleFont: '"Source Serif Pro", serif',
      contentFont: '"Source Serif Pro", serif',
    },
  },
  darkCrimson: {
    name: 'Dark Crimson',
    style: {
      width: 800,
      padding: 49,
      background: 'url(/images/sufyan-eRpeXTJEgMw-unsplash.jpg) no-repeat center center / cover',
      titleFont: '"Source Serif Pro", serif',
      contentFont: '"Source Serif Pro", serif',
    },
  },
  purpleDream: {
    name: 'Purple Dream',
    style: {
      width: 800,
      padding: 49,
      background: 'url(/images/efe-kurnaz-RnCPiXixooY-unsplash.jpg) no-repeat center center / cover',
      titleFont: '"Source Serif Pro", serif',
      contentFont: '"Source Serif Pro", serif',
    },
  },
  elegantPaper: {
    name: 'Elegant Paper',
    style: {
      width: 800,
      padding: 49,
      background: 'url(/images/lunelle-B-9i06FP0SI-unsplash.jpg) no-repeat center center / cover',
      titleFont: '"Source Serif Pro", serif',
      contentFont: '"Source Serif Pro", serif',
    },
  },
  roseParchment: {
    name: 'Rose Parchment',
    style: {
      width: 800,
      padding: 49,
      background: 'url(/images/andrei-j-castanha-V8GVT2XQ5oc-unsplash.jpg) no-repeat center center / cover',
      titleFont: '"Source Serif Pro", serif',
      contentFont: '"Source Serif Pro", serif',
    },
  }
}

interface SharedLetter {
  letter: {
    content: string
    imageUrl: string
    metadata: any
  }
  templateStyle: string
  hideWatermark?: boolean
}

interface Props {
  token: string
}

export default function SharedLetterClient({ token }: Props) {
  const { language } = useLanguage()
  const [sharedLetter, setSharedLetter] = useState<SharedLetter | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function fetchSharedLetter() {
      try {
        setIsLoading(true)
        // 获取URL中的noCount参数，决定是否增加计数
        // 支持两种场景：1. 通过URL参数控制 2. 在开发环境的严格模式下避免重复计数
        const urlParams = new URLSearchParams(window.location.search);
        const noCount = urlParams.get('noCount') === 'true';
        
        // 开发环境严格模式下自动阻止计数
        const isProdOrFirstRender = 
          process.env.NODE_ENV === 'production' || 
          !localStorage.getItem(`visited_${token}`);
        
        // 避免在开发环境严格模式下的第二次渲染中增加计数
        if (process.env.NODE_ENV === 'development' && isProdOrFirstRender) {
          localStorage.setItem(`visited_${token}`, 'true');
        }
        
        // 仅在首次访问或生产环境时增加计数
        const shouldIncrement = !noCount && isProdOrFirstRender;
        const queryParam = shouldIncrement ? '' : '?noIncrement=true';
        
        const response = await fetch(`/api/shared/${token}${queryParam}`)
        
        if (!response.ok) {
          throw new Error(language === 'en' ? 'Cannot find the shared letter' : '无法找到共享的信件')
        }
        
        const data = await response.json()
        setSharedLetter(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : (language === 'en' ? 'Loading failed' : '加载失败'))
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchSharedLetter()
  }, [token, language])
  
  // 确定当前应该使用的模板背景类
  const getTemplateBackgroundClass = (templateStyle: string | null) => {
    if (!templateStyle || !TEMPLATES[templateStyle as keyof typeof TEMPLATES]) {
      return "bg-gradient-to-b from-black via-gray-900 to-black";
    }
    
    const template = templateStyle as keyof typeof TEMPLATES;
    
    // 检查模板是否使用背景图片
    if (TEMPLATES[template].style.background.includes('url')) {
      // 使用 before 伪元素 - 使用 fixed 而非 absolute 确保全屏覆盖且不会随滚动变化
      return `before:content-[''] before:fixed before:inset-0 before:w-full before:h-full before:z-0 before:bg-no-repeat before:bg-center before:bg-cover before:safari-fixed`;
    } else {
      // 针对非图片背景模板
      switch(template) {
        case 'classic':
          return "bg-gradient-to-br from-black via-[#1a1a1a] to-black";
        case 'postcard':
          return "bg-[#f9f7f7]";
        case 'magazine':
          return "bg-white";
        default:
          return "bg-gradient-to-b from-black via-gray-900 to-black";
      }
    }
  }
  
  // 获取当前模板样式
  const templateStyle = sharedLetter?.templateStyle && TEMPLATES[sharedLetter.templateStyle as keyof typeof TEMPLATES] 
    ? sharedLetter.templateStyle as keyof typeof TEMPLATES
    : 'classic';
  
  // 获取背景类
  const backgroundClass = getTemplateBackgroundClass(sharedLetter?.templateStyle || null);
  
  if (isLoading) {
    return (
      <>
        {/* 全局样式 */}
        <style jsx global>{globalStyles}</style>
        
        <div 
          className={cn("min-h-screen overflow-x-hidden relative", backgroundClass)}
          style={{
            ...(templateStyle && TEMPLATES[templateStyle as keyof typeof TEMPLATES].style.background.includes('url') 
              ? {
                  "--bg-url": `url(${TEMPLATES[templateStyle].style.background.match(/url\((.*?)\)/)?.[1] || ''})`
                } 
              : {})
          } as React.CSSProperties}
        >
          <div className="max-w-[1600px] mx-auto pb-20 px-4 sm:px-6 lg:px-8">
            <div className="relative z-10 min-h-screen flex flex-col items-center justify-center py-10">
              <div className="w-full max-w-[800px] space-y-12">
                {/* 标题占位 */}
                <div className="h-16 w-96 mx-auto bg-white/5 rounded-lg animate-pulse" />
                
                {/* 图片占位 */}
                <div className="relative h-[50vh] md:h-[60vh] overflow-hidden rounded-xl bg-white/5 animate-pulse" />
                
                {/* 内容占位 */}
                <div className="bg-black/40 backdrop-blur-lg rounded-2xl p-8 md:p-10 shadow-2xl border border-white/10 space-y-4">
                  <div className="h-6 bg-white/5 rounded animate-pulse w-[85%]" />
                  <div className="h-6 bg-white/5 rounded animate-pulse w-[90%]" />
                  <div className="h-6 bg-white/5 rounded animate-pulse w-[80%]" />
                  <div className="h-6 bg-white/5 rounded animate-pulse w-[95%]" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    )
  }
  
  if (error || !sharedLetter) {
    return (
      <>
        {/* 全局样式 */}
        <style jsx global>{globalStyles}</style>
        
        <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black flex flex-col items-center justify-center">
          <h1 className="text-2xl font-bold mb-4 text-white">{language === 'en' ? 'Error' : '出错了'}</h1>
          <p className="text-white/80 mb-6">{error || (language === 'en' ? 'Cannot load this letter' : '无法加载此信件')}</p>
          <Link href="/">
            <Button variant="outline" className="border-white/10 text-white hover:bg-white/10">
              {language === 'en' ? 'Back to Home' : '返回首页'}
            </Button>
          </Link>
        </div>
      </>
    )
  }
  
  // 将内容拆分为段落
  const paragraphs = sharedLetter.letter.content.split('\n').filter(p => p.trim() !== '');
  
  // 水印相关函数
  const getWatermarkHTML = () => {
    if (sharedLetter.hideWatermark) return null;
    
    // 根据模板样式选择对应的水印类型，与ResultsPage保持一致
    const watermarkType = 
      templateStyle === 'darkWine' || 
      templateStyle === 'darkCrimson' || 
      templateStyle === 'purpleDream' ||
      templateStyle === 'classic'
        ? 'dark' 
        : 'light';
        
    return (
      <div className="flex justify-center mt-6 mb-2 h-[28px]">
        <Image
          src={`/watermark-${watermarkType}.svg`}
          alt="behindmemo"
          width={100}
          height={28}
          className="h-[28px] w-auto opacity-70"
        />
      </div>
    );
  };
  
  // 写回信按钮样式
  const getButtonStyles = () => {
    // 与水印类型保持一致，深色背景的模板使用浅色按钮
    return templateStyle === 'darkWine' || 
           templateStyle === 'darkCrimson' || 
           templateStyle === 'purpleDream' ||
           templateStyle === 'classic'
           ? "bg-black/60 text-white border-white/10 hover:bg-white/20 hover:border-white/40 hover:text-white hover:shadow-[0_0_15px_rgba(255,255,255,0.2)] backdrop-blur-sm"
           : "bg-black/60 text-white border-white/10 hover:bg-black/40 hover:border-black/30 hover:shadow-md backdrop-blur-sm";
  };
  
  return (
    <>
      {/* 全局样式 */}
      <style jsx global>{globalStyles}</style>
      
      <div 
        className={cn(
          "min-h-screen overflow-x-hidden relative",
          backgroundClass
        )}
        style={{
          ...(templateStyle && TEMPLATES[templateStyle].style.background.includes('url') 
            ? {
                "--bg-url": `url(${TEMPLATES[templateStyle].style.background.match(/url\((.*?)\)/)?.[1] || ''})`
              } 
            : {})
        } as React.CSSProperties}
      >
        {/* 背景效果 */}
        <div className={cn(
          "fixed inset-0",
          // 对带背景图的模板隐藏或减少蒙版不透明度
          TEMPLATES[templateStyle].style.background.includes('url')
            ? "opacity-0" // 带背景图模板不需要额外的蒙版
            : "opacity-20" // 其他模板保持原有蒙版效果
        )}>
          <div className="absolute inset-0 bg-gradient-to-br from-rose-500/10 via-purple-500/10 to-blue-500/10" />
          {sharedLetter.letter.imageUrl && (
            <Image
              src={imageError ? '/placeholder.svg' : sharedLetter.letter.imageUrl}
              alt="Background"
              fill
              className="filter blur-2xl scale-110 object-cover mix-blend-overlay"
              priority
              unoptimized
              onError={() => setImageError(true)}
            />
          )}
        </div>
        
        <div className="max-w-[1600px] mx-auto pb-20 px-4 sm:px-6 lg:px-8">
          <div className="relative min-h-screen">
            {/* 内容部分 */}
            <div className="relative z-10 min-h-screen flex flex-col items-center justify-center py-10">
              <div className="w-full max-w-[800px]">
                <AnimatePresence mode="wait">
                  <motion.div
                    ref={contentRef}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className="space-y-12"
                  >
                    {/* 图片部分 */}
                    {sharedLetter.letter.imageUrl && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.4, duration: 0.8 }}
                      >
                        <div className="relative w-full rounded-xl bg-black/40 overflow-hidden">
                          <div
                            className={cn(
                              'relative w-full pt-[56.25%]', // 16:9 默认比例
                              'max-h-[80vh]', // 最大高度限制
                              'transition-opacity duration-500',
                              imageLoaded ? 'opacity-100' : 'opacity-0'
                            )}
                          >
                            {!imageLoaded && (
                              <div className="absolute inset-0 flex items-center justify-center bg-gray-800/20 backdrop-blur-sm">
                                <LoadingSpinner />
                              </div>
                            )}
                            <Image
                              src={imageError ? '/placeholder.svg' : sharedLetter.letter.imageUrl}
                              alt="Letter image"
                              fill
                              priority
                              className={cn(
                                'absolute top-0 left-0 w-full h-full object-contain',
                                sharedLetter.letter.metadata?.orientation === 6 && 'rotate-90',
                                sharedLetter.letter.metadata?.orientation === 3 && 'rotate-180',
                                sharedLetter.letter.metadata?.orientation === 8 && '-rotate-90'
                              )}
                              onError={() => {
                                console.error('Image failed to load:', sharedLetter.letter.imageUrl);
                                setImageError(true);
                                setImageLoaded(true);
                              }}
                              onLoad={(e) => {
                                // 获取图片实际尺寸
                                const img = e.target as HTMLImageElement;
                                const container = img.parentElement;
                                if (container) {
                                  // 计算宽高比
                                  const ratio = img.naturalHeight / img.naturalWidth;
                                  // 如果图片高度超过宽度的1.5倍（3:2），则限制高度
                                  if (ratio > 1.5) {
                                    container.style.paddingTop = '150%';
                                  } else {
                                    // 否则使用实际比例
                                    container.style.paddingTop = `${ratio * 100}%`;
                                  }
                                }
                                setImageLoaded(true);
                              }}
                              sizes="(max-width: 768px) 100vw, (max-width: 1600px) 80vw, 1280px"
                              unoptimized={true}
                            />
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {/* 内容容器 */}
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.6, duration: 0.8 }}
                      className={cn(
                        "backdrop-blur-lg rounded-2xl p-8 md:p-10 shadow-2xl border",
                        templateStyle === 'classic' 
                          ? "bg-black/40 border-white/10 relative" 
                          : templateStyle === 'postcard'
                            ? "bg-[#f9f7f7]/90 border-black/5"
                            : templateStyle === 'artisan'
                              ? "bg-[#CFCFCC] border-[#B00702]/10 relative"
                              : templateStyle === 'natural'
                                ? "bg-[#FFFFF2] border-[#5E4027]/10 relative"
                                : templateStyle === 'darkWine'
                                  ? "bg-[#430311] border-[#F4F4F4]/10 relative"
                                  : templateStyle === 'paperMemo'
                                    ? "bg-[#C9C9C9] border-[#151212]/10 relative"
                                    : templateStyle === 'oceanBreeze'
                                      ? "bg-[#F5F5EF] border-[#4A90A2]/10 relative"
                                      : templateStyle === 'darkCrimson'
                                        ? "bg-[#000000] border-[#FF1100]/20 relative"
                                        : templateStyle === 'purpleDream'
                                          ? "bg-[#E7F5F9] border-[#E83DEE]/20 relative"
                                          : templateStyle === 'elegantPaper'
                                            ? "bg-[#EFE9DB] border-[#E75C31]/20 relative"
                                            : templateStyle === 'roseParchment'
                                              ? "bg-[#FFE8F0] border-[#E358A2]/20 relative"
                                              : "bg-white/90 border-black/5" // magazine样式
                      )}
                    >
                      <motion.div 
                        layout
                        transition={{ duration: 0.5, type: "spring", damping: 20 }}
                        className={cn(
                          "prose prose-lg max-w-none transition-all duration-300",
                          templateStyle === 'classic' || templateStyle === 'darkWine' || templateStyle === 'darkCrimson' || templateStyle === 'purpleDream'
                            ? "prose-invert" 
                            : templateStyle === 'artisan' || templateStyle === 'natural' || 
                              templateStyle === 'paperMemo' || templateStyle === 'oceanBreeze' || 
                              templateStyle === 'elegantPaper' || 
                              templateStyle === 'roseParchment'
                              ? "prose-slate"
                              : "prose-slate",
                          // 杂志模板添加双列布局
                          templateStyle === 'magazine' && "sm:columns-2 sm:gap-8"
                        )}
                      >
                        <div className="transition-all duration-500">
                          {paragraphs.map((paragraph, index) => (
                            <motion.p
                              key={index}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.5, delay: index * 0.1 }}
                              className={cn(
                                "font-serif italic leading-relaxed text-lg md:text-xl",
                                templateStyle === 'classic'
                                  ? "text-gray-100"
                                  : templateStyle === 'darkWine'
                                    ? "text-[#F4F4F4]"
                                    : templateStyle === 'magazine'
                                      ? "text-gray-900"
                                      : templateStyle === 'artisan'
                                        ? "text-[#B00702]"
                                        : templateStyle === 'natural'
                                          ? "text-[#5E4027]"
                                          : templateStyle === 'paperMemo'
                                            ? "text-[#151212]"
                                          : templateStyle === 'oceanBreeze'
                                            ? "text-[#0B5A6B]"
                                          : templateStyle === 'darkCrimson'
                                            ? "text-[#FF1100]"
                                          : templateStyle === 'purpleDream'
                                            ? "text-[#E83DEE]"
                                          : templateStyle === 'elegantPaper'
                                            ? "text-[#E75C31]"
                                          : templateStyle === 'roseParchment'
                                            ? "text-[#E358A2]"
                                            : "text-gray-800"
                              )}
                              style={{ 
                                fontFamily: language === 'zh' 
                                  ? `${TEMPLATES[templateStyle].style.contentFont}, "Noto Serif SC", serif`
                                  : TEMPLATES[templateStyle].style.contentFont
                              }}
                            >
                              {paragraph.trim()}
                            </motion.p>
                          ))}
                        </div>
                      </motion.div>
                    </motion.div>

                    {/* 水印和按钮区域 - 移到了内容区域外面 */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: paragraphs.length * 0.1 + 0.5 }}
                      className="mt-8 space-y-6"
                    >
                      {/* 水印部分 */}
                      {getWatermarkHTML()}
                      
                      {/* 写回信按钮 */}
                      <div className="flex justify-center">
                        <Link href="/write">
                          <Button 
                            className={cn(
                              "rounded-full px-8 py-2 flex items-center gap-2 transition-all duration-300",
                              getButtonStyles()
                            )}
                          >
                            <PenLine className="w-4 h-4" />
                            {language === 'en' ? 'Write a letter back' : '写一封回信'}
                          </Button>
                        </Link>
                      </div>
                    </motion.div>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
} 