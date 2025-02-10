import {
    AlertDialog,
    AlertDialogAction, AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle
} from '@/components/ui/alert-dialog'
import { useLanguage } from '@/contexts/LanguageContext'

interface BetaAlertProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const content = {
  en: {
    title: 'Product in Beta',
    description: 'Our product is currently in beta testing. Subscription features will be available soon. Thank you for your interest!',
    ok: 'Got it',
  },
  zh: {
    title: '产品内测中',
    description: '我们的产品目前处于内测阶段，订阅功能即将开放。感谢您的关注！',
    ok: '知道了',
  },
}

export function BetaAlert({ open, onOpenChange }: BetaAlertProps) {
  const { language } = useLanguage()

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{content[language].title}</AlertDialogTitle>
          <AlertDialogDescription>{content[language].description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction>{content[language].ok}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
} 