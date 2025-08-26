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

interface CreditsAlertProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const content = {
  en: {
    title: 'Credits Exceeded',
    description:
      "You've used up all your free credits. Get more credits or upgrade to VIP to enjoy:",
    features: [
      "✨ Unlimited letter generation",
      "🎨 AI Image Generation (10-30 credits per use)",
      "🔄 Unlimited sharing",
      "🔒 Watermark removal"
    ],
    cancel: 'Cancel',
    upgrade: 'Get Credits',
  },
  zh: {
    title: '积分不足',
    description:
      '您的积分已不足。购买更多积分或升级VIP即可享受：',
    features: [
      "✨ 无限生成信件",
      "🎨 AI图像生成（10-30积分/次）",
      "🔄 无限分享",
      "🔒 去除水印"
    ],
    cancel: '取消',
    upgrade: '获取积分',
  },
}

export function CreditsAlert({ open, onOpenChange }: CreditsAlertProps) {
  const { language } = useLanguage()

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{content[language].title}</AlertDialogTitle>
          <AlertDialogDescription className="space-y-4">
            <p>{content[language].description}</p>
            <ul className="space-y-2 pl-1">
              {content[language].features.map((feature, index) => (
                <li key={index} className="flex items-start gap-2 text-base font-medium">
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
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
