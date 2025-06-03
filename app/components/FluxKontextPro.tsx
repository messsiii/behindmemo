'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/use-toast'
import { useLanguage } from '@/contexts/LanguageContext'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { Download, Home, Image as ImageIcon, Loader2, Sparkles, Upload, Wand2 } from 'lucide-react'
import { useSession } from 'next-auth/react'
import Image from 'next/image'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import useSWR from 'swr'

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

export default function FluxKontextPro() {
  const { language } = useLanguage()
  const { data: session } = useSession()
  const [inputImage, setInputImage] = useState<string | null>(null)
  const [prompt, setPrompt] = useState('')
  const [outputImage, setOutputImage] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [dragActive, setDragActive] = useState(false)

  // 获取用户积分信息
  const {
    data: creditsInfo,
    mutate: mutateCredits
  } = useSWR<CreditsInfo>(
    session?.user?.id ? '/api/user/credits' : null,
    fetcher,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      refreshInterval: 30000,
    }
  )

  // 页面加载时恢复保存的状态
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedPrompt = localStorage.getItem('flux_prompt')
      const savedInputImage = localStorage.getItem('flux_input_image')
      const savedOutputImage = localStorage.getItem('flux_output_image')
      
      if (savedPrompt) setPrompt(savedPrompt)
      if (savedInputImage) setInputImage(savedInputImage)
      if (savedOutputImage) setOutputImage(savedOutputImage)
    }
  }, [])

  // 保存状态到localStorage
  const saveState = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('flux_prompt', prompt)
      if (inputImage) localStorage.setItem('flux_input_image', inputImage)
      if (outputImage) localStorage.setItem('flux_output_image', outputImage)
    }
  }, [prompt, inputImage, outputImage])

  // 实时保存状态
  useEffect(() => {
    saveState()
  }, [saveState])

  // 文件上传处理
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB限制
        toast({
          title: language === 'en' ? 'File too large' : '文件过大',
          description: language === 'en' ? 'Please select an image smaller than 10MB' : '请选择小于10MB的图片',
          variant: 'destructive',
        })
        return
      }

      const reader = new FileReader()
      reader.onload = (e) => {
        setInputImage(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }, [language])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp']
    },
    multiple: false,
    onDragEnter: () => setDragActive(true),
    onDragLeave: () => setDragActive(false)
  })

  // 生成图片
  const generateImage = async () => {
    if (!inputImage || !prompt.trim()) {
      toast({
        title: language === 'en' ? 'Missing inputs' : '缺少输入',
        description: language === 'en' ? 'Please upload an image and enter a prompt' : '请上传图片并输入提示词',
        variant: 'destructive',
      })
      return
    }

    if ((creditsInfo?.credits || 0) < 10) {
      toast({
        title: language === 'en' ? 'Insufficient credits' : '积分不足',
        description: language === 'en' ? 'You need 10 credits to generate an image' : '您需要10个积分来生成图片',
        variant: 'destructive',
      })
      return
    }

    setIsGenerating(true)
    setOutputImage(null)

    try {
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          input_image: inputImage,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Generation failed')
      }

      setOutputImage(data.output)
      // 刷新积分信息
      mutateCredits()
      
      toast({
        title: language === 'en' ? 'Generation successful!' : '生成成功！',
        description: language === 'en' ? 'Your image has been generated' : '您的图片已生成',
      })

    } catch (error) {
      console.error('Generation error:', error)
      
      // 生成失败时自动刷新页面并保存状态
      saveState()
      
      toast({
        title: language === 'en' ? 'Generation failed' : '生成失败',
        description: language === 'en' ? 'Credits have been refunded. The page will refresh.' : '积分已退还，页面将自动刷新。',
        variant: 'destructive',
      })

      // 延迟刷新页面，让用户看到错误消息
      setTimeout(() => {
        window.location.reload()
      }, 2000)
    } finally {
      setIsGenerating(false)
    }
  }

  // 下载图片
  const downloadImage = () => {
    if (outputImage) {
      const link = document.createElement('a')
      link.href = outputImage
      link.download = `flux-generated-${Date.now()}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  // 清空所有内容
  const clearAll = () => {
    setInputImage(null)
    setPrompt('')
    setOutputImage(null)
    if (typeof window !== 'undefined') {
      localStorage.removeItem('flux_prompt')
      localStorage.removeItem('flux_input_image')
      localStorage.removeItem('flux_output_image')
    }
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* 头部 */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Link href="/" className="inline-flex items-center gap-2 text-white/70 hover:text-white mb-4 transition-colors">
              <Home className="w-4 h-4" />
              {language === 'en' ? 'Back to Home' : '返回首页'}
            </Link>
            
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
                AI Image Generation
              </span>
            </h1>
            <p className="text-xl text-white/80 max-w-2xl mx-auto">
              {language === 'en' 
                ? 'Transform your images with AI-powered generation using Flux Kontext Pro'
                : '使用 Flux Kontext Pro 的 AI 技术转换您的图片'
              }
            </p>
          </motion.div>
        </div>

        {/* 积分显示 */}
        {creditsInfo && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="flex justify-center mb-6"
          >
            <div className="bg-black/20 backdrop-blur-lg rounded-full px-6 py-3 border border-white/10">
              <div className="flex items-center gap-3 text-white">
                <Sparkles className="w-5 h-5 text-yellow-400" />
                <span className="font-medium">
                  <span className={creditsInfo.isVIP ? "text-yellow-400" : "text-white"}>
                    {creditsInfo.isVIP && <span className="text-yellow-400">VIP </span>}
                    {creditsInfo.credits} {language === 'en' ? 'Credits' : '积分'}
                  </span>
                </span>
                <span className="text-white/60">•</span>
                <span className="text-sm text-white/60">
                  {language === 'en' ? '10 credits per generation' : '每次生成消耗10积分'}
                </span>
                <span className="text-white/60">•</span>
                <Link href="/gen/results" className="text-sm text-purple-400 hover:text-purple-300 transition-colors">
                  {language === 'en' ? 'View History' : '查看历史'}
                </Link>
              </div>
            </div>
          </motion.div>
        )}

        {/* 主要内容区域 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 输入图片 */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="bg-black/20 backdrop-blur-lg border-white/10 text-white h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-purple-400" />
                  {language === 'en' ? 'Input Image' : '输入图片'}
                </CardTitle>
                <CardDescription className="text-white/60">
                  {language === 'en' ? 'Upload an image to transform' : '上传要转换的图片'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  {...getRootProps()}
                  className={cn(
                    "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all",
                    isDragActive || dragActive
                      ? "border-purple-400 bg-purple-400/10"
                      : "border-white/20 hover:border-white/40 hover:bg-white/5",
                    inputImage && "border-green-400"
                  )}
                >
                  <input {...getInputProps()} />
                  {inputImage ? (
                    <div className="space-y-4">
                      <div className="relative w-full h-48 rounded-lg overflow-hidden">
                        <Image
                          src={inputImage}
                          alt="Input"
                          fill
                          className="object-contain"
                        />
                      </div>
                      <p className="text-sm text-green-400">
                        {language === 'en' ? 'Image uploaded successfully' : '图片上传成功'}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <Upload className="w-12 h-12 text-white/40 mx-auto" />
                      <div>
                        <p className="text-white/80">
                          {language === 'en' ? 'Drop an image here or click to upload' : '将图片拖放到此处或点击上传'}
                        </p>
                        <p className="text-sm text-white/60 mt-2">
                          {language === 'en' ? 'Supports PNG, JPG, JPEG, WebP (max 10MB)' : '支持 PNG、JPG、JPEG、WebP（最大10MB）'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* 提示词输入 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Card className="bg-black/20 backdrop-blur-lg border-white/10 text-white h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wand2 className="w-5 h-5 text-pink-400" />
                  {language === 'en' ? 'Prompt' : '提示词'}
                </CardTitle>
                <CardDescription className="text-white/60">
                  {language === 'en' ? 'Describe how you want to transform the image' : '描述您希望如何转换图片'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="prompt" className="text-white/80">
                    {language === 'en' ? 'Transformation prompt' : '转换提示词'}
                  </Label>
                  <Textarea
                    id="prompt"
                    placeholder={language === 'en' 
                      ? "Make this a 90s cartoon, cyberpunk style, oil painting..." 
                      : "制作成90年代卡通风格、赛博朋克风格、油画风格..."
                    }
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="mt-2 bg-white/5 border-white/20 text-white placeholder:text-white/40 focus:border-purple-400 focus:ring-purple-400/20 resize-none"
                    rows={6}
                  />
                </div>

                {/* 生成按钮 */}
                <Button
                  onClick={generateImage}
                  disabled={!inputImage || !prompt.trim() || isGenerating || (creditsInfo?.credits || 0) < 10}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {language === 'en' ? 'Generating...' : '生成中...'}
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      {language === 'en' ? 'Generate Image' : '生成图片'}
                    </>
                  )}
                </Button>

                {/* 清空按钮 */}
                <Button
                  onClick={clearAll}
                  variant="outline"
                  className="w-full border-white/20 text-white hover:bg-white/10 bg-transparent"
                >
                  {language === 'en' ? 'Clear All' : '清空所有'}
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* 输出预览 */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Card className="bg-black/20 backdrop-blur-lg border-white/10 text-white h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-blue-400" />
                  {language === 'en' ? 'Generated Output' : '生成结果'}
                </CardTitle>
                <CardDescription className="text-white/60">
                  {language === 'en' ? 'Your AI-transformed image will appear here' : 'AI转换后的图片将显示在这里'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isGenerating ? (
                  <div className="flex flex-col items-center justify-center h-64 space-y-4">
                    <Loader2 className="w-12 h-12 text-purple-400 animate-spin" />
                    <p className="text-white/80 text-center">
                      {language === 'en' ? 'AI is processing your image...' : 'AI正在处理您的图片...'}
                    </p>
                    <p className="text-sm text-white/60 text-center">
                      {language === 'en' ? 'This may take 30-60 seconds' : '这可能需要30-60秒'}
                    </p>
                  </div>
                ) : outputImage ? (
                  <div className="space-y-4">
                    <div className="relative w-full h-64 rounded-lg overflow-hidden">
                      <Image
                        src={outputImage}
                        alt="Generated"
                        fill
                        className="object-contain"
                        unoptimized
                      />
                    </div>
                    <Button
                      onClick={downloadImage}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      {language === 'en' ? 'Download Image' : '下载图片'}
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-64 space-y-4">
                    <div className="w-16 h-16 border-2 border-dashed border-white/20 rounded-lg flex items-center justify-center">
                      <ImageIcon className="w-8 h-8 text-white/40" />
                    </div>
                    <p className="text-white/60 text-center">
                      {language === 'en' ? 'Generated image will appear here' : '生成的图片将显示在这里'}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  )
} 