'use client'

import { useEffect, useRef, useState, memo, useMemo, useCallback } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import { 
  Download, 
  Trash2, 
  Loader2, 
  Eye, 
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Copy,
  Check
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'
import useSWR from 'swr'
import { useLanguage } from '@/contexts/LanguageContext'
import { useSession } from 'next-auth/react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
// 移除缓存机制，直接从服务端加载历史记录

interface ImageGenerationRecord {
  id: string
  prompt: string
  inputImageUrl: string
  outputImageUrl: string | null
  localOutputImageUrl?: string | null
  status: 'pending' | 'completed' | 'failed'
  creditsUsed: number
  errorMessage?: string | null
  createdAt: string
  updatedAt: string
  model?: string
  metadata?: {
    mode?: 'multi-reference' | 'text-to-image'
    referenceImages?: string[]
    aspectRatio?: string
  } | null
}

interface OptimizedGenerationHistoryProps {
  onUseAsInput?: (imageUrl: string, type: 'input' | 'output', metadata?: any) => void
  className?: string
  onRefreshReady?: (refreshFn: () => Promise<void>) => void
}

// 图片懒加载组件
const LazyImage = memo(({ 
  src, 
  alt, 
  className,
  priority = false,
  onError,
  onClick
}: { 
  src: string
  alt: string
  className?: string
  priority?: boolean
  onError?: () => void
  onClick?: () => void
}) => {
  const [isInView, setIsInView] = useState(false)
  const [hasError, setHasError] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current || priority) {
      setIsInView(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true)
          observer.disconnect()
        }
      },
      { 
        rootMargin: '50px',
        threshold: 0.01 
      }
    )

    observer.observe(ref.current)

    return () => observer.disconnect()
  }, [priority])

  const handleError = () => {
    setHasError(true)
    onError?.()
  }


  return (
    <div 
      ref={ref} 
      className={cn("relative w-full h-full overflow-hidden bg-black/20", className)}
      onClick={onClick}
    >
      {isInView && !hasError ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes="(max-width: 768px) 50vw, 33vw"
          className="object-cover"
          unoptimized
          onError={handleError}
          loading={priority ? "eager" : "lazy"}
        />
      ) : hasError ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-white/40" />
        </div>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
        </div>
      )}
    </div>
  )
})

LazyImage.displayName = 'LazyImage'

// 移除缓存占位符检查逻辑，现在直接从服务端获取真实URL

// SWR fetcher
const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
}

export default function OptimizedGenerationHistory({ 
  onUseAsInput,
  className,
  onRefreshReady
}: OptimizedGenerationHistoryProps) {
  const { language } = useLanguage()
  const { data: session } = useSession()
  const [page, setPage] = useState(0)
  const [records, setRecords] = useState<ImageGenerationRecord[]>([])
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [viewingImage, setViewingImage] = useState<{ url: string, type: 'input' | 'output' } | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const loadMoreRef = useRef<HTMLDivElement>(null)

  // 用户登录后自动开始获取数据
  useEffect(() => {
    if (session?.user?.id) {
      setShouldFetch(true)
    }
  }, [session?.user?.id])

  // 完全移除自动更新检查功能，只在用户手动刷新时获取最新数据

  // 移除缓存fallback数据，直接从服务端获取

  // SWR key，确保稳定 - 初始加载10条，后续每页20条
  const swrKey = useMemo(() => {
    if (!session?.user?.id) return null
    const limit = page === 0 ? 10 : 20
    const offset = page === 0 ? 0 : 10 + (page - 1) * 20
    return `/api/user/generation-history?limit=${limit}&offset=${offset}`
  }, [session?.user?.id, page])

  // 添加一个状态来控制是否开始加载数据
  const [shouldFetch, setShouldFetch] = useState(false)
  
  // 使用 SWR 获取数据 - 简化配置，移除缓存fallback
  const { data, error, mutate, isLoading } = useSWR(
    shouldFetch ? swrKey : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 5000, // 5秒去重时间
      refreshInterval: 0, // 禁用自动刷新
    }
  )

  // 合并新数据到记录中 - 修复分页累加逻辑
  useEffect(() => {
    if (data?.records) {
      if (page === 0) {
        // 第一页：直接设置
        setRecords(data.records)
        console.log(`📄 Loaded page 0: ${data.records.length} records`)
      } else {
        // 后续页：累加到现有记录
        setRecords(prev => {
          const existingIds = new Set(prev.map(r => r.id))
          const newRecords = data.records.filter((r: ImageGenerationRecord) => !existingIds.has(r.id))
          console.log(`📄 Loaded page ${page}: ${newRecords.length} new records (total: ${prev.length + newRecords.length})`)
          return [...prev, ...newRecords]
        })
      }
    }
  }, [data?.records, page]) // 监听data.records的变化

  // Component will re-render with new key when generation completes
  // This triggers a fresh data fetch automatically

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Copy prompt to clipboard
  const copyPrompt = async (prompt: string, id: string) => {
    try {
      await navigator.clipboard.writeText(prompt)
      setCopiedId(id)
      toast({
        title: language === 'en' ? 'Copied!' : '已复制！',
        description: language === 'en' ? 'Prompt copied to clipboard' : '提示词已复制到剪贴板',
      })
      setTimeout(() => setCopiedId(null), 2000)
    } catch (error) {
      toast({
        title: language === 'en' ? 'Failed to copy' : '复制失败',
        variant: 'destructive',
      })
    }
  }

  // 无限滚动加载更多
  useEffect(() => {
    if (!loadMoreRef.current || !data?.pagination?.hasMore) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isLoading) {
          setPage(prev => prev + 1)
        }
      },
      { rootMargin: '100px' }
    )

    observer.observe(loadMoreRef.current)

    return () => observer.disconnect()
  }, [data?.pagination?.hasMore, isLoading])

  // 删除记录 - 移除缓存逻辑
  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      const response = await fetch(`/api/user/generation-history/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to delete')

      // 立即从列表中移除
      setRecords(prev => prev.filter(r => r.id !== id))
      
      toast({
        title: language === 'en' ? 'Deleted' : '已删除',
        description: language === 'en' ? 'Record deleted successfully' : '记录删除成功',
      })

      // 后台更新 SWR 缓存
      mutate()
    } catch (error) {
      console.error('Delete error:', error)
      toast({
        title: language === 'en' ? 'Error' : '错误',
        description: language === 'en' ? 'Failed to delete record' : '删除失败',
        variant: 'destructive'
      })
    } finally {
      setDeletingId(null)
      setDeleteConfirmId(null)
    }
  }

  // 刷新数据 - 移除缓存逻辑
  const handleRefresh = useCallback(async () => {
    setPage(0)
    setRecords([]) // 清空现有记录
    setShouldFetch(true)
    await mutate()
  }, [mutate])

  // 向父组件提供刷新函数
  useEffect(() => {
    if (onRefreshReady) {
      onRefreshReady(handleRefresh)
    }
  }, [onRefreshReady, handleRefresh])

  // 获取状态图标
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-green-400" />
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-400" />
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-400 animate-pulse" />
      default:
        return null
    }
  }

  // 格式化时间
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), language === 'en' ? 'MMM d, h:mm a' : 'M月d日 HH:mm')
    } catch {
      return dateString
    }
  }

  if (!session?.user) {
    return (
      <Card className={cn("!bg-black/20 backdrop-blur-lg border-white/10", className)}>
        <CardContent className="py-12 text-center text-white/60">
          <p>{language === 'en' ? 'Please sign in to view history' : '请登录查看历史记录'}</p>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={cn("!bg-black/20 backdrop-blur-lg border-white/10", className)}>
        <CardContent className="py-12 text-center">
          <AlertCircle className="w-8 h-8 mx-auto mb-4 text-red-400" />
          <p className="text-white/80">
            {language === 'en' ? 'Failed to load history' : '加载历史记录失败'}
          </p>
          <Button
            onClick={handleRefresh}
            variant="outline"
            className={cn(
              "mt-4",
              // 正常状态：深色背景，白色文字，白色边框
              "bg-black/60 border-white/60 text-white",
              // hover状态：更深的背景，更亮的边框
              "hover:bg-black/80 hover:border-white/80 hover:text-white",
              // focus状态
              "focus:bg-black/80 focus:border-white focus:text-white",
              // 确保文字可见性
              "backdrop-blur-sm font-medium"
            )}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            {language === 'en' ? 'Retry' : '重试'}
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (isLoading && records.length === 0) {
    return (
      <Card className={cn("!bg-black/20 backdrop-blur-lg border-white/10", className)}>
        <CardContent className="py-12">
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
            <p className="text-white/80">
              {language === 'en' ? 'Loading history...' : '加载历史记录中...'}
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // 移除了手动"加载历史"界面，现在自动加载最近10条记录

  if (records.length === 0) {
    return (
      <Card className={cn("!bg-black/20 backdrop-blur-lg border-white/10", className)}>
        <CardContent className="py-12 text-center">
          <p className="text-lg font-semibold text-white mb-2">
            {language === 'en' ? 'No generations yet' : '暂无生成记录'}
          </p>
          <p className="text-white/60">
            {language === 'en' 
              ? 'Your generation history will appear here' 
              : '您的生成历史将显示在这里'}
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <div className={cn("space-y-4", className)}>
        {/* 刷新按钮 */}
        <div className="flex justify-end items-center mb-4">
          <Button
            onClick={handleRefresh}
            variant="outline"
            size="sm"
            className={cn(
              // 正常状态：深色背景，白色文字，白色边框
              "bg-black/60 border-white/60 text-white",
              // hover状态：更深的背景，更亮的边框
              "hover:bg-black/80 hover:border-white/80 hover:text-white",
              // focus状态
              "focus:bg-black/80 focus:border-white focus:text-white",
              // disabled状态：降低透明度但保持对比度
              "disabled:bg-black/40 disabled:border-white/40 disabled:text-white/70",
              // 确保文字可见性
              "backdrop-blur-sm"
            )}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            {language === 'en' ? 'Refresh' : '刷新'}
          </Button>
        </div>

        {/* 历史记录网格 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {records.map((record, index) => (
              <motion.div
                key={record.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3, delay: index * 0.02 }}
              >
                <Card className="!bg-black/30 backdrop-blur-lg border-white/10 overflow-hidden">
                  <CardContent className="p-0">
                    {/* 图片展示区 */}
                    <div className={record.inputImageUrl || record.metadata?.referenceImages?.length ? "grid grid-cols-2 gap-0.5" : ""}>
                      {/* 输入图片 - 仅在有输入图片时显示 */}
                      {(record.inputImageUrl || record.metadata?.referenceImages?.length) && (
                      <div className="relative aspect-square group bg-slate-900 overflow-hidden">
                        {/* 多图参考模式显示多张图片 */}
                        {record.metadata?.mode === 'multi-reference' && record.metadata?.referenceImages?.length ? (
                          <div className="relative w-full h-full">
                            <div className="grid grid-cols-2 gap-0.5 w-full h-full">
                              {record.metadata?.referenceImages?.slice(0, 4).map((imgUrl: string, idx: number) => (
                                <div key={idx} className="relative overflow-hidden bg-slate-800">
                                  <img
                                    src={imgUrl}
                                    alt={`Reference ${idx + 1}`}
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                  />
                                  {(record.metadata?.referenceImages?.length || 0) > 4 && idx === 3 && (
                                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                      <span className="text-white text-sm">+{(record.metadata?.referenceImages?.length || 0) - 4}</span>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                            <div className="absolute inset-0 cursor-pointer hover:bg-black/20 transition-colors"
                                 onClick={() => {
                                   const url = record.metadata?.referenceImages?.[0] || ''
                                   if (url) {
                                     setViewingImage({ url, type: 'input' })
                                   }
                                 }}/>
                          </div>
                        ) : record.inputImageUrl ? (
                          <>
                            <img
                              src={record.inputImageUrl}
                              alt="Input image"
                              className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => setViewingImage({ url: record.inputImageUrl, type: 'input' })}
                              loading="lazy"
                            />
                          </>
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <AlertCircle className="w-6 h-6 text-white/40" />
                            <span className="text-xs text-white/40 ml-2">无图片</span>
                          </div>
                        )}
                        {/* 输入图片标签 */}
                        <div className="absolute top-1 left-1 bg-black/60 backdrop-blur-sm rounded px-1.5 py-0.5">
                          <span className="text-xs text-white/80">
                            {record.metadata?.mode === 'multi-reference' 
                              ? `${language === 'en' ? 'Ref' : '参考'} x${record.metadata.referenceImages?.length || 0}`
                              : (language === 'en' ? 'Input' : '输入')}
                          </span>
                        </div>
                        {/* 输入图片操作按钮 */}
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-2">
                          <div className="flex gap-1">
                            {onUseAsInput && (
                              <Button
                                size="sm"
                                variant="secondary"
                                className="flex-1 h-7 text-xs"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  // 多图参考模式传递所有参考图片
                                  if (record.metadata?.mode === 'multi-reference' && record.metadata?.referenceImages) {
                                    onUseAsInput('', 'input', record.metadata)
                                  } else {
                                    onUseAsInput(record.inputImageUrl || '', 'input', record.metadata)
                                  }
                                }}
                              >
                                {record.metadata?.mode === 'multi-reference' 
                                  ? (language === 'en' ? 'Restore' : '恢复') 
                                  : (language === 'en' ? 'Use' : '使用')}
                              </Button>
                            )}
                            {!isMobile && !record.metadata?.referenceImages && (
                              <Button
                                size="sm"
                                variant="secondary"
                                className="h-7 w-7 p-0"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  const link = document.createElement('a')
                                  link.href = record.inputImageUrl
                                  link.download = `input-${record.id}.png`
                                  link.click()
                                }}
                              >
                                <Download className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                      )}

                      {/* 输出图片 */}
                      <div className={`relative aspect-square group bg-slate-900 overflow-hidden ${!record.inputImageUrl && !record.metadata?.referenceImages?.length ? 'col-span-2' : ''}`}>
                        {record.status === 'completed' && record.outputImageUrl ? (
                          <>
                            <img
                              src={record.localOutputImageUrl || record.outputImageUrl}
                              alt="Output image"
                              className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => {
                                const url = record.localOutputImageUrl || record.outputImageUrl || ''
                                if (url) {
                                  setViewingImage({ url, type: 'output' })
                                }
                              }}
                              loading="lazy"
                            />
                          </>
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                            {record.status === 'pending' ? (
                              <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
                            ) : (
                              <div className="text-center p-2">
                                <AlertCircle className="w-6 h-6 mx-auto mb-1 text-red-400" />
                                <p className="text-xs text-white/60">
                                  {language === 'en' ? 'Failed' : '失败'}
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                        {/* 输出图片标签 */}
                        <div className="absolute top-1 left-1 bg-black/60 backdrop-blur-sm rounded px-1.5 py-0.5">
                          <span className="text-xs text-white/80">
                            {!record.inputImageUrl && !record.metadata?.referenceImages?.length 
                              ? (language === 'en' ? 'Generated' : '生成') 
                              : (language === 'en' ? 'Output' : '输出')}
                          </span>
                        </div>
                        {/* 输出图片操作按钮 */}
                        {record.status === 'completed' && record.outputImageUrl && (
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-2">
                            <div className="flex gap-1">
                              {onUseAsInput && (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  className="flex-1 h-7 text-xs"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    onUseAsInput(record.localOutputImageUrl || record.outputImageUrl || '', 'output', record.metadata)
                                  }}
                                >
                                  {language === 'en' ? 'Use' : '使用'}
                                </Button>
                              )}
                              {!isMobile && (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  className="h-7 w-7 p-0"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    const link = document.createElement('a')
                                    link.href = record.localOutputImageUrl || record.outputImageUrl || ''
                                    link.download = `output-${record.id}.png`
                                    link.click()
                                  }}
                                >
                                  <Download className="w-3 h-3" />
                                </Button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 状态和积分信息 */}
                    <div className="flex items-center justify-between px-3 py-2 border-t border-white/10">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(record.status)}
                        <span className="text-xs text-white/60">
                          {record.status === 'completed' ? (language === 'en' ? 'Completed' : '已完成') :
                           record.status === 'pending' ? (language === 'en' ? 'Processing' : '处理中') :
                           (language === 'en' ? 'Failed' : '失败')}
                        </span>
                      </div>
                      <span className="text-xs text-white/60">
                        {record.creditsUsed} {language === 'en' ? 'credits' : '积分'}
                      </span>
                    </div>

                    {/* 提示词和操作区域 */}
                    <div className="p-3 pt-0 space-y-2">
                      <div className="flex items-start gap-2">
                        <p className="text-xs text-white/80 line-clamp-2 flex-1">
                          {record.prompt}
                        </p>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 hover:bg-white/10"
                          onClick={() => copyPrompt(record.prompt, record.id)}
                        >
                          {copiedId === record.id ? (
                            <Check className="w-3 h-3 text-green-400" />
                          ) : (
                            <Copy className="w-3 h-3 text-white/60" />
                          )}
                        </Button>
                      </div>
                      <div className="flex items-center justify-between text-xs text-white/50">
                        <span>{formatDate(record.createdAt)}</span>
                        <div className="flex items-center gap-2">
                          {record.model && (
                            <span className="capitalize">{record.model}</span>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0 hover:bg-red-500/20"
                            onClick={() => setDeleteConfirmId(record.id)}
                            disabled={deletingId === record.id}
                          >
                            {deletingId === record.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Trash2 className="w-3 h-3 text-red-400" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* 加载更多触发器 */}
        {data?.pagination?.hasMore && (
          <div ref={loadMoreRef} className="py-4 text-center">
            {isLoading ? (
              <Loader2 className="w-6 h-6 mx-auto text-purple-400 animate-spin" />
            ) : (
              <p className="text-white/40 text-sm">
                {language === 'en' ? 'Loading more...' : '加载更多...'}
              </p>
            )}
          </div>
        )}
      </div>

      {/* 删除确认对话框 */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent className="bg-slate-900 border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">
              {language === 'en' ? 'Delete Record?' : '删除记录？'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">
              {language === 'en'
                ? 'This action cannot be undone. The image will be permanently deleted.'
                : '此操作不可撤销。图片将被永久删除。'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/10 text-white border-white/20">
              {language === 'en' ? 'Cancel' : '取消'}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {language === 'en' ? 'Delete' : '删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 图片查看器 */}
      <AnimatePresence>
        {viewingImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setViewingImage(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="relative max-w-4xl max-h-[90vh] w-full h-full"
              onClick={(e) => e.stopPropagation()}
            >
              <Image
                src={viewingImage.url}
                alt={`Full size ${viewingImage.type} image`}
                fill
                className="object-contain"
                unoptimized
              />
              <div className="absolute top-4 right-4 flex gap-2">
                <div className="bg-black/60 backdrop-blur-sm rounded px-3 py-1">
                  <span className="text-sm text-white">
                    {viewingImage.type === 'input' 
                      ? (language === 'en' ? 'Input Image' : '输入图片')
                      : (language === 'en' ? 'Output Image' : '输出图片')}
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setViewingImage(null)}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  {language === 'en' ? 'Close' : '关闭'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}