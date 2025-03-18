'use client'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ImageIcon, Loader2, X } from 'lucide-react'
import Image from 'next/image'
import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { useDropzone } from 'react-dropzone'

interface SimpleImageUploadProps {
  onImageSelected: (file: File) => void
  className?: string
}

interface CacheItem {
  url: string
  timestamp: number
  blob?: Blob
  base64?: string
}

// 缓存管理器
const CacheManager = {
  cache: new Map<string, CacheItem>(),
  maxAge: 5 * 60 * 1000, // 5分钟过期
  maxSize: 50, // 最多缓存50个项目

  // 生成缓存键
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
  }
}

// 定期清理缓存
let cleanupInterval: NodeJS.Timeout | null = null

// 支持的文件类型
const SUPPORTED_FILE_TYPES = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/heic': ['.heic']
}

// 创建一个预览图片组件，使用memo优化
const ImagePreview = memo(({ 
  src, 
  onError, 
  onRemove 
}: { 
  src: string, 
  onError: () => void, 
  onRemove: (e: React.MouseEvent) => void 
}) => {
  return (
    <div className="relative w-full h-[150px] rounded-lg overflow-hidden" 
      style={{ transform: 'translate3d(0,0,0)', WebkitBackfaceVisibility: 'hidden' }}>
      <Image 
        src={src} 
        alt="预览图" 
        fill 
        className="object-contain"
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        onError={onError}
        style={{ transform: 'translate3d(0,0,0)', WebkitBackfaceVisibility: 'hidden' }}
      />
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-1 right-1 h-6 w-6 rounded-full hover:bg-destructive/10 hover:text-destructive bg-black/20 text-white hover:text-white z-10"
        onClick={onRemove}
      >
        <X className="h-3 w-3" />
      </Button>
      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
        <p className="text-white text-xs bg-black/40 px-3 py-1 rounded-full backdrop-blur-sm">
          点击更换图片
        </p>
      </div>
    </div>
  )
})

ImagePreview.displayName = 'ImagePreview'

// 使用memo包装的简单图片上传组件
const SimpleImageUploadComponent = ({ onImageSelected, className }: SimpleImageUploadProps) => {
  const [preview, setPreview] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

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
        // 如果是HEIC文件并且有转换后的blob，使用转换后的文件
        if ((file.type.includes('heic') || file.name.toLowerCase().endsWith('.heic')) && cachedItem.blob) {
          const convertedFile = new File([cachedItem.blob], file.name.replace(/\.heic$/i, '.jpg'), { 
            type: 'image/jpeg',
            lastModified: file.lastModified
          })
          // 设置转换后的文件为选中文件
          setSelectedFile(convertedFile)
          // 传递转换后的文件给父组件
          onImageSelected(convertedFile)
        }
        return
      }

      setError(null)
      setIsLoading(true)

      // 检查文件大小
      const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
      if (file.size > MAX_FILE_SIZE) {
        throw new Error('图片大小超过10MB限制')
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
          // 对于非HEIC文件，直接使用原始文件
          setSelectedFile(file)
          onImageSelected(file)
        }
        reader.onerror = () => {
          setError('读取图片文件失败')
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
        
        // 创建一个新的File对象来替代原始的HEIC文件
        const convertedFile = new File(
          [convertedBlob], 
          file.name.replace(/\.heic$/i, '.jpg'), 
          { type: 'image/jpeg', lastModified: file.lastModified }
        )
        
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
          // 保存并传递转换后的文件
          setSelectedFile(convertedFile)
          onImageSelected(convertedFile)
        }
        reader.onerror = () => {
          setError('转换HEIC图片失败')
          setIsLoading(false)
        }
        reader.readAsDataURL(convertedBlob)
      } catch (e) {
        throw new Error('无法转换HEIC图片，请尝试JPG或PNG格式。')
      }
    } catch (e) {
      console.error('Preview creation failed:', e)
      setError(e instanceof Error ? e.message : '创建图片预览失败')
      setPreview(null)
      setIsLoading(false)
    }
  }, [onImageSelected])

  // 文件验证和处理
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
          throw new Error('不支持的文件格式。请上传JPG、PNG或HEIC格式的图片。')
        }

        await createPreview(file)
        // 注意：现在我们不在这里设置selectedFile和调用onImageSelected
        // 这些操作已移至createPreview中，确保转换后的文件被使用
      } catch (e) {
        setError(e instanceof Error ? e.message : '文件格式错误')
        setPreview(null)
        setIsLoading(false)
      }
    },
    [createPreview]
  )

  // 处理文件删除
  const handleRemove = useCallback((e: React.MouseEvent) => {
    e.stopPropagation() // 防止冒泡
    if (selectedFile) {
      // 清除文件缓存
      const key = CacheManager.createKey(selectedFile)
      CacheManager.delete(key)
    }
    
    if (preview) {
      // 清除预览URL
      URL.revokeObjectURL(preview)
    }

    // 重置状态
    setPreview(null)
    setError(null)
    setIsLoading(false)
    setSelectedFile(null)
  }, [selectedFile, preview])

  // 图片加载错误处理
  const handleImageError = useCallback(() => {
    setError('加载图片预览失败')
    setPreview(null)
  }, [])

  // 配置 dropzone
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: SUPPORTED_FILE_TYPES,
    maxFiles: 1,
    onDrop: (files: File[]) => files[0] && handleFileSelect(files[0]),
    noKeyboard: true,
    onDropRejected: () => {
      setError('不支持的文件格式。请上传JPG、PNG或HEIC格式的图片。')
    }
  })

  // 使用useMemo减少不必要的组件渲染
  const containerClasses = useMemo(() => cn(
    'relative group cursor-pointer transition-all duration-300',
    'min-h-[150px] rounded-lg border-2 border-dashed',
    'flex flex-col items-center justify-center',
    'p-2',
    isDragActive
      ? 'border-primary/50 bg-primary/5'
      : error
      ? 'border-destructive/50 hover:border-destructive'
      : 'border-muted hover:border-primary/30 hover:bg-muted/5',
    preview ? 'bg-black/5 backdrop-blur-sm' : 'bg-transparent',
    className
  ), [className, isDragActive, error, preview])

  return (
    <div 
      {...getRootProps()} 
      className={`${containerClasses} simple-image-upload`}
      style={{ transform: 'translate3d(0,0,0)', WebkitBackfaceVisibility: 'hidden' }}
    >
      <input {...getInputProps()} />

      {isLoading ? (
        <div className="flex flex-col items-center justify-center gap-2 p-2 h-full">
          <Loader2 className="w-6 h-6 animate-spin" />
          <p className="text-xs animate-pulse">
            {selectedFile?.name.toLowerCase().endsWith('.heic')
              ? '正在转换HEIC图片...'
              : '正在处理图片...'}
          </p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center gap-2 p-2 text-center h-full">
          <p className="text-xs max-w-[80%] text-destructive">{error}</p>
          <p className="text-xs text-muted-foreground">点击或拖拽重新上传</p>
        </div>
      ) : preview ? (
        <ImagePreview 
          src={preview} 
          onError={handleImageError} 
          onRemove={handleRemove} 
        />
      ) : (
        <div className="flex flex-col items-center justify-center gap-2 p-2 text-center h-full">
          {isDragActive ? (
            <>
              <p className="text-xs">放开以上传图片</p>
            </>
          ) : (
            <>
              <ImageIcon className="w-5 h-5" />
              <p className="text-xs text-muted-foreground">点击或拖拽上传</p>
              <div className="text-[10px] text-muted-foreground/70">
                <p>支持JPG、PNG和HEIC格式</p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// 使用React.memo包装整个组件以避免不必要的重新渲染
export const SimpleImageUpload = memo(SimpleImageUploadComponent) 