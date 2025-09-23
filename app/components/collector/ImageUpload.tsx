'use client'

import { SimpleImageUpload as BaseImageUpload } from '@/components/SimpleImageUpload'

interface ImageUploadProps {
  onImageSelect: (file: File) => void
  uploading?: boolean
  maxSize?: number
}

export default function ImageUpload({ onImageSelect, uploading, maxSize }: ImageUploadProps) {
  return (
    <div className="relative">
      {uploading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-primary mx-auto" />
            <p className="mt-2 text-sm text-gray-500">上传中...</p>
          </div>
        </div>
      )}
      <BaseImageUpload onImageSelected={onImageSelect} className="w-full" />
      {maxSize && (
        <p className="mt-2 text-xs text-gray-500 text-center">最大文件大小: {maxSize}MB</p>
      )}
    </div>
  )
}
