'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from '@/components/ui/use-toast'
import { useLanguage } from '@/contexts/LanguageContext'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { ArrowLeft, Download, History, Image as ImageIcon, Loader2, RefreshCw, Trash2 } from 'lucide-react'
import { useSession } from 'next-auth/react'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'

// 图片生成记录接口
interface ImageGenerationRecord {
  id: string
  prompt: string
  inputImageUrl: string
  outputImageUrl: string | null
  localOutputImageUrl?: string | null // 本地存储的图片URL
  status: 'pending' | 'completed' | 'failed'
  creditsUsed: number
  errorMessage?: string | null
  createdAt: string
  updatedAt: string
}

export default function ImageGenerationResults() {
  const { language } = useLanguage()
  const { data: session } = useSession()
  const [records, setRecords] = useState<ImageGenerationRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // 获取生成历史
  const fetchGenerationHistory = async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) setIsRefreshing(true)
    try {
      const response = await fetch('/api/user/generation-history')
      if (!response.ok) {
        throw new Error('Failed to fetch generation history')
      }
      const data = await response.json()
      setRecords(data.records || [])
    } catch (error) {
      console.error('Error fetching generation history:', error)
      toast({
        title: language === 'en' ? 'Error' : '错误',
        description: language === 'en' ? 'Failed to load generation history' : '加载生成历史失败',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
      if (showRefreshIndicator) setIsRefreshing(false)
    }
  }

  useEffect(() => {
    if (session) {
      fetchGenerationHistory()
    }
  }, [session])

  // 下载图片
  const downloadImage = (imageUrl: string, prompt: string, id: string) => {
    const link = document.createElement('a')
    link.href = imageUrl
    link.download = `flux-generated-${prompt.slice(0, 20).replace(/[^a-zA-Z0-9]/g, '_')}-${id}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // 删除生成记录
  const deleteRecord = async (id: string) => {
    setDeletingId(id)
    try {
      const response = await fetch(`/api/user/generation-history/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete record')
      }

      setRecords(records.filter(record => record.id !== id))
      toast({
        title: language === 'en' ? 'Deleted' : '已删除',
        description: language === 'en' ? 'Generation record deleted successfully' : '生成记录已成功删除',
      })
    } catch (error) {
      console.error('Error deleting record:', error)
      toast({
        title: language === 'en' ? 'Error' : '错误',
        description: language === 'en' ? 'Failed to delete record' : '删除记录失败',
        variant: 'destructive',
      })
    } finally {
      setDeletingId(null)
    }
  }

  // 格式化日期
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat(language === 'en' ? 'en-US' : 'zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  }

  // 获取状态颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-400'
      case 'failed':
        return 'text-red-400'
      case 'pending':
        return 'text-yellow-400'
      default:
        return 'text-gray-400'
    }
  }

  // 获取状态文本
  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return language === 'en' ? 'Completed' : '已完成'
      case 'failed':
        return language === 'en' ? 'Failed' : '失败'
      case 'pending':
        return language === 'en' ? 'Pending' : '处理中'
      default:
        return status
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col items-center justify-center h-64 space-y-4">
            <Loader2 className="w-12 h-12 text-purple-400 animate-spin" />
            <p className="text-white/80 text-center">
              {language === 'en' ? 'Loading generation history...' : '加载生成历史中...'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* 头部 */}
        <div className="mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center gap-4 mb-6">
              <Link href="/gen" className="inline-flex items-center gap-2 text-white/70 hover:text-white transition-colors">
                <ArrowLeft className="w-4 h-4" />
                {language === 'en' ? 'Back to Generation' : '返回生成页面'}
              </Link>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
                  <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
                    {language === 'en' ? 'Generation History' : '生成历史'}
                  </span>
                </h1>
                <p className="text-xl text-white/80">
                  {language === 'en' 
                    ? 'View and manage your AI image generation results'
                    : '查看和管理您的AI图片生成结果'
                  }
                </p>
              </div>
              
              <Button
                onClick={() => fetchGenerationHistory(true)}
                disabled={isRefreshing}
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10 bg-transparent"
              >
                {isRefreshing ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                {language === 'en' ? 'Refresh' : '刷新'}
              </Button>
            </div>
          </motion.div>
        </div>

        {/* 内容区域 */}
        {records.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Card className="bg-black/20 backdrop-blur-lg border-white/10 text-white">
              <CardContent className="p-12 text-center">
                <History className="w-16 h-16 text-white/40 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">
                  {language === 'en' ? 'No generations yet' : '暂无生成记录'}
                </h3>
                <p className="text-white/60 mb-6">
                  {language === 'en' 
                    ? 'Start creating amazing AI images to see them here'
                    : '开始创建精彩的AI图片，记录将显示在这里'
                  }
                </p>
                <Link href="/gen">
                  <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                    <ImageIcon className="w-4 h-4 mr-2" />
                    {language === 'en' ? 'Start Generating' : '开始生成'}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {records.map((record, index) => (
              <motion.div
                key={record.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card className="bg-black/20 backdrop-blur-lg border-white/10 text-white h-full">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg truncate" title={record.prompt}>
                          {record.prompt}
                        </CardTitle>
                        <CardDescription className="text-white/60 text-sm">
                          {formatDate(record.createdAt)}
                        </CardDescription>
                      </div>
                      <div className={cn("text-xs font-medium px-2 py-1 rounded-full", getStatusColor(record.status))}>
                        {getStatusText(record.status)}
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* 输入图片 */}
                    <div>
                      <h4 className="text-sm font-medium text-white/80 mb-2">
                        {language === 'en' ? 'Input Image' : '输入图片'}
                      </h4>
                      <div className="relative w-full h-32 rounded-lg overflow-hidden bg-white/5">
                        <Image
                          src={record.inputImageUrl}
                          alt="Input"
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                    </div>

                    {/* 输出图片 */}
                    {record.status === 'completed' && (record.localOutputImageUrl || record.outputImageUrl) ? (
                      <div>
                        <h4 className="text-sm font-medium text-white/80 mb-2">
                          {language === 'en' ? 'Generated Image' : '生成图片'}
                        </h4>
                        <div className="relative w-full h-32 rounded-lg overflow-hidden bg-white/5">
                          <Image
                            src={record.localOutputImageUrl || record.outputImageUrl!}
                            alt="Generated"
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        </div>
                      </div>
                    ) : record.status === 'failed' ? (
                      <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                        <p className="text-sm text-red-400">
                          {record.errorMessage || (language === 'en' ? 'Generation failed' : '生成失败')}
                        </p>
                      </div>
                    ) : record.status === 'pending' ? (
                      <div className="flex items-center justify-center h-32 bg-white/5 rounded-lg">
                        <div className="text-center">
                          <Loader2 className="w-8 h-8 text-yellow-400 animate-spin mx-auto mb-2" />
                          <p className="text-sm text-yellow-400">
                            {language === 'en' ? 'Processing...' : '处理中...'}
                          </p>
                        </div>
                      </div>
                    ) : null}

                    {/* 操作按钮 */}
                    <div className="flex gap-2">
                      {record.status === 'completed' && (record.localOutputImageUrl || record.outputImageUrl) && (
                        <Button
                          onClick={() => downloadImage(
                            record.localOutputImageUrl || record.outputImageUrl!,
                            record.prompt,
                            record.id
                          )}
                          size="sm"
                          className="flex-1 bg-green-600 hover:bg-green-700"
                        >
                          <Download className="w-4 h-4 mr-1" />
                          {language === 'en' ? 'Download' : '下载'}
                        </Button>
                      )}
                      
                      <Button
                        onClick={() => deleteRecord(record.id)}
                        disabled={deletingId === record.id}
                        size="sm"
                        variant="outline"
                        className="border-red-500/50 text-red-400 hover:bg-red-500/20"
                      >
                        {deletingId === record.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </Button>
                    </div>

                    {/* 积分信息 */}
                    <div className="text-xs text-white/60 pt-2 border-t border-white/10">
                      {language === 'en' ? 'Credits used:' : '消耗积分:'} {record.creditsUsed}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
} 