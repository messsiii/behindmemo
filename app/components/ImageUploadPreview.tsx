import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { AnimatePresence, motion } from 'framer-motion'
import { ImageIcon, Loader2, Upload, X } from 'lucide-react'
import Image from 'next/image'
import { useCallback, useEffect, useState } from 'react'
import { useDropzone } from 'react-dropzone'

interface ImageUploadPreviewProps {
  onFileSelect: (file: File) => void
  onFileRemove: () => void
  className?: string
  selectedFile?: File | null
}

interface CacheItem {
  url: string
  timestamp: number
  blob?: Blob
  base64?: string  // 添加 base64 存储
}

// 修改缓存管理器
const CacheManager = {
  cache: new Map<string, CacheItem>(),
  maxAge: 5 * 60 * 1000, // 5分钟过期
  maxSize: 50, // 最多缓存50个项目

  // 生成缓存键 - 移除 Date.now() 使其更稳定
  createKey(file: File): string {
    return `${file.name}-${file.size}-${file.lastModified}`
  },

  // 获取缓存
  get(file: File): CacheItem | null {
    const key = this.createKey(file)
    const item = this.cache.get(key)
    
    if (!item) return null
    
    // 检查是否过期
    if (Date.now() - item.timestamp > this.maxAge) {
      this.delete(key)
      return null
    }
    
    return item
  },

  // 设置缓存
  set(file: File, base64: string, blob?: Blob) {
    // 如果缓存太大，删除最旧的项目
    if (this.cache.size >= this.maxSize) {
      const oldestKey = Array.from(this.cache.entries())
        .sort(([, a], [, b]) => a.timestamp - b.timestamp)[0][0]
      this.delete(oldestKey)
    }

    const key = this.createKey(file)
    
    // 如果已经有缓存项，先删除旧的
    if (this.cache.has(key)) {
      this.delete(key)
    }
    
    const url = URL.createObjectURL(blob || file)
    
    this.cache.set(key, {
      url,
      base64,
      blob,
      timestamp: Date.now(),
    })
  },

  // 删除缓存
  delete(key: string) {
    const item = this.cache.get(key)
    if (item) {
      URL.revokeObjectURL(item.url)
      this.cache.delete(key)
    }
  },

  // 清理过期缓存
  cleanup() {
    const now = Date.now()
    Array.from(this.cache.entries()).forEach(([key, item]) => {
      if (now - item.timestamp > this.maxAge) {
        this.delete(key)
      }
    })
  },

  // 获取文件的 base64 数据
  getBase64(file: File): string | null {
    const item = this.get(file)
    return item?.base64 || null
  },

  // 获取文件的 blob 数据
  getBlob(file: File): Blob | null {
    const item = this.get(file)
    return item?.blob || null
  }
}

// 定期清理缓存
let cleanupInterval: NodeJS.Timeout | null = null

// 添加支持的文件类型常量
const SUPPORTED_FILE_TYPES = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/heic': ['.heic']
}

export function ImageUploadPreview({
  onFileSelect,
  onFileRemove,
  className,
  selectedFile,
}: ImageUploadPreviewProps) {
  const [preview, setPreview] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 初始化清理定时器
  useEffect(() => {
    if (!cleanupInterval) {
      cleanupInterval = setInterval(() => CacheManager.cleanup(), 60 * 1000)
    }
    return () => {
      if (cleanupInterval) {
        clearInterval(cleanupInterval)
        cleanupInterval = null
      }
    }
  }, [])

  // 处理 HEIC 转换和预览
  const createPreview = useCallback(async (file: File) => {
    try {
      // 检查缓存
      const cachedItem = CacheManager.get(file)
      if (cachedItem) {
        setPreview(cachedItem.url)
        setIsLoading(false)
        return
      }

      setError(null)
      setIsLoading(true)

      // 检查文件大小
      const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
      if (file.size > MAX_FILE_SIZE) {
        throw new Error('Image size exceeds 10MB limit')
      }

      // 对于非 HEIC 格式，使用 FileReader 直接创建预览
      if (!file.type.includes('heic') && !file.name.toLowerCase().endsWith('.heic')) {
        const reader = new FileReader()
        reader.onload = (e) => {
          const result = e.target?.result as string
          CacheManager.set(file, result)
          const cached = CacheManager.get(file)
          if (cached) {
            setPreview(cached.url)
          }
          setIsLoading(false)
        }
        reader.onerror = () => {
          setError('Failed to read image file')
          setIsLoading(false)
        }
        reader.readAsDataURL(file)
        return
      }

      // 处理 HEIC 格式
      try {
        const heic2any = (await import('heic2any')).default
        const blob = await heic2any({
          blob: file,
          toType: 'image/jpeg',
          quality: 0.8,
        })

        const convertedBlob = Array.isArray(blob) ? blob[0] : blob
        
        // 转换为 base64
        const reader = new FileReader()
        reader.onload = (e) => {
          const result = e.target?.result as string
          CacheManager.set(file, result, convertedBlob)
          const cached = CacheManager.get(file)
          if (cached) {
            setPreview(cached.url)
          }
          setIsLoading(false)
        }
        reader.onerror = () => {
          setError('Failed to convert HEIC image')
          setIsLoading(false)
        }
        reader.readAsDataURL(convertedBlob)
      } catch (e) {
        throw new Error('Unable to convert HEIC image. Please try a JPG or PNG file instead.')
      }
    } catch (e) {
      console.error('Preview creation failed:', e)
      setError(e instanceof Error ? e.message : 'Failed to create image preview')
      setPreview(null)
      setIsLoading(false)
    }
  }, [])

  // 修改文件验证和处理逻辑
  const handleFileSelect = useCallback(
    async (file: File) => {
      try {
        // 检查文件类型
        const isSupported = Object.keys(SUPPORTED_FILE_TYPES).some(type => 
          file.type === type || 
          (file.type === '' && SUPPORTED_FILE_TYPES[type as keyof typeof SUPPORTED_FILE_TYPES].some(ext => 
            file.name.toLowerCase().endsWith(ext)
          ))
        )

        if (!isSupported) {
          throw new Error('不支持的文件格式。请上传 JPG、PNG 或 HEIC 格式的图片。')
        }

        await createPreview(file)
        if (!error) {
          onFileSelect(file)
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : '文件格式错误')
        setPreview(null)
        setIsLoading(false)
      }
    },
    [createPreview, onFileSelect, error]
  )

  // 处理文件删除
  const handleRemove = useCallback(() => {
    try {
      if (selectedFile) {
        // 清除文件缓存
        const key = CacheManager.createKey(selectedFile)
        CacheManager.delete(key)
      }
      
      if (preview) {
        // 清除预览URL
        URL.revokeObjectURL(preview)
      }

      // 重置容器高度
      const container = document.querySelector('.preview-container')
      if (container instanceof HTMLElement) {
        container.style.height = '220px'
      }

      // 重置状态
      setPreview(null)
      setError(null)
      setIsLoading(false)
      
      // 调用父组件的删除回调
      onFileRemove()
    } catch (error) {
      console.error('Error removing file:', error)
      // 即使发生错误也要确保状态被重置
      setPreview(null)
      setError(null)
      setIsLoading(false)
      onFileRemove()
    }
  }, [onFileRemove, selectedFile, preview])

  // 当 selectedFile 改变时更新预览
  useEffect(() => {
    if (selectedFile) {
      const cachedItem = CacheManager.get(selectedFile)
      if (cachedItem) {
        setPreview(cachedItem.url)
        setIsLoading(false)
      } else {
        createPreview(selectedFile)
      }
    } else {
      setPreview(null)
      setError(null)
    }
  }, [selectedFile, createPreview])

  // 移除组件卸载时的缓存清理，改为只在删除按钮点击时清理
  useEffect(() => {
    return () => {
      // 不再清理缓存，让缓存在表单完成前一直保持
    }
  }, [])

  // 修改 useDropzone 配置
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: SUPPORTED_FILE_TYPES,
    maxFiles: 1,
    onDrop: (files: File[]) => files[0] && handleFileSelect(files[0]),
    noKeyboard: true,
    onDropRejected: () => {
      setError('不支持的文件格式。请上传 JPG、PNG 或 HEIC 格式的图片。')
    }
  })

  // 添加键盘事件处理
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        // 如果正在加载或已有预览图片，阻止默认行为
        if (isLoading || preview) {
          e.preventDefault()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [isLoading, preview])

  return (
    <div className={cn('space-y-4', className)}>
      <div
        {...getRootProps()}
        className={cn(
          'relative group cursor-pointer transition-all duration-300',
          'min-h-[220px] rounded-xl border-2 border-dashed',
          'flex flex-col items-center justify-center',
          'p-4',
          isDragActive
            ? 'border-primary/50 bg-primary/5'
            : error
            ? 'border-destructive/50 hover:border-destructive'
            : 'border-muted hover:border-primary/30 hover:bg-muted/5',
          preview ? 'bg-black/5 backdrop-blur-sm' : 'bg-transparent',
          !preview && 'h-[220px]'
        )}
      >
        <input {...getInputProps()} />

        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center justify-center gap-3 p-2 h-full"
            >
              <Loader2 className="w-8 h-8 animate-spin" />
              <p className="text-sm animate-pulse">
                {selectedFile?.name.toLowerCase().endsWith('.heic')
                  ? 'Converting HEIC image...'
                  : 'Processing image...'}
              </p>
            </motion.div>
          ) : error ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center justify-center gap-3 p-2 text-center h-full"
            >
              <p className="text-sm max-w-[80%]">{error}</p>
              <p className="text-xs text-destructive/70">Click or drag to try again</p>
            </motion.div>
          ) : preview ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="relative w-full min-h-[220px] rounded-lg overflow-hidden preview-container"
            >
              <Image
                src={preview}
                alt="Preview"
                fill
                className="object-contain"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                onLoad={(e) => {
                  // 获取图片实际尺寸
                  const img = e.target as HTMLImageElement
                  const container = img.parentElement
                  if (container) {
                    // 计算宽高比
                    const ratio = img.naturalHeight / img.naturalWidth
                    // 设置容器高度
                    container.style.height = `${Math.min(Math.max(220, container.offsetWidth * ratio), 400)}px`
                  }
                }}
                onError={() => {
                  setError('Failed to load image preview')
                  setPreview(null)
                }}
              />
              {/* 删除按钮 */}
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 h-8 w-8 rounded-full hover:bg-destructive/10 hover:text-destructive bg-black/20 text-white hover:text-white z-10"
                onClick={(e) => {
                  e.stopPropagation()
                  handleRemove()
                }}
              >
                <X className="h-4 w-4" />
              </Button>
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                <p className="text-white text-sm bg-black/40 px-5 py-2 rounded-full backdrop-blur-sm">
                  Click to change image
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col items-center justify-center gap-3 p-2 text-center h-full"
            >
              {isDragActive ? (
                <>
                  <Upload className="w-8 h-8 animate-bounce" />
                  <p className="text-sm">Drop your image here</p>
                </>
              ) : (
                <>
                  <ImageIcon className="w-8 h-8" />
                  <p className="text-sm">Drag & drop or click to upload</p>
                  <div className="text-xs text-muted-foreground/70">
                    <p>Supports JPG, PNG and HEIC</p>
                    <p>Maximum file size: 10MB</p>
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
} 