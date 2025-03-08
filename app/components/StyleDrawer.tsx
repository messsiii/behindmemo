'use client'

import { useLanguage } from '@/contexts/LanguageContext'
import { cn } from '@/lib/utils'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckIcon, ChevronUp, Infinity, Sparkles } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import useSWR from 'swr'

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

interface StyleDrawerProps {
  templates: Record<string, Template>
  selectedTemplate: string
  onTemplateChange: (template: string) => void
  isShown: boolean
  onToggle: () => void
}

// 积分信息接口
interface CreditsInfo {
  credits: number
  isVIP: boolean
  vipExpiresAt: string | null
}

// 数据获取函数
const fetcher = (url: string) =>
  fetch(url, {
    credentials: 'include',
  }).then(res => {
    if (!res.ok) throw new Error('Failed to fetch credits')
    return res.json()
  })

// 自定义积分显示组件，为深色背景优化
function StyleDrawerCredits() {
  const { data: session } = useSession()
  const { language } = useLanguage()

  const {
    data: creditsInfo,
    isLoading,
    error,
  } = useSWR<CreditsInfo>(session?.user?.id ? '/api/user/credits' : null, fetcher, {
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    refreshInterval: 30000,
    dedupingInterval: 5000,
  })

  // 如果未登录，不显示任何内容
  if (!session?.user?.id) return null

  // 如果发生错误，显示错误状态
  if (error) {
    return (
      <div className="flex items-center gap-1 text-red-400">
        <span className="text-sm font-medium">!</span>
        <Sparkles className="h-4 w-4" />
      </div>
    )
  }

  // 如果正在加载，显示加载状态
  if (isLoading) {
    return (
      <div className="flex items-center gap-1 text-white/60 animate-pulse">
        <span className="text-sm font-medium">...</span>
        <Sparkles className="h-4 w-4" />
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 rounded-full text-white">
      {creditsInfo?.isVIP ? (
        <>
          <Infinity className="h-4 w-4 text-white" />
          <span className="text-sm font-medium text-white">VIP</span>
        </>
      ) : (
        <>
          <span className="text-sm font-medium text-white">{creditsInfo?.credits}</span>
          <Sparkles className="h-4 w-4 text-white" />
        </>
      )}
    </div>
  )
}

export function StyleDrawer({
  templates,
  selectedTemplate,
  onTemplateChange,
  isShown,
  onToggle,
}: StyleDrawerProps) {
  const { language } = useLanguage()
  const [isHovered, setIsHovered] = useState<string | null>(null)
  const [initialRender, setInitialRender] = useState(true)
  const [isMobile, setIsMobile] = useState(false)

  // 在组件挂载后标记初始渲染已完成，并检测设备类型
  useEffect(() => {
    setInitialRender(false)
    
    // 检测移动设备
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  return (
    <div className={cn(
      "fixed bottom-0 left-0 right-0 z-50 overflow-hidden",
      !isShown && "pointer-events-none"
    )}>
      <AnimatePresence initial={false}>
        <motion.div
          key="drawer-container"
          initial={false}
          animate={{ 
            y: isShown ? 0 : 'calc(100% - 36px)',
          }}
          transition={{ 
            type: 'spring', 
            damping: 30, 
            stiffness: 200,
            mass: 0.8 
          }}
          className="bg-gradient-to-b from-black/90 to-black/80 backdrop-blur-xl border-t border-l border-r border-white/10 rounded-t-xl overflow-hidden"
          style={{ 
            boxShadow: '0 -10px 25px rgba(0,0,0,0.2)',
            maxHeight: isMobile ? 'calc(75vh + 36px)' : 'calc(60vh + 36px)', // 移动设备上增加高度
            willChange: 'transform'
          }}
        >
          {/* 抽屉把手与标题区域 - 始终可见部分 */}
          <div 
            className="h-9 cursor-pointer flex items-center justify-center relative pointer-events-auto"
            onClick={(e) => {
              e.stopPropagation()
              onToggle()
            }}
          >
            <div className="absolute top-[6px] left-1/2 transform -translate-x-1/2 w-10 h-1 bg-white/20 rounded-full" />
            
            <motion.div
              animate={{ opacity: isShown ? 0 : 1, y: isShown ? -10 : 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <span className="text-xs font-medium text-white/70 flex items-center gap-1.5">
                <ChevronUp size={14} className="text-white/50" />
                {language === 'en' ? 'View Styles' : '查看样式'}
              </span>
            </motion.div>

            <motion.div
              animate={{ 
                opacity: isShown ? 1 : 0,
                y: isShown ? 0 : 10,
              }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <span className="text-xs font-medium text-white/70 flex items-center gap-1.5">
                <motion.span
                  animate={{ rotate: isShown ? 180 : 0 }}
                  className="inline-flex"
                >
                  <ChevronUp size={14} className="text-white/50" />
                </motion.span>
                {language === 'en' ? 'Hide Styles' : '隐藏样式'}
              </span>
            </motion.div>
          </div>
          
          {/* 抽屉内容区域 - 当抽屉打开时才接收点击事件 */}
          <div 
            className={cn(
              "overflow-y-auto scrollbar-none",
              isShown ? "pointer-events-auto" : "pointer-events-none"
            )}
            style={{ maxHeight: isMobile ? 'calc(75vh)' : 'calc(60vh)' }}
          >
            {/* 背景装饰 */}
            <div className="absolute inset-0 overflow-hidden opacity-10 pointer-events-none">
              <div className="absolute top-0 right-0 w-1/3 h-1/3 bg-gradient-to-br from-blue-500/30 via-purple-500/30 to-transparent rounded-full blur-3xl"></div>
              <div className="absolute bottom-0 left-0 w-1/3 h-1/3 bg-gradient-to-tr from-rose-500/30 via-amber-500/30 to-transparent rounded-full blur-3xl"></div>
            </div>

            {/* 标题和积分区域 */}
            <div className="max-w-6xl mx-auto relative px-4 sm:px-6 pt-3 pb-5 border-b border-white/10 mb-6">
              {/* 标题和积分 */}
              <div className="flex items-center justify-between">
                <motion.h3 
                  initial={initialRender ? false : { opacity: 0, y: 20 }}
                  animate={{ opacity: isShown ? 1 : 0, y: isShown ? 0 : 20 }}
                  transition={{ duration: 0.4, delay: 0.1 }}
                  className="text-2xl font-semibold text-white tracking-tight"
                >
                  {language === 'en' ? 'Style Gallery' : '样式画廊'}
                </motion.h3>
                
                {/* 自定义积分显示组件 */}
                <motion.div
                  initial={initialRender ? false : { opacity: 0, scale: 0.9 }}
                  animate={{ opacity: isShown ? 1 : 0, scale: isShown ? 1 : 0.9 }}
                  transition={{ duration: 0.4, delay: 0.2 }}
                >
                  <StyleDrawerCredits />
                </motion.div>
              </div>
            </div>

            {/* 模板卡片区域 */}
            <div className="max-w-6xl mx-auto relative px-4 sm:px-6 pb-4">
              <motion.div 
                initial={initialRender ? false : { opacity: 0 }}
                animate={{ opacity: isShown ? 1 : 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
                className="flex flex-wrap gap-5 sm:gap-6 md:gap-8 items-start justify-center sm:justify-start"
              >
                {Object.entries(templates).map(([key, template], index) => (
                  <motion.div
                    key={key}
                    className="relative"
                    initial={initialRender ? false : { opacity: 0, y: 20 }}
                    animate={{ opacity: isShown ? 1 : 0, y: isShown ? 0 : 20 }}
                    transition={{ 
                      delay: isShown ? index * 0.05 + 0.2 : 0,
                      duration: 0.4
                    }}
                    onMouseEnter={() => setIsHovered(key)}
                    onMouseLeave={() => setIsHovered(null)}
                  >
                    <button
                      onClick={() => onTemplateChange(key)}
                      className={cn(
                        "aspect-[3/4] rounded-lg overflow-hidden transition-all duration-300",
                        // 移动端卡片更小，但比例保持一致
                        "w-[115px] sm:w-[150px] md:w-[170px]",
                        selectedTemplate === key
                          ? "ring-2 ring-offset-2 ring-offset-black/80 ring-white/80 scale-105 shadow-xl shadow-black/40"
                          : "opacity-80 hover:opacity-100 hover:scale-105 hover:shadow-lg hover:shadow-black/20 hover:ring-1 hover:ring-white/30 hover:ring-offset-1 hover:ring-offset-black/80",
                        key === 'classic' && "bg-gradient-to-br from-[#0F0F0F] to-[#252525]",
                        key === 'postcard' && "bg-gradient-to-r from-[#f9f7f7] to-[#ffffff]",
                        key === 'magazine' && "bg-gradient-to-br from-[#ffffff] to-[#f5f5f5]"
                      )}
                    >
                      {/* 选中标记 - 右上角 */}
                      {selectedTemplate === key && (
                        <motion.div 
                          className="absolute top-2 right-2 z-10 bg-white/90 rounded-full p-0.5"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        >
                          <CheckIcon className="h-3 w-3 text-black" />
                        </motion.div>
                      )}
                      
                      {/* 模板预览内容 */}
                      <div className="relative w-full h-full flex items-center justify-center p-2 sm:p-3">
                        <div
                          className={cn(
                            "relative w-full h-full flex flex-col items-center justify-center",
                            "rounded-md overflow-hidden border shadow-md",
                            key === 'classic' 
                              ? "border-white/20 bg-black/40" 
                              : "border-black/10 bg-white/90",
                            selectedTemplate === key && "shadow-inner"
                          )}
                        >
                          {/* 卡片光效 */}
                          <div 
                            className={cn(
                              "absolute inset-0 opacity-30 pointer-events-none",
                              key === 'classic' 
                                ? "bg-gradient-to-br from-blue-900/20 via-transparent to-purple-900/20" 
                                : "bg-gradient-to-br from-blue-100/30 via-transparent to-rose-100/30"
                            )}
                          />
                          
                          {/* 模板标题 */}
                          <div
                            className={cn(
                              "absolute top-2 left-0 right-0 text-center px-2 font-semibold",
                              key === 'classic' ? "text-white" : "text-black"
                            )}
                            style={{
                              fontFamily: template.style.titleFont,
                              fontSize: '9px',
                            }}
                          >
                            {template.name}
                          </div>
                          
                          {/* 模板示例内容 - 图片部分 */}
                          <div
                            className={cn(
                              "absolute top-8 left-2 right-2 h-[28%]", 
                              "rounded overflow-hidden",
                              key === 'classic' 
                                ? "bg-gray-800 shadow-sm shadow-white/5" 
                                : "bg-gray-100 shadow-sm shadow-black/5"
                            )}
                          >
                            <div className="w-full h-full bg-gradient-to-br from-rose-300/30 via-purple-300/30 to-blue-300/30" />
                          </div>
                          
                          {/* 模板示例内容 - 文本部分 */}
                          <div
                            className={cn(
                              "absolute bottom-2 left-2 right-2 top-[48%]",
                              "rounded",
                              key === 'classic' 
                                ? "bg-white/10 border border-white/20" 
                                : "bg-white border border-black/10",
                              key === 'magazine' && "columns-2 gap-1"
                            )}
                          >
                            <div className={cn(
                              "w-full h-full flex flex-col justify-center",
                              key === 'classic' ? "items-center" : "items-center"
                            )}>
                              {[1, 2, 3].map((line) => (
                                <div 
                                  key={line}
                                  className={cn(
                                    "w-[70%] h-[2px] rounded-full my-[3px]",
                                    key === 'classic' ? "bg-white/30" : "bg-black/20"
                                  )}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </button>
                    
                    {/* 模板名称 */}
                    <motion.div 
                      className={cn(
                        "text-center text-xs mt-2 sm:mt-4",
                        selectedTemplate === key 
                          ? "text-white font-medium" 
                          : "text-white/60 font-normal"
                      )}
                      animate={{ 
                        color: selectedTemplate === key 
                          ? "rgba(255,255,255,1)" 
                          : isHovered === key 
                            ? "rgba(255,255,255,0.9)" 
                            : "rgba(255,255,255,0.6)" 
                      }}
                      transition={{ duration: 0.3 }}
                    >
                      {template.name}
                    </motion.div>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* 全局样式 - 隐藏滚动条 */}
      <style jsx global>{`
        /* 隐藏滚动条但保持可滚动功能 */
        .scrollbar-none {
          -ms-overflow-style: none;  /* IE and Edge */
          scrollbar-width: none;  /* Firefox */
        }
        .scrollbar-none::-webkit-scrollbar {
          display: none;  /* Chrome, Safari and Opera */
        }
      `}</style>
    </div>
  )
} 