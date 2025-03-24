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
      "You've used up all your free credits. Upgrade to VIP to enjoy unlimited letter generation, unlimited template usage, unlimited sharing, and watermark removal. Experience premium features to create perfect memories!",
    cancel: 'Cancel',
    upgrade: 'Upgrade to VIP',
  },
  zh: {
    title: '创作配额不足',
    description:
      '您的免费创作次数已用完。升级为VIP即可享受无限生成信件、无限使用模板、无限分享以及去除水印等特权。立即开通VIP，创造完美回忆！',
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
          <AlertDialogDescription>{content[language].description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{content[language].cancel}</AlertDialogCancel>
          <AlertDialogAction asChild>
            <Link href="/pricing">{content[language].upgrade}</Link>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
