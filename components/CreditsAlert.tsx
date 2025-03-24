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
      "You've used up all your free credits. Upgrade to VIP to enjoy:",
    features: [
      "✨ Unlimited letter generation",
      "🎨 Unlimited template usage",
      "🔄 Unlimited sharing",
      "🔒 Watermark removal"
    ],
    cancel: 'Cancel',
    upgrade: 'Upgrade to VIP',
  },
  zh: {
    title: '创作配额不足',
    description:
      '您的免费创作次数已用完。升级为VIP即可享受：',
    features: [
      "✨ 无限生成信件",
      "🎨 无限使用模板",
      "🔄 无限分享",
      "🔒 去除水印"
    ],
    cancel: '取消',
    upgrade: '升级VIP',
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
