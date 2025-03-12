'use client'

// 添加全局类型声明，确保TypeScript识别window.Paddle
declare global {
  interface Window {
    Paddle: any;
  }
}

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";
import { openSubscriptionCheckout } from "@/lib/paddle";
import { Crown, Infinity, Lock, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";

interface UnlockTemplateDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  templateName: string
  credits: number
  language: string
  isLoading?: boolean
}

export function UnlockTemplateDialog({
  isOpen,
  onClose,
  onConfirm,
  templateName,
  credits,
  language,
  isLoading = false
}: UnlockTemplateDialogProps) {
  const [isUpgrading, setIsUpgrading] = useState(false)
  
  // 使用useMemo包装texts对象以避免不必要的重新创建
  const texts = useMemo(() => ({
    title: {
      en: 'Unlock Template',
      zh: '解锁模板'
    },
    description: {
      en: `This template requires 5 credits to unlock. It will only be available for this letter.`,
      zh: `此模板需要消耗5点积分解锁，仅对当前信件有效。`
    },
    youHave: {
      en: 'You have',
      zh: '您当前有'
    },
    credits: {
      en: 'credits',
      zh: '点积分'
    },
    unlock: {
      en: 'Unlock for 5 credits',
      zh: '消耗5点解锁'
    },
    unlocking: {
      en: 'Unlocking...',
      zh: '解锁中...'
    },
    getVip: {
      en: 'Become VIP',
      zh: '开通会员'
    },
    vipBenefits: {
      en: 'Unlimited access to all templates and features',
      zh: '无限使用所有模板和功能'
    },
    upgrading: {
      en: 'Processing...',
      zh: '处理中...'
    },
    vipSuccess: {
      en: 'VIP activated successfully!',
      zh: 'VIP 已成功激活！'
    },
    refreshing: {
      en: 'Refreshing...',
      zh: '刷新中...'
    }
  }), [])
  
  // 直接使用传入的语言参数
  const currentLang = language === 'en' ? 'en' : 'zh'
  
  // 直接在页面上唤起付费窗口
  const handleUpgradeClick = async () => {
    setIsUpgrading(true)
    
    try {
      // 先检查用户是否已有订阅
      const response = await fetch('/api/user/check-subscription-status')
      
      if (!response.ok) {
        throw new Error('Failed to check subscription status')
      }
      
      const data = await response.json()
      
      if (data.hasActiveSubscription) {
        // 用户已有订阅，显示提示
        toast({
          title: currentLang === 'en' ? 'Subscription exists' : '已有订阅',
          description: currentLang === 'en' 
            ? data.source === 'paddle' 
                ? 'We found your subscription in Paddle and synced it to your account.' 
                : 'You already have an active subscription.'
            : data.source === 'paddle' 
                ? '我们在 Paddle 发现了您的订阅并已同步到您的账户。' 
                : '您已有活跃的订阅。',
        })
        
        // 关闭对话框
        onClose()
        
        // 如果是从 Paddle 同步的，触发页面刷新
        if (data.source === 'paddle' && data.synced) {
          setTimeout(() => {
            window.location.reload()
          }, 2000)
        }
        
        return
      }
      
      // 检查 Paddle 是否已加载
      if (!window.Paddle || !window.Paddle.Checkout) {
        throw new Error('Payment system is not available. Please try again later.')
      }
      
      // 使用与pricing页面相同的实现
      openSubscriptionCheckout()
      
      // 关闭对话框
      onClose()
      
      // 触发自定义事件，通知其他组件开始检查VIP状态
      const event = new CustomEvent('subscription:success')
      window.dispatchEvent(event)
      
      // 显示提示信息
      toast({
        title: currentLang === 'en' ? 'Processing payment' : '正在处理支付',
        description: currentLang === 'en' 
          ? 'The page will refresh automatically once payment is completed.' 
          : '支付完成后页面将自动刷新。',
      })
    } catch (error) {
      console.error('Failed to open checkout:', error)
      // 显示用户友好的错误消息
      toast({
        title: currentLang === 'en' ? 'Error' : '错误',
        description: currentLang === 'en' 
          ? (error instanceof Error ? error.message : 'Failed to open payment window.') 
          : '打开支付窗口失败，请刷新页面重试。',
        variant: 'destructive'
      })
    } finally {
      // 即使发生错误也停止loading状态
      setIsUpgrading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-gray-500" />
            {texts.title[currentLang]}
          </DialogTitle>
          <DialogDescription>
            {texts.description[currentLang]}
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <div className="flex items-center justify-center p-4 mb-4 bg-gray-100 dark:bg-gray-800 rounded-md">
            <div className="flex flex-col items-center">
              <p className="text-lg font-medium mb-1">{templateName}</p>
              <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
                <span>{texts.youHave[currentLang]}</span>
                <span className="font-bold text-gray-900 dark:text-gray-200">{credits}</span>
                <span>{texts.credits[currentLang]}</span>
                <Sparkles className="h-4 w-4 text-amber-500" />
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 gap-4">
            <Button 
              type="button" 
              onClick={handleUpgradeClick}
              variant="outline"
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-amber-50 to-yellow-50 border-yellow-200 hover:from-amber-100 hover:to-yellow-100 dark:from-amber-900/20 dark:to-yellow-900/20"
              disabled={isUpgrading}
            >
              {isUpgrading ? (
                <>
                  <div className="h-4 w-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                  <span>{texts.upgrading[currentLang]}</span>
                </>
              ) : (
                <>
                  <Crown className="h-4 w-4 text-amber-500" />
                  <span>{texts.getVip[currentLang]}</span>
                  <Infinity className="h-4 w-4 text-amber-500" />
                </>
              )}
            </Button>
            <p className="text-xs text-center text-gray-500">
              {texts.vipBenefits[currentLang]}
            </p>
          </div>
        </div>
        
        <DialogFooter>
          <Button 
            type="button" 
            onClick={onConfirm}
            disabled={isLoading || credits < 5}
            className="flex items-center gap-1.5 w-full"
          >
            {isLoading ? (
              <>
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {texts.unlocking[currentLang]}
              </>
            ) : (
              <>
                {texts.unlock[currentLang]}
                <Sparkles className="h-4 w-4" />
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 