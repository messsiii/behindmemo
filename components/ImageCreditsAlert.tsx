'use client'

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
import { useLanguage } from '@/contexts/LanguageContext'
import Link from 'next/link'

interface ImageCreditsAlertProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  requiredCredits: number
  currentCredits: number
}

const content = {
  en: {
    title: 'Insufficient Credits',
    description: (required: number, current: number) => 
      `You need ${required} credits to generate this image, but you only have ${current} credits.`,
    cancel: 'Cancel',
    upgrade: 'Get Credits',
  },
  zh: {
    title: '积分不足',
    description: (required: number, current: number) => 
      `生成此图片需要 ${required} 积分，您当前只有 ${current} 积分。`,
    cancel: '取消',
    upgrade: '获取积分',
  },
}

export function ImageCreditsAlert({ 
  open, 
  onOpenChange, 
  requiredCredits, 
  currentCredits 
}: ImageCreditsAlertProps) {
  const { language } = useLanguage()

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{content[language].title}</AlertDialogTitle>
          <AlertDialogDescription>
            {content[language].description(requiredCredits, currentCredits)}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{content[language].cancel}</AlertDialogCancel>
          <AlertDialogAction asChild>
            <Link href="/pricing" className="bg-primary hover:bg-primary/90">
              {content[language].upgrade}
            </Link>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}