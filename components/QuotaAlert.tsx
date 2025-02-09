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

interface QuotaAlertProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const content = {
  en: {
    title: 'Quota Exceeded',
    description:
      "You've used up all your free generations. Each new user gets 2 free generations. Upgrade to VIP for unlimited access or purchase additional quota.",
    cancel: 'Cancel',
    upgrade: 'Upgrade to VIP',
  },
  zh: {
    title: '配额不足',
    description:
      '您的免费生成次数已用完。每位新用户可获得2次免费生成机会。升级为VIP获取无限使用权限，或购买额外配额。',
    cancel: '取消',
    upgrade: '升级VIP',
  },
}

export function QuotaAlert({ open, onOpenChange }: QuotaAlertProps) {
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
