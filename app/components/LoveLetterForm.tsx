'use client'

import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import exifr from 'exifr'
import { useToast } from '@/components/ui/use-toast'
import { useSession } from 'next-auth/react'
import { useLanguage } from '@/contexts/LanguageContext'
import { QuotaAlert } from '@/components/QuotaAlert'

const content = {
  en: {
    title: 'Write a Love Letter',
    name: 'Your Name',
    loverName: 'Their Name',
    story: 'Your Story',
    generate: 'Generate',
    placeholder: 'Share your story here...',
    unauthorized: 'Please login to generate letters',
    error: 'Failed to generate letter',
    quotaError: 'Insufficient quota',
    quotaCheck: 'Checking quota...',
  },
  zh: {
    title: '写一封情书',
    name: '你的名字',
    loverName: '对方名字',
    story: '你们的故事',
    generate: '生成',
    placeholder: '在这里分享你们的故事...',
    unauthorized: '请登录后生成',
    error: '生成失败',
    quotaError: '配额不足',
    quotaCheck: '正在检查配额...',
  },
} as const

// 定义表单字段类型
type FormField = 'name' | 'loverName' | 'story' | 'photo'

interface FormData {
  name: string
  loverName: string
  story: string
  photo: File
}

/* 保留以下接口用于未来功能扩展 */
// @ts-expect-error - 将来会使用
interface _ExifData {
  latitude?: number
  longitude?: number
  GPSLatitude?: number
  GPSLongitude?: number
  // ... 其他可能的 EXIF 数据字段
}

// @ts-expect-error - 将来会使用
interface _LocationInfo {
  formatted_address: string
  components: {
    country?: string
    state?: string
    city?: string
    district?: string
  }
}

const questions = [
  {
    id: 1,
    question: "What's your name?",
    field: 'name' as FormField, // 添加类型断言
    type: 'text',
    placeholder: 'Enter your name...',
  },
  {
    id: 2,
    question: 'Share a photo of your special moment',
    field: 'photo' as FormField,
    type: 'file',
  },
  {
    id: 3,
    question: "What's your lover's name?",
    field: 'loverName' as FormField,
    type: 'text',
    placeholder: "Enter your lover's name...",
  },
  {
    id: 4,
    question: 'Tell us your love story',
    field: 'story' as FormField,
    type: 'textarea',
    placeholder:
      'Share your beautiful moments together, how you met, or what makes your love special...',
  },
]

export default function LoveLetterForm() {
  const { data: session } = useSession()
  const { language } = useLanguage()
  const { toast } = useToast()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [showQuotaAlert, setShowQuotaAlert] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState<Partial<FormData>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isShaking, setIsShaking] = useState(false)
  const debounceRef = useRef(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const currentQuestion = useMemo(() => questions[currentStep], [currentStep])

  const handleInputChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value, type } = e.target
      if (type === 'file') {
        const fileInput = e.target as HTMLInputElement
        const file = fileInput.files?.[0]
        if (file) {
          setFormData(prev => ({
            ...prev,
            [name]: file,
          }))
        }
      } else {
        setFormData(prev => ({
          ...prev,
          [name]: value,
        }))
      }
    },
    []
  )

  const triggerShake = useCallback(() => {
    setIsShaking(true)
    setTimeout(() => setIsShaking(false), 500)
  }, [])

  const handleNext = useCallback(() => {
    if (debounceRef.current) return
    if (currentStep < questions.length - 1) {
      const currentField = questions[currentStep].field
      const currentValue = formData[currentField]

      // 检查当前字段是否有值
      if (
        currentValue &&
        // 对于文件类型，检查是否是 File 对象
        ((currentField === 'photo' && currentValue instanceof File) ||
          // 对于其他类型，检查是否有非空字符串
          (currentField !== 'photo' &&
            typeof currentValue === 'string' &&
            currentValue.trim() !== ''))
      ) {
        debounceRef.current = true
        setTimeout(() => {
          debounceRef.current = false
        }, 300)
        setCurrentStep(prev => prev + 1)
      } else {
        triggerShake()
      }
    }
  }, [currentStep, formData, triggerShake])

  const handlePrevious = useCallback(() => {
    if (debounceRef.current) return
    if (currentStep > 0) {
      debounceRef.current = true
      setTimeout(() => {
        debounceRef.current = false
      }, 300)
      setCurrentStep(prev => prev - 1)
    }
  }, [currentStep])

  const handleExifData = async (file: File): Promise<Record<string, unknown>> => {
    return new Promise(async resolve => {
      const img = new Image()

      let exifData = {}
      try {
        // 使用完整的选项来解析
        const parsed = await exifr.parse(file, {
          tiff: true,
          xmp: true,
          gps: true, // 确保启用 GPS 解析
        })

        if (parsed) {
          // 解析 GPS 坐标
          const latitude = parsed.latitude || parsed.GPSLatitude
          const longitude = parsed.longitude || parsed.GPSLongitude

          if (latitude && longitude) {
            try {
              const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY}&language=en`

              // 打印请求 URL（移除 API key）
              console.log(
                'Geocoding Request:',
                geocodeUrl.replace(process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY!, 'API_KEY')
              )

              const response = await fetch(geocodeUrl)

              // 打印响应状态
              console.log('Geocoding Response Status:', {
                ok: response.ok,
                status: response.status,
                statusText: response.statusText,
              })

              const data = await response.json()

              // 打印完整的响应数据
              console.log('Google Maps Full Response:', {
                status: data.status,
                results: data.results,
                error_message: data.error_message,
              })

              if (data.status === 'OK' && data.results?.[0]) {
                const result = data.results[0]
                const locationInfo = {
                  formatted_address: result.formatted_address,
                  components: result.address_components.reduce(
                    (
                      acc: Record<string, string>,
                      component: {
                        types: string[]
                        long_name: string
                      }
                    ) => {
                      if (component.types.includes('country')) acc.country = component.long_name
                      if (component.types.includes('administrative_area_level_1'))
                        acc.state = component.long_name
                      if (component.types.includes('locality')) acc.city = component.long_name
                      if (component.types.includes('sublocality'))
                        acc.district = component.long_name
                      return acc
                    },
                    {}
                  ),
                }

                console.log('Parsed Location Info:', locationInfo)

                exifData = {
                  ...parsed,
                  location: {
                    coordinates: { latitude, longitude },
                    address: locationInfo,
                  },
                }
              } else {
                console.warn('Geocoding failed:', {
                  status: data.status,
                  error_message: data.error_message,
                })
              }
            } catch (error: unknown) {
              console.error('Geocoding error:', {
                message: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : 'No stack trace',
              })
            }
          }
        }
      } catch (error: unknown) {
        console.warn(
          'EXIF/GPS data extraction error:',
          error instanceof Error ? error.message : String(error)
        )
      }

      img.onload = () => {
        const metadata = {
          width: img.width,
          height: img.height,
          aspectRatio: img.width / img.height,
          size: file.size,
          type: file.type,
          name: file.name,
          lastModified: file.lastModified,
          orientation:
            img.width > img.height ? 'landscape' : img.width < img.height ? 'portrait' : 'square',
          uploadTime: new Date().toISOString(),
          humanSize: `${(file.size / (1024 * 1024)).toFixed(2)}MB`,
          // 添加 EXIF 数据
          exif: exifData,
        }
        resolve(metadata)
      }
      img.src = URL.createObjectURL(file)
    })
  }

  const uploadPhotoAndPrepareData = useCallback(async (file: File) => {
    // console.log('Starting to process file:', {
    //   name: file.name,
    //   type: file.type,
    //   size: file.size
    // })

    let originalGpsData = null
    try {
      // console.log('Trying to read GPS from original file:', file.name)
      const gpsData = await exifr.gps(file)
      // console.log('GPS Data from exifr:', gpsData)

      if (gpsData) {
        const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${gpsData.latitude},${gpsData.longitude}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY}&language=en`

        // console.log('Calling Google Maps API...', {
        //   latitude: gpsData.latitude,
        //   longitude: gpsData.longitude
        // })

        const response = await fetch(geocodeUrl)
        // console.log('Google Maps API Response:', {
        //   status: response.status,
        //   ok: response.ok
        // })

        const locationData = await response.json()
        // console.log('Location Data:', locationData)

        if (locationData.status === 'OK') {
          const locationDescription = locationData.plus_code?.compound_code
            ? locationData.plus_code.compound_code.replace(/^[^ ]+ /, '')
            : locationData.results[0].formatted_address

          originalGpsData = {
            coordinates: {
              latitude: gpsData.latitude,
              longitude: gpsData.longitude,
            },
            address: locationDescription,
            raw_address: locationData.results[0].formatted_address,
          }
          // console.log('Successfully got location:', {
          //   ...originalGpsData,
          //   compound_code: locationData.plus_code?.compound_code
          // })
        }
      }
    } catch (error: unknown) {
      console.warn(
        'Failed to process GPS data:',
        error instanceof Error ? error.message : String(error)
      ) // 保留错误日志
    }

    // 处理 HEIC 转换
    let processedFile = file
    if (file.type === 'image/heic' || file.name.toLowerCase().endsWith('.heic')) {
      try {
        const heic2any = (await import('heic2any')).default
        const blob = await heic2any({
          blob: file,
          toType: 'image/jpeg',
          quality: 0.9,
        })

        // 修复类型错误：处理 blob 可能是数组的情况
        const convertedBlob = Array.isArray(blob) ? blob[0] : blob
        processedFile = new File([convertedBlob], file.name.replace(/\.heic$/i, '.jpg'), {
          type: 'image/jpeg',
        })
      } catch (error: unknown) {
        console.error(
          'Error converting HEIC:',
          error instanceof Error ? error.message : String(error)
        )
        throw new Error('Failed to convert HEIC image')
      }
    }

    // 获取其他元数据，并合并 GPS 数据
    const imageMetadata = await handleExifData(processedFile)
    if (originalGpsData) {
      imageMetadata.gps = {
        ...originalGpsData.coordinates,
        address: originalGpsData.address, // 添加地址信息
        raw_address: originalGpsData.raw_address,
      }
    }

    const formData = new FormData()
    formData.append('file', processedFile)

    try {
      const blobResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!blobResponse.ok) {
        throw new Error(`Upload failed: ${blobResponse.statusText}`)
      }

      const data = await blobResponse.json()
      return {
        blobUrl: data.url,
        metadata: {
          ...data.metadata,
          ...imageMetadata,
          // 确保地理位置信息被包含
          location: originalGpsData?.address, // 直接添加地理位置描述
          context: {
            uploadDevice: navigator.userAgent,
            screenSize: `${window.innerWidth}x${window.innerHeight}`,
            colorDepth: window.screen.colorDepth,
            location: originalGpsData?.address, // 在上下文中也包含位置信息
          },
        },
      }
    } catch (error: unknown) {
      console.error('Upload error:', error instanceof Error ? error.message : String(error))
      throw error
    }
  }, [])

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      console.log('Submit handler started')

      // 在最开始添加内容校验
      if (!formData.story?.trim()) {
        triggerShake()
        return
      }

      if (!session?.user?.id) {
        console.log('No user session found')
        toast({
          title: content[language].unauthorized,
          variant: 'destructive',
        })
        return
      }

      setIsLoading(true)
      setIsSubmitting(true)

      try {
        // 1. 检查配额
        const quotaResponse = await fetch('/api/user/quota')
        console.log('Quota response:', quotaResponse.status)

        if (!quotaResponse.ok) {
          console.error('Failed to check quota:', quotaResponse.statusText)
          throw new Error('Failed to check quota')
        }

        const quotaData = await quotaResponse.json()
        console.log('Quota data:', quotaData)

        // 如果配额不足，显示提示并终止
        if (!quotaData.isVIP && quotaData.quota <= 0) {
          console.log('Insufficient quota, showing alert')
          setShowQuotaAlert(true)
          setIsLoading(false)
          setIsSubmitting(false)
          return
        }

        console.log('Starting generation process...')
        // 2. 处理图片上传
        if (!(formData.photo instanceof File)) {
          throw new Error('Photo is required')
        }

        const uploadResult = await uploadPhotoAndPrepareData(formData.photo)
        console.log('Photo upload result:', uploadResult)

        // 3. 生成请求 ID
        const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

        // 4. 创建信件记录
        const response = await fetch('/api/generate-letter', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Request-Id': requestId,
          },
          body: JSON.stringify({
            name: formData.name || '',
            loverName: formData.loverName || '',
            story: formData.story || '',
            blobUrl: uploadResult.blobUrl,
            metadata: uploadResult.metadata || {},
          }),
          credentials: 'include',
        })

        if (!response.ok) {
          const errorData = await response.json()
          console.error('Generation failed:', errorData)
          toast({
            title: content[language].error,
            description: errorData.error || `Generation failed with status ${response.status}`,
            variant: 'destructive',
          })
          throw new Error(errorData.error || `Generation failed with status ${response.status}`)
        }

        const { letterId } = await response.json()
        if (!letterId) {
          throw new Error('No letter ID returned')
        }

        // 5. 跳转到结果页
        const letterData = {
          ...formData,
          blobUrl: uploadResult.blobUrl,
          metadata: uploadResult.metadata,
          timestamp: Date.now(),
          isGenerating: true,
          isComplete: false,
          fromHistory: false,
          letter: '',
          id: letterId,
        }

        // 保存状态到 localStorage
        localStorage.setItem('loveLetterData', JSON.stringify(letterData))

        // 在路由跳转前停止音频
        if (audioRef.current) {
          audioRef.current.pause()
          audioRef.current.currentTime = 0
        }

        router.push(`/result/${letterId}`)
      } catch (error) {
        setIsLoading(false)
        setIsSubmitting(false)
        console.error('Error in submit handler:', error)
        toast({
          title: content[language].error,
          description: error instanceof Error ? error.message : String(error),
          variant: 'destructive',
        })
      }
    },
    [session?.user?.id, language, toast, router, formData, uploadPhotoAndPrepareData, triggerShake]
  )

  // 初始化音频
  useEffect(() => {
    audioRef.current = new Audio('/heartbeat.mp3')
    audioRef.current.loop = true

    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.currentTime = 0
        audioRef.current = null
      }
    }
  }, [])

  // 处理音频播放
  useEffect(() => {
    if (isLoading && audioRef.current) {
      audioRef.current.play().catch(console.error)
    } else if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
  }, [isLoading])

  useEffect(() => {
    console.log('showQuotaAlert state changed:', showQuotaAlert)
  }, [showQuotaAlert])

  return (
    <div className="w-full max-w-2xl">
      <form onSubmit={handleSubmit} className="relative" noValidate>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-8"
          >
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <span className="text-xl text-primary">{currentQuestion.id}</span>
                <motion.h2
                  className="text-3xl font-light"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  {currentQuestion.question}
                </motion.h2>
              </div>

              <div className={cn(isShaking && 'animate-shake')}>
                {currentQuestion.type === 'textarea' ? (
                  <Textarea
                    name={currentQuestion.field}
                    value={
                      typeof formData[currentQuestion.field] === 'string'
                        ? (formData[currentQuestion.field] as string)
                        : ''
                    }
                    onChange={handleInputChange}
                    className="text-lg border-0 border-b-2 rounded-none bg-transparent focus:ring-0 resize-none min-h-[100px] [&:not(:focus)]:hover:border-b-2"
                    placeholder={currentQuestion.placeholder}
                    required
                    title=""
                  />
                ) : currentQuestion.type === 'file' ? (
                  <div className="flex items-center border-b-2 border-input py-2">
                    <Input
                      type="file"
                      name={currentQuestion.field}
                      onChange={handleInputChange}
                      accept="image/*,.heic"
                      className="hidden"
                      id="file-upload"
                      required
                    />
                    <label
                      htmlFor="file-upload"
                      className="cursor-pointer bg-primary/10 text-primary hover:bg-primary/20 px-4 py-2 rounded-full text-sm font-medium"
                    >
                      Choose File
                    </label>
                    <span className="ml-3 text-sm text-gray-500">
                      {formData[currentQuestion.field] instanceof File
                        ? (formData[currentQuestion.field] as File).name
                        : 'No file chosen'}
                    </span>
                  </div>
                ) : (
                  <Input
                    type={currentQuestion.type}
                    name={currentQuestion.field}
                    value={
                      typeof formData[currentQuestion.field] === 'string'
                        ? (formData[currentQuestion.field] as string)
                        : ''
                    }
                    onChange={handleInputChange}
                    className="text-lg border-0 border-b-2 rounded-none bg-transparent focus:ring-0 focus:border-primary [&:not(:focus)]:hover:border-b-2"
                    placeholder={currentQuestion.placeholder}
                    required
                    autoComplete="off"
                    title=""
                  />
                )}
              </div>
            </div>

            <div className="flex items-center gap-4">
              {currentStep > 0 && (
                <Button
                  type="button"
                  onClick={handlePrevious}
                  className="rounded-full px-8"
                  variant="outline"
                  disabled={isSubmitting}
                >
                  Previous
                </Button>
              )}
              <div className="relative">
                <Button
                  type={currentStep === questions.length - 1 ? 'submit' : 'button'}
                  onClick={currentStep === questions.length - 1 ? undefined : handleNext}
                  disabled={isSubmitting}
                  className="rounded-full px-8 relative z-10 transition-colors duration-300"
                >
                  {currentStep === questions.length - 1
                    ? isSubmitting
                      ? 'Generating...'
                      : 'Create Love Letter'
                    : 'Next'}
                </Button>
                {isSubmitting && (
                  <div className="absolute inset-0 -m-1">
                    <div className="absolute inset-0 rounded-full bg-primary/60 animate-pulse"></div>
                    <div className="absolute inset-0 rounded-full animate-ping bg-primary/50"></div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="absolute bottom-[-60px] left-0 right-0">
          <div className="flex justify-center gap-2">
            {questions.map((_, index) => (
              <div
                key={index}
                className={`h-1 w-12 rounded-full transition-colors duration-300 ${
                  index === currentStep ? 'bg-primary' : 'bg-primary/20'
                }`}
              />
            ))}
          </div>
        </div>
      </form>

      <QuotaAlert
        open={showQuotaAlert}
        onOpenChange={(open: boolean) => {
          console.log('QuotaAlert onOpenChange:', open)
          setShowQuotaAlert(open)
        }}
      />
    </div>
  )
}
