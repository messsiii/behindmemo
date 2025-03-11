'use client'

import { useLanguage } from '@/contexts/LanguageContext'
import { cn } from '@/lib/utils'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckIcon, ChevronUp, EyeIcon, EyeOffIcon, Infinity, Lock, Sparkles } from 'lucide-react'
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
  isFree?: boolean
}

interface StyleDrawerProps {
  templates: Record<string, Template>
  selectedTemplate: string
  onTemplateChange: (template: string) => void
  isShown: boolean
  onToggle: () => void
  isVIP?: boolean
  unlockedTemplates?: string[]
  hideWatermark?: boolean
  onWatermarkToggle?: (hide: boolean) => void
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
  const [refreshKey, setRefreshKey] = useState(0) // 添加一个状态用于强制刷新
  
  // 监听积分更新事件
  useEffect(() => {
    const handleCreditsUpdate = () => {
      // 通过增加 refreshKey 来触发 SWR 重新获取数据
      setRefreshKey(prevKey => prevKey + 1)
    }
    
    window.addEventListener('credits:update', handleCreditsUpdate)
    
    return () => {
      window.removeEventListener('credits:update', handleCreditsUpdate)
    }
  }, [])
  
  const {
    data: creditsInfo,
    isLoading,
    error,
    mutate // 添加 mutate 函数
  } = useSWR<CreditsInfo>(
    session?.user?.id ? ['/api/user/credits', refreshKey] : null, 
    ([url]) => fetcher(url), 
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      refreshInterval: 30000,
      dedupingInterval: 5000,
    }
  )
  
  // 检测到 refreshKey 变化时重新获取数据
  useEffect(() => {
    if (refreshKey > 0) {
      mutate() // 手动触发 SWR 重新获取数据
    }
  }, [refreshKey, mutate])

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
  isVIP = false,
  unlockedTemplates = [],
  hideWatermark = false,
  onWatermarkToggle
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
              {/* 标题和功能区 */}
              <div className="flex items-center justify-between">
                <motion.h3 
                  initial={initialRender ? false : { opacity: 0, y: 20 }}
                  animate={{ opacity: isShown ? 1 : 0, y: isShown ? 0 : 20 }}
                  transition={{ duration: 0.4, delay: 0.1 }}
                  className="text-2xl font-semibold text-white tracking-tight"
                >
                  {language === 'en' ? 'Style Gallery' : '样式画廊'}
                </motion.h3>
                
                {/* 右侧功能区域：积分显示和水印控制 */}
                <motion.div
                  initial={initialRender ? false : { opacity: 0, scale: 0.9 }}
                  animate={{ opacity: isShown ? 1 : 0, scale: isShown ? 1 : 0.9 }}
                  transition={{ duration: 0.4, delay: 0.2 }}
                  className="flex items-center space-x-3"
                >
                  {/* 水印控制开关 - 创意版本 */}
                  <div className="bg-black/30 rounded-lg py-1.5 px-3 flex items-center space-x-2">
                    <div className="flex items-center mr-2">
                      <span className="text-xs font-medium text-white">
                        {language === 'en' ? 'Watermark' : '水印'}
                      </span>
                      {!isVIP && (
                        <div className="ml-1 px-1 py-0.5 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-sm text-[10px] text-white font-medium">
                          VIP
                        </div>
                      )}
                    </div>
                    
                    {/* 自定义水印开关 */}
                    <div 
                      className={`
                        relative h-6 w-12 rounded-full transition-colors duration-200 ease-in-out
                        ${hideWatermark 
                          ? 'bg-red-500/30 border border-red-500/50' 
                          : 'bg-green-500/30 border border-green-500/50'}
                        ${isVIP ? 'cursor-pointer' : 'opacity-60 cursor-pointer'}
                      `}
                      onClick={() => {
                        if (isVIP && onWatermarkToggle) {
                          onWatermarkToggle(!hideWatermark);
                        } else if (!isVIP && onWatermarkToggle && !hideWatermark) {
                          onWatermarkToggle(true);
                        }
                      }}
                    >
                      <motion.div
                        animate={{ 
                          x: hideWatermark ? 24 : 0,
                          backgroundColor: hideWatermark ? 'rgb(239, 68, 68)' : 'rgb(16, 185, 129)',
                        }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        className="absolute top-[2px] left-[2px] h-5 w-5 rounded-full bg-green-500 flex items-center justify-center"
                      >
                        {hideWatermark ? (
                          <EyeOffIcon className="h-3 w-3 text-white" />
                        ) : (
                          <EyeIcon className="h-3 w-3 text-white" />
                        )}
                      </motion.div>
                      <span className="sr-only">
                        {hideWatermark 
                          ? (language === 'en' ? 'Watermark hidden' : '水印已隐藏') 
                          : (language === 'en' ? 'Watermark visible' : '水印可见')}
                      </span>
                    </div>
                  </div>
                  
                  {/* 积分显示组件 */}
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
                className="flex flex-wrap gap-5 sm:gap-6 md:gap-8 items-start justify-center mx-auto"
                style={{ maxWidth: '1200px' }}
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
                        key === 'postcard' && "overflow-hidden",
                        key === 'magazine' && "overflow-hidden",
                        key === 'artisan' && "overflow-hidden",
                        key === 'natural' && "overflow-hidden",
                        key === 'darkWine' && "overflow-hidden",
                        key === 'paperMemo' && "overflow-hidden",
                        key === 'oceanBreeze' && "overflow-hidden",
                        key === 'darkCrimson' && "overflow-hidden",
                        key === 'purpleDream' && "overflow-hidden",
                        key === 'elegantPaper' && "overflow-hidden",
                        key === 'roseParchment' && "overflow-hidden"
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
                      
                      {/* 锁定标记 - 当模板是付费且未解锁时 */}
                      {!templates[key].isFree && !isVIP && !unlockedTemplates.includes(key) && (
                        <motion.div 
                          className="absolute top-2 left-2 z-10 bg-black/70 rounded-full py-1 px-2 flex items-center"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.3 }}
                        >
                          <Lock className="h-3.5 w-3.5 text-white" />
                          <span className="text-[10px] font-medium text-white ml-1">5点</span>
                        </motion.div>
                      )}
                      
                      {/* VIP标记 - 当模板是付费且用户是VIP时 */}
                      {!templates[key].isFree && isVIP && (
                        <motion.div 
                          className="absolute top-2 left-2 z-10 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full p-1.5"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.3 }}
                        >
                          <Infinity className="h-3.5 w-3.5 text-white" />
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
                              : key === 'artisan'
                                ? "border-white/20" // 去掉背景色，使用真实背景图片
                                : key === 'natural'
                                  ? "border-white/20" // 去掉背景色，使用真实背景图片
                                  : key === 'darkWine'
                                    ? "border-white/20" // 去掉背景色，使用真实背景图片
                                    : key === 'paperMemo'
                                      ? "border-white/20" // 去掉背景色，使用真实背景图片
                                      : key === 'oceanBreeze'
                                        ? "border-white/20" // 去掉背景色，使用真实背景图片
                                        : key === 'darkCrimson'
                                          ? "border-white/20" // 去掉背景色，使用真实背景图片
                                          : key === 'purpleDream'
                                            ? "border-white/20" // 去掉背景色，使用真实背景图片
                                            : key === 'elegantPaper'
                                              ? "border-white/20" // 去掉背景色，使用真实背景图片
                                              : key === 'roseParchment'
                                                ? "border-white/20" // 去掉背景色，使用真实背景图片
                                                : key === 'postcard' || key === 'magazine'
                                                  ? "border-white/20" // 使用相同的边框样式
                                                  : "border-black/10 bg-white/90",
                            selectedTemplate === key && "shadow-inner"
                          )}
                        >
                          {/* Artisan模板特殊背景 */}
                          {key === 'artisan' && (
                            <>
                              <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: 'url(/images/artisan-red-bg.jpg)' }}></div>
                              <div className="absolute inset-0 bg-black/10"></div>
                            </>
                          )}

                          {/* Natural模板特殊背景 */}
                          {key === 'natural' && (
                            <>
                              <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: 'url(/images/natural-bg.jpg)' }}></div>
                              <div className="absolute inset-0 bg-black/10"></div>
                            </>
                          )}

                          {/* Dark Wine模板特殊背景 */}
                          {key === 'darkWine' && (
                            <>
                              <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: 'url(/images/dark-wine-bg.jpg)' }}></div>
                              <div className="absolute inset-0 bg-black/10"></div>
                            </>
                          )}

                          {/* Paper Memo模板特殊背景 */}
                          {key === 'paperMemo' && (
                            <>
                              <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: 'url(/images/annie-spratt-fDghTk7Typw-unsplash.jpg)' }}></div>
                              <div className="absolute inset-0 bg-black/10"></div>
                            </>
                          )}

                          {/* Ocean Breeze模板特殊背景 */}
                          {key === 'oceanBreeze' && (
                            <>
                              <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: 'url(/images/pawel-czerwinski-YUGf6Hs1F3A-unsplash.jpg)' }}></div>
                              <div className="absolute inset-0 bg-black/10"></div>
                            </>
                          )}

                          {/* Dark Crimson模板特殊背景 */}
                          {key === 'darkCrimson' && (
                            <>
                              <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: 'url(/images/sufyan-eRpeXTJEgMw-unsplash.jpg)' }}></div>
                              <div className="absolute inset-0 bg-black/20"></div>
                            </>
                          )}

                          {/* Purple Dream模板特殊背景 */}
                          {key === 'purpleDream' && (
                            <>
                              <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: 'url(/images/efe-kurnaz-RnCPiXixooY-unsplash.jpg)' }}></div>
                              <div className="absolute inset-0 bg-black/20"></div>
                            </>
                          )}

                          {/* Elegant Paper模板特殊背景 */}
                          {key === 'elegantPaper' && (
                            <>
                              <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: 'url(/images/lunelle-B-9i06FP0SI-unsplash.jpg)' }}></div>
                              <div className="absolute inset-0 bg-black/20"></div>
                            </>
                          )}

                          {/* Rose Parchment模板特殊背景 */}
                          {key === 'roseParchment' && (
                            <>
                              <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: 'url(/images/andrei-j-castanha-V8GVT2XQ5oc-unsplash.jpg)' }}></div>
                              <div className="absolute inset-0 bg-black/20"></div>
                            </>
                          )}

                          {/* Postcard模板特殊背景 */}
                          {key === 'postcard' && (
                            <>
                              <div className="absolute inset-0 bg-gradient-to-br from-[#f9f7f7] to-[#ffffff]"></div>
                              <div className="absolute inset-0 bg-black/5"></div>
                            </>
                          )}

                          {/* Magazine模板特殊背景 */}
                          {key === 'magazine' && (
                            <>
                              <div className="absolute inset-0 bg-gradient-to-br from-[#ffffff] to-[#f5f5f5]"></div>
                              <div className="absolute inset-0 bg-black/5"></div>
                            </>
                          )}

                          {/* 卡片光效 */}
                          <div 
                            className={cn(
                              "absolute inset-0 opacity-30 pointer-events-none",
                              key === 'classic' 
                                ? "bg-gradient-to-br from-blue-900/20 via-transparent to-purple-900/20" 
                                : key === 'artisan'
                                  ? "bg-gradient-to-r from-red-900/40 via-transparent to-red-900/10" // Artisan模板的光效
                                  : key === 'natural'
                                    ? "bg-gradient-to-r from-yellow-900/40 via-transparent to-yellow-900/10" // Natural模板的光效
                                    : key === 'darkWine'
                                      ? "bg-gradient-to-r from-pink-900/40 via-transparent to-pink-900/10" // Dark Wine模板的光效
                                      : key === 'paperMemo'
                                        ? "bg-gradient-to-r from-gray-900/40 via-transparent to-gray-900/10" // Paper Memo模板的光效
                                        : key === 'oceanBreeze'
                                          ? "bg-gradient-to-r from-blue-900/40 via-transparent to-blue-900/10" // Ocean Breeze模板的光效
                                          : key === 'darkCrimson'
                                            ? "bg-gradient-to-r from-red-900/40 via-transparent to-red-900/10" // Dark Crimson模板的光效
                                            : key === 'purpleDream'
                                              ? "bg-gradient-to-r from-pink-900/40 via-transparent to-pink-900/10" // Purple Dream模板的光效
                                              : key === 'elegantPaper'
                                                ? "bg-gradient-to-r from-gray-900/40 via-transparent to-gray-900/10" // Elegant Paper模板的光效
                                                : key === 'roseParchment'
                                                  ? "bg-gradient-to-r from-pink-900/40 via-transparent to-pink-900/10" // Rose Parchment模板的光效
                                                  : key === 'postcard'
                                                    ? "bg-gradient-to-r from-blue-200/40 via-transparent to-pink-200/10" // Postcard模板的光效
                                                    : key === 'magazine'
                                                      ? "bg-gradient-to-r from-indigo-200/40 via-transparent to-purple-200/10" // Magazine模板的光效
                                                      : "bg-gradient-to-br from-blue-100/30 via-transparent to-rose-100/30"
                            )}
                          />
                          
                          {/* 模板标题 */}
                          <div
                            className={cn(
                              "absolute top-2 left-0 right-0 text-center px-2 font-semibold",
                              (key === 'classic' || key === 'darkWine' || key === 'paperMemo' || key === 'oceanBreeze' || key === 'darkCrimson' || key === 'purpleDream') ? "text-white" : "text-black" 
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
                              (key === 'classic' || key === 'artisan' || key === 'natural' || key === 'darkWine')
                                ? "bg-gray-800 shadow-sm shadow-white/5" 
                                : "bg-gray-100 shadow-sm shadow-black/5"
                            )}
                          >
                            <div className={cn(
                              "w-full h-full",
                              key === 'artisan' 
                                ? "bg-gradient-to-br from-rose-300/50 via-red-300/50 to-orange-300/50" // Artisan模板的图片背景色
                                : key === 'natural'
                                  ? "bg-gradient-to-br from-yellow-300/50 via-orange-300/50 to-orange-300/50" // Natural模板的图片背景色
                                  : key === 'darkWine'
                                    ? "bg-gradient-to-br from-pink-300/50 via-purple-300/50 to-purple-300/50" // Dark Wine模板的图片背景色
                                    : "bg-gradient-to-br from-rose-300/30 via-purple-300/30 to-blue-300/30"
                            )} />
                          </div>
                          
                          {/* 模板示例内容 - 文本部分 */}
                          <div
                            className={cn(
                              "absolute bottom-2 left-2 right-2 top-[48%]",
                              "rounded",
                              key === 'classic' 
                                ? "bg-white/10 border border-white/20" 
                                : key === 'artisan'
                                  ? "bg-[#CFCFCC] border-none" // Artisan模板的文本背景 
                                  : key === 'natural'
                                    ? "bg-[#FFFFF2] border-none" // Natural模板的文本背景
                                    : key === 'darkWine'
                                      ? "bg-[#430311] border-none" // Dark Wine模板的文本背景
                                      : key === 'paperMemo'
                                        ? "bg-[#C9C9C9] border-none" // Paper Memo模板的文本背景
                                        : key === 'oceanBreeze'
                                          ? "bg-[#F5F5EF] border-none" // Ocean Breeze模板的文本背景
                                          : key === 'darkCrimson'
                                            ? "bg-[#000000] border-none" // Dark Crimson模板的文本背景
                                            : key === 'purpleDream'
                                              ? "bg-[#F5F5EF] border-none" // Purple Dream模板的文本背景
                                              : key === 'elegantPaper'
                                                ? "bg-[#EFE9DB] border-none" // Elegant Paper模板的文本背景
                                                : key === 'roseParchment'
                                                  ? "bg-[#FAEFDA] border-none" // Rose Parchment模板的文本背景
                                                  : key === 'postcard' || key === 'magazine'
                                                    ? "bg-white border border-black/10" // 浅色背景下的文本区域
                                                    : "bg-white border border-black/10"
                            )}
                          >
                            {/* Magazine模板双列文字样式优化 */}
                            {key === 'magazine' ? (
                              <div className="w-full h-full flex justify-center items-center px-2">
                                <div className="w-1/2 pr-2 flex flex-col justify-center items-center border-r border-gray-200">
                                  <div className="w-[85%] h-[2px] rounded-full my-[3px] bg-black/20" />
                                  <div className="w-[75%] h-[2px] rounded-full my-[3px] bg-black/20" />
                                  <div className="w-[65%] h-[2px] rounded-full my-[3px] bg-black/20" />
                                </div>
                                <div className="w-1/2 pl-2 flex flex-col justify-center items-center">
                                  <div className="w-[75%] h-[2px] rounded-full my-[3px] bg-black/20" />
                                  <div className="w-[85%] h-[2px] rounded-full my-[3px] bg-black/20" />
                                  <div className="w-[65%] h-[2px] rounded-full my-[3px] bg-black/20" />
                                </div>
                              </div>
                            ) : key === 'artisan' ? (
                              <div className="w-full h-full flex flex-col justify-center items-center relative">
                                {/* Artisan模板骨架 */}
                                <div className="absolute inset-2 border-2 border-[#B00702]/30 rounded-sm"></div>
                                <div className="w-[70%] h-[2px] rounded-full my-[3px] bg-[#B00702]/70" />
                                <div className="w-[60%] h-[2px] rounded-full my-[3px] bg-[#B00702]/70" />
                                <div className="w-[80%] h-[2px] rounded-full my-[3px] bg-[#B00702]/70" />
                              </div>
                            ) : key === 'natural' ? (
                              <div className="w-full h-full flex flex-col justify-center items-center relative">
                                {/* Natural模板骨架 */}
                                <div className="absolute inset-2 border-2 border-[#5E4027]/30 rounded-sm"></div>
                                <div className="w-[70%] h-[2px] rounded-full my-[3px] bg-[#5E4027]/70" />
                                <div className="w-[60%] h-[2px] rounded-full my-[3px] bg-[#5E4027]/70" />
                                <div className="w-[80%] h-[2px] rounded-full my-[3px] bg-[#5E4027]/70" />
                              </div>
                            ) : key === 'paperMemo' ? (
                              <div className="w-full h-full flex flex-col justify-center items-center relative">
                                {/* Paper Memo模板骨架 */}
                                <div className="absolute inset-2 border-2 border-[#151212]/30 rounded-sm"></div>
                                <div className="w-[70%] h-[2px] rounded-full my-[3px] bg-[#151212]/70" />
                                <div className="w-[60%] h-[2px] rounded-full my-[3px] bg-[#151212]/70" />
                                <div className="w-[80%] h-[2px] rounded-full my-[3px] bg-[#151212]/70" />
                              </div>
                            ) : key === 'oceanBreeze' ? (
                              <div className="w-full h-full flex flex-col justify-center items-center relative">
                                {/* Ocean Breeze模板骨架 */}
                                <div className="absolute inset-2 border-2 border-[#0B5A6B]/30 rounded-sm"></div>
                                <div className="w-[70%] h-[2px] rounded-full my-[3px] bg-[#0B5A6B]/70" />
                                <div className="w-[60%] h-[2px] rounded-full my-[3px] bg-[#0B5A6B]/70" />
                                <div className="w-[80%] h-[2px] rounded-full my-[3px] bg-[#0B5A6B]/70" />
                              </div>
                            ) : key === 'darkCrimson' ? (
                              <div className="w-full h-full flex flex-col justify-center items-center relative">
                                {/* Dark Crimson模板骨架 */}
                                <div className="absolute inset-2 border-2 border-[#C41100]/30 rounded-sm"></div>
                                <div className="w-[70%] h-[2px] rounded-full my-[3px] bg-[#C41100]/70" />
                                <div className="w-[60%] h-[2px] rounded-full my-[3px] bg-[#C41100]/70" />
                                <div className="w-[80%] h-[2px] rounded-full my-[3px] bg-[#C41100]/70" />
                              </div>
                            ) : key === 'purpleDream' ? (
                              <div className="w-full h-full flex flex-col justify-center items-center relative">
                                {/* Purple Dream模板骨架 */}
                                <div className="absolute inset-2 border-2 border-[#E83DEE]/30 rounded-sm"></div>
                                <div className="w-[70%] h-[2px] rounded-full my-[3px] bg-[#E83DEE]/70" />
                                <div className="w-[60%] h-[2px] rounded-full my-[3px] bg-[#E83DEE]/70" />
                                <div className="w-[80%] h-[2px] rounded-full my-[3px] bg-[#E83DEE]/70" />
                              </div>
                            ) : key === 'elegantPaper' ? (
                              <div className="w-full h-full flex flex-col justify-center items-center relative">
                                {/* Elegant Paper模板骨架 */}
                                <div className="absolute inset-2 border-2 border-[#E75C31]/30 rounded-sm"></div>
                                <div className="w-[70%] h-[2px] rounded-full my-[3px] bg-[#E75C31]/70" />
                                <div className="w-[60%] h-[2px] rounded-full my-[3px] bg-[#E75C31]/70" />
                                <div className="w-[80%] h-[2px] rounded-full my-[3px] bg-[#E75C31]/70" />
                              </div>
                            ) : key === 'roseParchment' ? (
                              <div className="w-full h-full flex flex-col justify-center items-center relative">
                                {/* Rose Parchment模板骨架 */}
                                <div className="absolute inset-2 border-2 border-[#E358A2]/30 rounded-sm"></div>
                                <div className="w-[70%] h-[2px] rounded-full my-[3px] bg-[#E358A2]/70" />
                                <div className="w-[60%] h-[2px] rounded-full my-[3px] bg-[#E358A2]/70" />
                                <div className="w-[80%] h-[2px] rounded-full my-[3px] bg-[#E358A2]/70" />
                              </div>
                            ) : (
                              <div className={cn(
                                "w-full h-full flex flex-col justify-center items-center"
                              )}>
                                {[1, 2, 3].map((line) => (
                                  <div 
                                    key={line}
                                    className={cn(
                                      "w-[70%] h-[2px] rounded-full my-[3px]",
                                      key === 'classic' || key === 'darkWine'
                                        ? "bg-white/30"
                                        : key === 'postcard'
                                          ? "bg-black/20"
                                          : "bg-black/20"
                                    )}
                                  />
                                ))}
                              </div>
                            )}
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