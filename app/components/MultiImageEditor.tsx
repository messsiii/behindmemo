'use client'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useLanguage } from '@/contexts/LanguageContext'
import { cn } from '@/lib/utils'
import { Edit3, Eraser, Upload, X } from 'lucide-react'
import Image from 'next/image'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useDropzone } from 'react-dropzone'

// 编辑状态接口 - 简化版本
export interface EditState {
  images: File[]
  ratio: string
  markBoxes: MarkBox[]
}

interface MultiImageEditorProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (resultImage: File, editState: EditState) => void
  initialImages?: File[]
  initialRatio?: string
}

// 方框标记接口
interface MarkBox {
  id: string
  x: number // 相对于预览区域的坐标（百分比）
  y: number
  width: number
  height: number
  color: string
}

// 支持的比例选项
const ASPECT_RATIOS = [
  { key: '4:3', label: '4:3', value: 4/3 },
  { key: '3:4', label: '3:4', value: 3/4 },
  { key: '1:1', label: '1:1', value: 1/1 },
  { key: '16:9', label: '16:9', value: 16/9 },
  { key: '9:16', label: '9:16', value: 9/16 },
  { key: '2:1', label: '2:1', value: 2/1 },
  { key: '1:2', label: '1:2', value: 1/2 },
]

// 方框覆盖层组件 - 负责正确显示画框
const BoxOverlay = ({ 
  markBoxes, 
  currentBox, 
  compositeImage 
}: { 
  markBoxes: MarkBox[], 
  currentBox: Partial<MarkBox> | null,
  compositeImage: string | null
}) => {
  const [displayArea, setDisplayArea] = useState<{
    imageX: number,
    imageY: number,
    imageWidth: number,
    imageHeight: number,
    containerWidth: number,
    containerHeight: number
  } | null>(null)
  
  // 计算图片显示区域
  useEffect(() => {
    if (!compositeImage) return
    
    const updateDisplayArea = () => {
      const container = document.querySelector('[data-box-container]') as HTMLElement
      if (!container) return
      
      const rect = container.getBoundingClientRect()
      const img = document.createElement('img')
      
      img.onload = () => {
        const imgRatio = img.width / img.height
        const containerRatio = rect.width / rect.height
        
        let imageWidth, imageHeight, imageX, imageY
        
        if (imgRatio > containerRatio) {
          imageWidth = rect.width
          imageHeight = rect.width / imgRatio
          imageX = 0
          imageY = (rect.height - imageHeight) / 2
        } else {
          imageHeight = rect.height
          imageWidth = rect.height * imgRatio
          imageX = (rect.width - imageWidth) / 2
          imageY = 0
        }
        
        setDisplayArea({
          imageX,
          imageY,
          imageWidth,
          imageHeight,
          containerWidth: rect.width,
          containerHeight: rect.height
        })
      }
      
      img.src = compositeImage
    }
    
    updateDisplayArea()
    window.addEventListener('resize', updateDisplayArea)
    return () => window.removeEventListener('resize', updateDisplayArea)
  }, [compositeImage])
  
  // 将图片坐标转换为容器坐标
  const imageToContainerCoords = (imagePercent: { x: number, y: number, width: number, height: number }) => {
    if (!displayArea) return { x: 0, y: 0, width: 0, height: 0 }
    
    const { imageX, imageY, imageWidth, imageHeight, containerWidth, containerHeight } = displayArea
    
    // 将图片百分比转换为容器百分比
    const containerX = (imageX + (imagePercent.x / 100) * imageWidth) / containerWidth * 100
    const containerY = (imageY + (imagePercent.y / 100) * imageHeight) / containerHeight * 100
    const containerWidth_percent = (imagePercent.width / 100) * imageWidth / containerWidth * 100
    const containerHeight_percent = (imagePercent.height / 100) * imageHeight / containerHeight * 100
    
    return {
      x: containerX,
      y: containerY,
      width: containerWidth_percent,
      height: containerHeight_percent
    }
  }
  
  if (!displayArea) return null
  
  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* 已完成的方框 */}
      {markBoxes.map((box) => {
        const coords = imageToContainerCoords(box)
        return (
          <div
            key={box.id}
            className="absolute border-2"
            style={{
              left: `${coords.x}%`,
              top: `${coords.y}%`,
              width: `${coords.width}%`,
              height: `${coords.height}%`,
              borderColor: box.color,
            }}
          />
        )
      })}
      
      {/* 正在绘制的方框 */}
      {currentBox && currentBox.width !== undefined && currentBox.height !== undefined && (
        <div
          className="absolute border-2 border-dashed"
          style={{
            ...imageToContainerCoords(currentBox as MarkBox),
            left: `${imageToContainerCoords(currentBox as MarkBox).x}%`,
            top: `${imageToContainerCoords(currentBox as MarkBox).y}%`,
            width: `${imageToContainerCoords(currentBox as MarkBox).width}%`,
            height: `${imageToContainerCoords(currentBox as MarkBox).height}%`,
            borderColor: currentBox.color || '#ff0000',
          }}
        />
      )}
    </div>
  )
}

export default function MultiImageEditor({ 
  isOpen, 
  onClose, 
  onConfirm,
  initialImages = [],
  initialRatio = '4:3'
}: MultiImageEditorProps) {
  const { language } = useLanguage()
  const [selectedImages, setSelectedImages] = useState<File[]>([])
  const [selectedRatio, setSelectedRatio] = useState(initialRatio)
  const [compositeImage, setCompositeImage] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  
  // 方框标记相关状态
  const [markBoxes, setMarkBoxes] = useState<MarkBox[]>([])
  const [isDrawingMode, setIsDrawingMode] = useState(false)
  const [currentBox, setCurrentBox] = useState<Partial<MarkBox> | null>(null)
  const previewRef = useRef<HTMLDivElement>(null)
  
  // 移动端检测
  const [isMobile, setIsMobile] = useState(false)
  
  // 使用 ref 来避免闭包问题
  const drawingStateRef = useRef({
    isDrawing: false,
    startX: 0,
    startY: 0,
    currentBoxId: '',
    hasBeenSaved: false // 标记当前方框是否已保存
  })
  
  // 用ref存储currentBox状态，避免闭包问题
  const currentBoxRef = useRef<Partial<MarkBox> | null>(null)

  // 图片上传处理
  const handleImageUpload = useCallback((files: File[]) => {
    const newImages = [...selectedImages, ...files]
    setSelectedImages(newImages)
  }, [selectedImages])

  // 删除图片
  const handleRemoveImage = useCallback((index: number) => {
    const newImages = selectedImages.filter((_, i) => i !== index)
    setSelectedImages(newImages)
  }, [selectedImages])

  // 方框绘制相关函数
  const generateBoxId = () => `box_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  // 获取事件坐标（支持鼠标和触摸事件）
  const getEventCoordinates = useCallback((e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if ('touches' in e) {
      // 触摸事件
      const touch = e.touches[0] || e.changedTouches[0]
      return { clientX: touch.clientX, clientY: touch.clientY }
    } else {
      // 鼠标事件
      return { clientX: e.clientX, clientY: e.clientY }
    }
  }, [])

  // 计算图片在容器中的实际显示区域
  const getImageDisplayArea = useCallback(() => {
    if (!previewRef.current || !compositeImage) return null
    
    const container = previewRef.current.getBoundingClientRect()
    
    // 创建临时图片元素来获取图片的原始尺寸
    const img = document.createElement('img')
    return new Promise<{
      imageX: number, 
      imageY: number, 
      imageWidth: number, 
      imageHeight: number,
      containerWidth: number,
      containerHeight: number
    }>((resolve) => {
      img.onload = () => {
        const imgRatio = img.width / img.height
        const containerRatio = container.width / container.height
        
        let imageWidth, imageHeight, imageX, imageY
        
        if (imgRatio > containerRatio) {
          // 图片更宽，以容器宽度为准
          imageWidth = container.width
          imageHeight = container.width / imgRatio
          imageX = 0
          imageY = (container.height - imageHeight) / 2
        } else {
          // 图片更高或等比，以容器高度为准
          imageHeight = container.height
          imageWidth = container.height * imgRatio
          imageX = (container.width - imageWidth) / 2
          imageY = 0
        }
        
        resolve({
          imageX,
          imageY,
          imageWidth,
          imageHeight,
          containerWidth: container.width,
          containerHeight: container.height
        })
      }
      img.src = compositeImage
    })
  }, [compositeImage])

  // 将容器坐标转换为图片坐标（百分比）
  const containerToImageCoords = useCallback(async (containerX: number, containerY: number) => {
    const displayArea = await getImageDisplayArea()
    if (!displayArea) return { x: containerX, y: containerY }
    
    const { imageX, imageY, imageWidth, imageHeight, containerWidth, containerHeight } = displayArea
    
    // 将容器像素坐标转换为容器百分比
    const containerXPercent = (containerX / containerWidth) * 100
    const containerYPercent = (containerY / containerHeight) * 100
    
    // 检查点击是否在图片区域内
    const imageXPercent = (imageX / containerWidth) * 100
    const imageYPercent = (imageY / containerHeight) * 100
    const imageWidthPercent = (imageWidth / containerWidth) * 100
    const imageHeightPercent = (imageHeight / containerHeight) * 100
    
    if (containerXPercent < imageXPercent || containerXPercent > imageXPercent + imageWidthPercent ||
        containerYPercent < imageYPercent || containerYPercent > imageYPercent + imageHeightPercent) {
      return null // 点击在图片区域外
    }
    
    // 转换为相对于图片区域的坐标（百分比）
    const imageRelativeX = ((containerXPercent - imageXPercent) / imageWidthPercent) * 100
    const imageRelativeY = ((containerYPercent - imageYPercent) / imageHeightPercent) * 100
    
    return { x: imageRelativeX, y: imageRelativeY }
  }, [getImageDisplayArea])

  // 开始绘制方框
  const handleMouseDown = useCallback(async (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (!isDrawingMode || !previewRef.current) return
    
    const rect = previewRef.current.getBoundingClientRect()
    const { clientX, clientY } = getEventCoordinates(e)
    const containerX = clientX - rect.left
    const containerY = clientY - rect.top
    
    // 转换为图片坐标
    const imageCoords = await containerToImageCoords(containerX, containerY)
    if (!imageCoords) return // 点击在图片区域外，忽略
    
    const { x, y } = imageCoords
    const boxId = generateBoxId()
    
    // 更新 ref 状态
    drawingStateRef.current = {
      isDrawing: true,
      startX: x,
      startY: y,
      currentBoxId: boxId,
      hasBeenSaved: false
    }
    

    const newBox = {
      id: boxId,
      x,
      y,
      width: 0,
      height: 0,
      color: '#ff0000'
    }
    setCurrentBox(newBox)
    currentBoxRef.current = newBox
    
    // 阻止默认行为
    e.preventDefault()
  }, [isDrawingMode, containerToImageCoords])

  // 清除所有方框
  const clearAllBoxes = useCallback(() => {
    setMarkBoxes([])
    setCurrentBox(null)
    currentBoxRef.current = null
    // 重置绘制状态
    drawingStateRef.current.isDrawing = false
    drawingStateRef.current.hasBeenSaved = false
  }, [])



  // 切换绘制模式
  const toggleDrawingMode = useCallback(() => {
    setIsDrawingMode(prev => !prev)
    if (isDrawingMode) {
      // 退出绘制模式时清理状态
      drawingStateRef.current.isDrawing = false
      drawingStateRef.current.hasBeenSaved = false
      setCurrentBox(null)
      currentBoxRef.current = null
    }
  }, [isDrawingMode])

  // 拖拽上传配置
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.heic']
    },
    multiple: true,
    onDrop: handleImageUpload,
    noClick: false
  })

  // 拼合图片
  const composeImages = useCallback(async () => {
    if (selectedImages.length === 0) {
      setIsProcessing(false)
      return
    }
    
    if (!canvasRef.current) {
      console.warn('Canvas ref not ready, will retry...')
      setIsProcessing(false)
      return
    }

    setIsProcessing(true)
    
    try {
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        console.error('Failed to get canvas context')
        setIsProcessing(false)
        return
      }

      // 设置画布尺寸
      const targetWidth = 1200
      const ratio = ASPECT_RATIOS.find(r => r.key === selectedRatio)?.value || 4/3
      const targetHeight = targetWidth / ratio
      
      canvas.width = targetWidth
      canvas.height = targetHeight
      
      // 清空画布
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, targetWidth, targetHeight)

      // 加载所有图片
      const imageElements = await Promise.all(
        selectedImages.map((file) => {
          return new Promise<HTMLImageElement>((resolve, reject) => {
            const img = document.createElement('img')
            img.onload = () => {
              resolve(img)
            }
            img.onerror = (e) => {
              reject(e)
            }
            img.src = URL.createObjectURL(file)
          })
        })
      )

      // 辅助函数：生成位置数组
      const generatePositions = (cols: number, count: number) => {
        const positions = []
        for (let i = 0; i < count; i++) {
          positions.push({
            col: i % cols,
            row: Math.floor(i / cols)
          })
        }
        return positions
      }

      // 辅助函数：计算最优布局 - 优化横版/竖版比例的排列逻辑
      const calculateOptimalLayout = (count: number, targetRatio: number, avgImgRatio: number) => {
        if (count === 1) return { cols: 1, rows: 1, positions: [{ col: 0, row: 0 }] }
        
        if (count === 2) {
          // 2张图片：优先根据目标比例决定排列方式
          if (targetRatio > 1.0) {
            // 横版比例：横着排列（2列1行）
            return { cols: 2, rows: 1, positions: [{ col: 0, row: 0 }, { col: 1, row: 0 }] }
          } else if (targetRatio < 1.0) {
            // 竖版比例：竖着排列（1列2行）
            return { cols: 1, rows: 2, positions: [{ col: 0, row: 0 }, { col: 0, row: 1 }] }
          } else {
            // 正方形比例：根据图片比例决定
            if (avgImgRatio > 1.2) {
              return { cols: 2, rows: 1, positions: [{ col: 0, row: 0 }, { col: 1, row: 0 }] }
            } else {
              return { cols: 1, rows: 2, positions: [{ col: 0, row: 0 }, { col: 0, row: 1 }] }
            }
          }
        }
        
        if (count === 3) {
          if (targetRatio >= 2.0) {
            // 超宽画布：一行三列
            return { cols: 3, rows: 1, positions: [{ col: 0, row: 0 }, { col: 1, row: 0 }, { col: 2, row: 0 }] }
          } else if (targetRatio <= 0.5) {
            // 超高画布：一列三行
            return { cols: 1, rows: 3, positions: [{ col: 0, row: 0 }, { col: 0, row: 1 }, { col: 0, row: 2 }] }
          } else if (targetRatio > 1.0) {
            // 横版比例：优先横着排列 - 3列1行或2列2行（上面2个，下面1个居中）
            if (targetRatio >= 1.5) {
              return { cols: 3, rows: 1, positions: [{ col: 0, row: 0 }, { col: 1, row: 0 }, { col: 2, row: 0 }] }
            } else {
              return { cols: 2, rows: 2, positions: [{ col: 0, row: 0 }, { col: 1, row: 0 }, { col: 0, row: 1 }] }
            }
          } else {
            // 竖版比例：优先竖着排列 - 1列3行或2列2行（左边2个，右边1个居中）
            return { cols: 2, rows: 2, positions: [{ col: 0, row: 0 }, { col: 0, row: 1 }, { col: 1, row: 0 }] }
          }
        }
        
        // 4张及以上：根据目标比例智能调整
        const sqrt = Math.sqrt(count)
        let cols = Math.ceil(sqrt)
        let rows = Math.ceil(count / cols)
        
        if (targetRatio > 1.5) {
          // 横版比例：增加列数，减少行数
          cols = Math.min(count, Math.max(cols + 1, 3))
          rows = Math.ceil(count / cols)
        } else if (targetRatio < 0.67) {
          // 竖版比例：减少列数，增加行数
          cols = Math.max(1, cols - 1)
          rows = Math.ceil(count / cols)
        }
        
        // 确保不会超出合理范围
        if (cols > count) cols = count
        if (rows * cols < count) rows = Math.ceil(count / cols)
        
        return { cols, rows, positions: generatePositions(cols, count) }
      }

      // 生成所有可能的布局组合
      const generateAllPossibleLayouts = (count: number) => {
        const layouts = []
        
        for (let cols = 1; cols <= count; cols++) {
          const rows = Math.ceil(count / cols)
          if (rows * cols >= count) {
            layouts.push({
              cols,
              rows,
              positions: generatePositions(cols, count)
            })
          }
        }
        
        return layouts
      }

      // 计算布局的空间利用效率
      const calculateSpaceEfficiency = (layout: any, canvasWidth: number, canvasHeight: number, images: HTMLImageElement[]) => {
        const { cols, rows } = layout
        const cellW = canvasWidth / cols
        const cellH = canvasHeight / rows
        const cellRatio = cellW / cellH
        
        let totalEfficiency = 0
        images.forEach((img, index) => {
          if (index >= layout.positions?.length) return
          
          const imgRatio = img.width / img.height
          let fillRatio
          
          if (imgRatio > cellRatio) {
            fillRatio = cellH / (cellW / imgRatio)
          } else {
            fillRatio = cellW / (cellH * imgRatio)
          }
          
          totalEfficiency += Math.min(fillRatio, 1)
        })
        
        return totalEfficiency / Math.min(images.length, layout.positions?.length || cols * rows)
      }

      // 计算所有图片的平均比例，用于优化布局
      const avgImageRatio = imageElements.reduce((sum, img) => sum + (img.width / img.height), 0) / imageElements.length
      const imageCount = imageElements.length

      // 优化的智能布局计算
      const initialLayout = calculateOptimalLayout(imageCount, ratio, avgImageRatio)
      let { cols, rows, positions } = initialLayout

      // 只在特定情况下才使用空间效率优化，优先保持我们设计的布局逻辑
      if (imageCount > 4) {
        // 只对4张以上的图片使用空间效率优化
        const layouts = generateAllPossibleLayouts(imageCount)
        const bestLayout = layouts.reduce((best, current) => {
          const currentEfficiency = calculateSpaceEfficiency(current, targetWidth, targetHeight, imageElements)
          const bestEfficiency = calculateSpaceEfficiency(best, targetWidth, targetHeight, imageElements)
          return currentEfficiency > bestEfficiency ? current : best
        })
        
        // 如果效率提升显著才采用新布局
        const initialEfficiency = calculateSpaceEfficiency(initialLayout, targetWidth, targetHeight, imageElements)
        const bestEfficiency = calculateSpaceEfficiency(bestLayout, targetWidth, targetHeight, imageElements)
        
        if (bestEfficiency > initialEfficiency * 1.15) { // 需要至少15%的效率提升才换布局
          cols = bestLayout.cols
          rows = bestLayout.rows
          positions = bestLayout.positions || generatePositions(cols, imageCount)
        }
      }

      // 计算实际可用空间，添加小间距增强视觉效果
      const padding = Math.min(targetWidth, targetHeight) * 0.01 // 1% 作为间距
      const availableWidth = targetWidth - padding * (cols + 1)
      const availableHeight = targetHeight - padding * (rows + 1)
      const cellWidth = availableWidth / cols
      const cellHeight = availableHeight / rows

      // 绘制每张图片 - 最大化利用空间
      imageElements.forEach((img, index) => {
        if (index >= positions.length) return
        
        const pos = positions[index]
        const cellX = padding + pos.col * (cellWidth + padding)
        const cellY = padding + pos.row * (cellHeight + padding)
        
        // 计算图片的最佳尺寸，尽可能大同时保持比例
        const imgRatio = img.width / img.height
        const cellRatio = cellWidth / cellHeight
        
        let drawWidth, drawHeight, drawX, drawY
        
        // 智能缩放策略：优先填满可用空间
        if (Math.abs(imgRatio - cellRatio) < 0.1) {
          // 比例接近时，稍微拉伸以更好填充
          drawWidth = cellWidth
          drawHeight = cellHeight
          drawX = cellX
          drawY = cellY
        } else if (imgRatio > cellRatio) {
          // 图片更宽，以宽度为准
          drawWidth = cellWidth
          drawHeight = drawWidth / imgRatio
          drawX = cellX
          drawY = cellY + (cellHeight - drawHeight) / 2
        } else {
          // 图片更高，以高度为准
          drawHeight = cellHeight
          drawWidth = drawHeight * imgRatio
          drawX = cellX + (cellWidth - drawWidth) / 2
          drawY = cellY
        }
        
        // 绘制图片
        ctx.drawImage(
          img,
          0, 0, img.width, img.height,
          drawX, drawY, drawWidth, drawHeight
        )
        
        // 释放对象URL
        URL.revokeObjectURL(img.src)
      })

      // 转换为blob URL
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob)
          setCompositeImage(url)
          console.log('图片拼合完成，生成预览:', url.substring(0, 50) + '...')
        }
      }, 'image/jpeg', 0.9)

    } catch (error) {
      console.error('拼合图片失败:', error)
    } finally {
      setIsProcessing(false)
    }
  }, [selectedImages, selectedRatio, markBoxes])

  // 移动端检测
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // 初始化状态 - 每次打开都是干净的状态
  useEffect(() => {
    if (isOpen) {
      // 重置为干净状态
      setSelectedImages(initialImages)
      setSelectedRatio(initialRatio)
      setMarkBoxes([])
      setCurrentBox(null)
      currentBoxRef.current = null
      setIsDrawingMode(false)
      setCompositeImage(null)
      setIsProcessing(false) // 重置处理状态
      
      // 记录初始图片信息
      if (initialImages.length > 0) {
        console.log('加载初始图片到编辑器:', initialImages.length, '张')
      }
    }
  }, [isOpen, initialImages, initialRatio])

  // 当比例改变时清除方框
  useEffect(() => {
    clearAllBoxes()
  }, [selectedRatio, clearAllBoxes])

  // 添加document级别的事件监听器（支持鼠标和触摸）
  useEffect(() => {
    const handleMove = async (e: MouseEvent | TouchEvent) => {
      if (!drawingStateRef.current.isDrawing || !previewRef.current) return
      
      const rect = previewRef.current.getBoundingClientRect()
      let clientX: number, clientY: number
      
      if (e instanceof MouseEvent) {
        clientX = e.clientX
        clientY = e.clientY
      } else {
        const touch = e.touches[0] || e.changedTouches[0]
        clientX = touch.clientX
        clientY = touch.clientY
      }
      
      const containerX = clientX - rect.left
      const containerY = clientY - rect.top
      
      // 转换为图片坐标
      const imageCoords = await containerToImageCoords(containerX, containerY)
      if (!imageCoords) return
      
      const { x: currentX, y: currentY } = imageCoords
      
      // 限制在图片范围内
      const clampedCurrentX = Math.max(0, Math.min(100, currentX))
      const clampedCurrentY = Math.max(0, Math.min(100, currentY))
      
      const { startX, startY } = drawingStateRef.current
      const width = Math.abs(clampedCurrentX - startX)
      const height = Math.abs(clampedCurrentY - startY)
      const x = Math.min(startX, clampedCurrentX)
      const y = Math.min(startY, clampedCurrentY)
      
      const updatedBox = currentBoxRef.current ? {
        ...currentBoxRef.current,
        x,
        y,
        width,
        height
      } : null
      
      setCurrentBox(updatedBox)
      currentBoxRef.current = updatedBox
    }

    const handleEnd = () => {
      if (!drawingStateRef.current.isDrawing || drawingStateRef.current.hasBeenSaved) return
      
      const { currentBoxId } = drawingStateRef.current
      
      // 标记为已保存，防止重复处理
      drawingStateRef.current.hasBeenSaved = true
      drawingStateRef.current.isDrawing = false
      
      // 获取当前方框的值
      const currentBoxValue = currentBoxRef.current
      
      // 立即清除 currentBox
      setCurrentBox(null)
      currentBoxRef.current = null
      
      // 检查方框是否有效并保存
      if (currentBoxValue && currentBoxValue.width && currentBoxValue.height && 
          currentBoxValue.width > 1 && currentBoxValue.height > 1) {
        
        setMarkBoxes(prev => {
          const exists = prev.some(box => box.id === currentBoxId)
          if (exists) {
            return prev
          }
          return [...prev, currentBoxValue as MarkBox]
        })
      }
    }

    // 添加鼠标和触摸事件监听器
    document.addEventListener('mousemove', handleMove)
    document.addEventListener('mouseup', handleEnd)
    document.addEventListener('touchmove', handleMove, { passive: false })
    document.addEventListener('touchend', handleEnd)

    return () => {
      document.removeEventListener('mousemove', handleMove)
      document.removeEventListener('mouseup', handleEnd)
      document.removeEventListener('touchmove', handleMove)
      document.removeEventListener('touchend', handleEnd)
    }
  }, [containerToImageCoords]) // 依赖containerToImageCoords函数

  // 当图片或比例改变时重新拼合
  useEffect(() => {
    if (selectedImages.length > 0) {
      // 添加短暂延迟确保Canvas元素已渲染
      const timer = setTimeout(() => {
        composeImages()
      }, 100)
      return () => clearTimeout(timer)
    } else {
      setCompositeImage(null)
      setIsProcessing(false)
    }
  }, [selectedImages, selectedRatio, composeImages])

  // 确认并返回结果
  const handleConfirm = useCallback(async () => {
    if (!compositeImage || !canvasRef.current) return

    try {
      // 如果有方框标记，需要重新绘制包含方框的最终图片
      if (markBoxes.length > 0) {
        const canvas = canvasRef.current
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        // 先加载当前的预览图片
        const img = document.createElement('img')
        img.onload = () => {
          // 重新绘制预览图片到画布
          ctx.clearRect(0, 0, canvas.width, canvas.height)
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
          
          // 绘制方框标记 - 使用画布坐标而不是预览区域坐标
          markBoxes.forEach((box) => {
            const boxX = (box.x / 100) * canvas.width
            const boxY = (box.y / 100) * canvas.height
            const boxWidth = (box.width / 100) * canvas.width
            const boxHeight = (box.height / 100) * canvas.height
            
            // 绘制方框边框
            ctx.strokeStyle = box.color
            ctx.lineWidth = Math.max(3, Math.min(canvas.width, canvas.height) / 200) // 稍微加粗边框
            ctx.setLineDash([])
            ctx.strokeRect(boxX, boxY, boxWidth, boxHeight)
          })
          
          // 生成最终文件
          canvas.toBlob((blob) => {
            if (blob) {
              const file = new File([blob], `composed-image-${Date.now()}.jpg`, {
                type: 'image/jpeg'
              })
              
              // 构建当前编辑状态
              const editState: EditState = {
                images: selectedImages,
                ratio: selectedRatio,
                markBoxes: markBoxes
              }
              
              onConfirm(file, editState)
              onClose()
            }
          }, 'image/jpeg', 0.9)
        }
        img.onerror = () => {
          console.error('加载预览图片失败')
        }
        img.src = compositeImage
      } else {
        // 没有方框时直接使用当前画布
        canvasRef.current.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], `composed-image-${Date.now()}.jpg`, {
              type: 'image/jpeg'
            })
            
            // 构建当前编辑状态
            const editState: EditState = {
              images: selectedImages,
              ratio: selectedRatio,
              markBoxes: markBoxes
            }
            
            onConfirm(file, editState)
            onClose()
          }
        }, 'image/jpeg', 0.9)
      }
    } catch (error) {
      console.error('生成结果图片失败:', error)
    }
  }, [compositeImage, selectedImages, selectedRatio, markBoxes, onConfirm, onClose])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={cn(
        "p-0",
        isMobile 
          ? "max-w-[100vw] w-[100vw] h-[100vh] max-h-[100vh] rounded-none" 
          : "max-w-[95vw] w-[95vw] h-[90vh] max-h-[90vh]"
      )}>
        {/* 头部 */}
        <DialogHeader className={cn(
          "flex flex-row items-center justify-between border-b",
          isMobile ? "p-4 pb-3" : "p-6 pb-4"
        )}>
          <DialogTitle className="flex items-center gap-2">
            <Edit3 className="w-5 h-5" />
            <span className={cn(isMobile ? "text-base" : "text-lg")}>
              {language === 'en' ? 'Multi-Image Editor' : '多图片编辑器'}
            </span>
          </DialogTitle>
          {isProcessing && (
            <span className="text-sm text-blue-600 flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              {language === 'en' ? 'Processing...' : '处理中...'}
            </span>
          )}
        </DialogHeader>

        {/* 主要内容区域 */}
        <div className={cn(
          "flex-1 flex h-full overflow-hidden",
          isMobile ? "flex-col" : "flex-row"
        )}>
          {/* 左侧：拼合结果 */}
          <div className={cn(
            "flex flex-col",
            isMobile ? "flex-1 p-4" : "flex-1 p-6"
          )}>
            <div className="flex-1 flex flex-col space-y-4">
              {/* 拼合结果显示区域 */}
              <div className={cn(
                "relative border-2 rounded-xl overflow-hidden bg-gray-50 shadow-lg",
                isMobile ? "flex-1 min-h-[300px]" : "flex-1 min-h-0"
              )}>
                {compositeImage ? (
                                      <div 
                    ref={previewRef}
                    data-box-container
                    className={cn(
                      "relative w-full h-full",
                      isDrawingMode ? "cursor-crosshair" : "cursor-default"
                    )}
                    onMouseDown={handleMouseDown}
                    onTouchStart={isMobile ? handleMouseDown : undefined}
                  >
                    {/* 背景图片 */}
                    <Image
                      src={compositeImage}
                      alt="Composite"
                      fill
                      className="object-contain pointer-events-none"
                      unoptimized
                    />
                    
                    {/* 方框标记层 */}
                    <BoxOverlay 
                      markBoxes={markBoxes}
                      currentBox={currentBox}
                      compositeImage={compositeImage}
                    />
                    
                    {/* 绘制模式提示 */}
                    {isDrawingMode && (
                      <div className="absolute bottom-2 left-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                        {language === 'en' ? 'Click and drag to draw box' : '点击拖拽绘制方框'}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full bg-gray-100">
                    <div className="text-center text-gray-500">
                      {isProcessing ? (
                        <>
                          <div className="w-16 h-16 mx-auto mb-4 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                          <p className="text-lg font-medium mb-2">
                            {language === 'en' ? 'Processing images...' : '正在处理图片...'}
                          </p>
                          <p className="text-sm">
                            {language === 'en' ? 'Please wait while we prepare your images' : '请稍候，正在准备您的图片'}
                          </p>
                        </>
                      ) : (
                        <>
                          <Edit3 className="w-16 h-16 mx-auto mb-4 opacity-50" />
                          <p className="text-lg font-medium mb-2">
                            {selectedImages.length > 0 
                              ? (language === 'en' ? 'Ready to compose' : '准备拼合')
                              : (language === 'en' ? 'No images to compose' : '暂无图片可拼合')
                            }
                          </p>
                          <p className="text-sm">
                            {selectedImages.length > 0
                              ? (language === 'en' ? 'Images are ready for composition' : '图片已准备好，可以进行拼合')
                              : (language === 'en' ? 'Upload images on the right to see the result' : '在右侧上传图片以查看拼合结果')
                            }
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* 比例选择 */}
              <div className={cn("space-y-3", isMobile && "space-y-2")}>
                <h4 className={cn(
                  "font-medium text-gray-700",
                  isMobile ? "text-xs" : "text-sm"
                )}>
                  {language === 'en' ? 'Aspect Ratio' : '图片比例'}
                </h4>
                <div className={cn(
                  "flex flex-wrap",
                  isMobile ? "gap-1" : "gap-2"
                )}>
                  {ASPECT_RATIOS.map((ratio) => (
                    <Button
                      key={ratio.key}
                      variant={selectedRatio === ratio.key ? 'default' : 'outline'}
                      size={isMobile ? "sm" : "sm"}
                      onClick={() => setSelectedRatio(ratio.key)}
                      className={cn(
                        isMobile ? "min-w-[45px] h-8 text-xs px-2" : "min-w-[60px]"
                      )}
                    >
                      {ratio.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* 方框标记工具 */}
              {compositeImage && (
                <div className={cn(
                  "pt-4 border-t",
                  isMobile ? "space-y-2" : "space-y-3"
                )}>
                  <h4 className={cn(
                    "font-medium text-gray-700",
                    isMobile ? "text-xs" : "text-sm"
                  )}>
                    {language === 'en' ? 'Mark Tools' : '标记工具'}
                  </h4>
                  <div className={cn(
                    "flex flex-wrap",
                    isMobile ? "gap-1" : "gap-2"
                  )}>
                    <Button
                      variant={isDrawingMode ? 'default' : 'outline'}
                      size="sm"
                      onClick={toggleDrawingMode}
                      className={cn(
                        "flex items-center gap-2",
                        isMobile && "h-8 text-xs px-2"
                      )}
                    >
                      <svg className={cn(isMobile ? "w-3 h-3" : "w-4 h-4")} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" strokeWidth="2"/>
                      </svg>
                      {language === 'en' ? 'Draw Box' : '绘制方框'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearAllBoxes}
                      disabled={markBoxes.length === 0}
                      className={cn(
                        "flex items-center gap-2",
                        isMobile && "h-8 text-xs px-2"
                      )}
                    >
                      <Eraser className={cn(isMobile ? "w-3 h-3" : "w-4 h-4")} />
                      {language === 'en' ? 'Clear All' : '清除全部'}
                    </Button>
                  </div>
                  {markBoxes.length > 0 && (
                    <div className="text-xs text-gray-500">
                      {language === 'en' 
                        ? `${markBoxes.length} box(es) marked` 
                        : `已标记 ${markBoxes.length} 个方框`
                      }
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 右侧：图片管理 */}
          <div className={cn(
            "bg-gray-50/50 flex flex-col space-y-4 overflow-y-auto",
            isMobile 
              ? "border-t p-4" 
              : "w-80 border-l p-6"
          )}>
            {/* 图片上传区域 */}
            <div className={cn(isMobile ? "space-y-2" : "space-y-3")}>
              <h4 className={cn(
                "font-medium text-gray-700",
                isMobile ? "text-xs" : "text-sm"
              )}>
                {selectedImages.length > 0 
                  ? (language === 'en' ? 'Add More Images' : '添加更多图片')
                  : (language === 'en' ? 'Upload Images' : '上传图片')
                }
              </h4>
              <div
                {...getRootProps()}
                className={cn(
                  'border-2 border-dashed rounded-lg text-center cursor-pointer',
                  'transition-colors duration-200',
                  isMobile ? 'p-3' : 'p-4',
                  isDragActive 
                    ? 'border-primary bg-primary/5' 
                    : 'border-gray-300 hover:border-gray-400'
                )}
              >
                <input {...getInputProps()} />
                <div className={cn(
                  "flex flex-col items-center",
                  isMobile ? "gap-1" : "gap-2"
                )}>
                  <Upload className={cn(
                    "text-gray-400",
                    isMobile ? "w-6 h-6" : "w-8 h-8"
                  )} />
                  <p className={cn(
                    "text-gray-600",
                    isMobile ? "text-xs" : "text-sm"
                  )}>
                    {isDragActive
                      ? (language === 'en' ? 'Drop here...' : '放置于此...')
                      : selectedImages.length > 0
                        ? (language === 'en' ? 'Click or drag to add more' : '点击或拖拽添加更多')
                        : (language === 'en' ? 'Click or drag to upload' : '点击或拖拽上传')
                    }
                  </p>
                  <p className="text-xs text-gray-400">
                    {language === 'en' 
                      ? 'JPG, PNG, WebP, HEIC' 
                      : 'JPG、PNG、WebP、HEIC'
                    }
                  </p>
                </div>
              </div>
            </div>

            {/* 已选图片预览 */}
            {selectedImages.length > 0 && (
              <div className={cn(
                isMobile ? "space-y-2" : "flex-1 space-y-3"
              )}>
                <h4 className={cn(
                  "font-medium text-gray-700",
                  isMobile ? "text-xs" : "text-sm"
                )}>
                  {language === 'en' ? 'Selected Images' : '已选图片'} ({selectedImages.length})
                </h4>
                <div className={cn(
                  "grid gap-2 overflow-y-auto",
                  isMobile ? "grid-cols-4 max-h-24" : "grid-cols-2"
                )}>
                  {selectedImages.map((file, index) => (
                    <div key={index} className="relative group">
                      <div className="relative aspect-square border rounded-lg overflow-hidden bg-white hover:border-gray-400 transition-colors">
                        <Image
                          src={URL.createObjectURL(file)}
                          alt={`Preview ${index + 1}`}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute top-1 right-1 h-6 w-6 bg-red-500 hover:bg-red-600 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleRemoveImage(index)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                        <div className="absolute bottom-1 left-1 bg-black/50 text-white text-xs px-1 rounded">
                          {index + 1}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 操作按钮 */}
            <div className={cn(
              "flex gap-2 pt-4 border-t",
              isMobile ? "flex-row" : "flex-col"
            )}>
              <Button 
                onClick={handleConfirm}
                disabled={!compositeImage || isProcessing}
                className={cn(
                  isMobile ? "flex-1 h-10 text-sm" : "w-full"
                )}
              >
                {selectedImages.length === 1
                  ? (language === 'en' ? 'Apply Changes' : '应用修改')
                  : (language === 'en' ? 'Apply Composition' : '应用拼合')
                }
              </Button>
              <Button 
                variant="outline" 
                onClick={onClose} 
                className={cn(
                  isMobile ? "flex-1 h-10 text-sm" : "w-full"
                )}
              >
                {language === 'en' ? 'Cancel' : '取消'}
              </Button>
            </div>
          </div>
        </div>

        {/* 隐藏的画布用于图片拼合 */}
        <canvas
          ref={canvasRef}
          className="hidden"
        />
      </DialogContent>
    </Dialog>
  )
} 