'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/use-toast'
import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

async function uploadImage(file: File | null): Promise<string> {
  if (!file) {
    throw new Error('No file selected')
  }

  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    throw new Error('Failed to upload image')
  }

  const data = await response.json()
  return data.url
}

export default function WritingForm() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [name, setName] = useState('')
  const [loverName, setLoverName] = useState('')
  const [story, setStory] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      setIsSubmitting(true)

      // 上传图片
      const imageUrl = await uploadImage(selectedImage)

      // 创建信件
      const res = await fetch('/api/letters', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          loverName,
          story,
          imageUrl,
          metadata: {
            name,
            loverName,
            story,
          },
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create letter')
      }

      // 保存状态到 localStorage
      localStorage.setItem(
        'currentLetter',
        JSON.stringify({
          id: data.id,
          name,
          loverName,
          story,
          imageUrl,
        })
      )

      // 跳转到结果页
      router.push(`/result/${data.id}`)
    } catch (error) {
      console.error('[SUBMIT_ERROR]', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create letter',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="space-y-4">
        <div>
          <Label htmlFor="name">Your Name</Label>
          <Input id="name" value={name} onChange={e => setName(e.target.value)} required />
        </div>

        <div>
          <Label htmlFor="loverName">Their Name</Label>
          <Input
            id="loverName"
            value={loverName}
            onChange={e => setLoverName(e.target.value)}
            required
          />
        </div>

        <div>
          <Label htmlFor="story">Your Story</Label>
          <Textarea
            id="story"
            value={story}
            onChange={e => setStory(e.target.value)}
            required
            className="min-h-[200px]"
          />
        </div>

        <div>
          <Label htmlFor="image">Upload Photo</Label>
          <Input
            id="image"
            type="file"
            accept="image/*"
            onChange={e => setSelectedImage(e.target.files?.[0] || null)}
            required
          />
        </div>
      </div>

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Creating...
          </>
        ) : (
          'Create Love Letter'
        )}
      </Button>
    </form>
  )
}
