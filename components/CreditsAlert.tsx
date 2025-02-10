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
      "You've used up all your free credits. Each new user gets 2 free credits. Upgrade to VIP for unlimited access or purchase additional credits.",
    cancel: 'Cancel',
    upgrade: 'Upgrade to VIP',
  },
  zh: {
    title: '创作配额不足',
    description:
      '您的免费创作次数已用完。每位新用户可获得2次免费创作机会。升级为VIP获取无限使用权限，或购买额外配额。',
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
