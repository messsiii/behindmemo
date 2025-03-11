'use client'

// 添加全局类型声明，确保TypeScript识别window.Paddle
declare global {
  interface Window {
    Paddle: any;
  }
}

import { Footer } from '@/components/footer';
import { Nav } from '@/components/nav';
import PaddleScript from '@/components/PaddleScript';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from "@/components/ui/use-toast";
import { useLanguage } from '@/contexts/LanguageContext';
import { openSubscriptionCheckout } from '@/lib/paddle';
import { motion } from 'framer-motion';
import { Brush, Loader2, PenLine, Sparkles } from "lucide-react";
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import useSWR from 'swr';

// 定义接口
interface UserInfo {
  id: string
  name: string
  email: string
  image: string
  isVIP: boolean
  vipExpiresAt: string | null
  credits: number
  totalUsage: number
  lastLoginAt: string
  createdAt: string
  language: string
}

interface Transaction {
  id: string
  createdAt: string
  amount: number
  currency: string
  status: string
  type: string
  paddleOrderId: string | null
  pointsAdded: number | null
}

interface Subscription {
  id: string
  paddleSubscriptionId: string
  status: string
  planType: string
  startedAt: string
  nextBillingAt: string | null
  canceledAt: string | null
  endedAt: string | null
}

interface UsageRecord {
  id: string
  createdAt: string
  type: string
  pointsUsed: number
  description: string
}

// 数据获取函数
const fetcher = (url: string, language: string) => async () => {
  const res = await fetch(url, {
    headers: {
      'x-language-preference': language || 'zh',
    }
  })
  if (!res.ok) {
    throw new Error('Failed to fetch data')
  }
  return res.json()
}

// 加载中组件
function LoadingSkeleton() {
  return (
    <div className="space-y-8">
      {/* 账户信息卡片骨架 */}
      <div className="bg-white/80 backdrop-blur-sm rounded-xl overflow-hidden shadow-lg border border-white/10">
        <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-[#738fbd]/10 to-[#cc8eb1]/10">
          <Skeleton className="h-7 w-48" />
        </div>
        <div className="p-6 space-y-6">
          <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
            <Skeleton className="h-24 w-24 rounded-full flex-shrink-0" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-4 rounded-lg border border-gray-100 bg-gray-50/60">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-6 w-32" />
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* 会员信息卡片骨架 */}
      <div className="bg-white/80 backdrop-blur-sm rounded-xl overflow-hidden shadow-lg border border-white/10">
        <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-[#738fbd]/10 to-[#cc8eb1]/10">
          <Skeleton className="h-7 w-48" />
        </div>
        <div className="p-6 space-y-4">
          <div className="p-4 rounded-lg border border-gray-100 bg-gray-50/60">
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-3/4 mb-2" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <div className="flex flex-wrap gap-3 justify-start">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-32" />
            ))}
          </div>
        </div>
      </div>
      
      {/* 交易历史卡片骨架 */}
      <div className="bg-white/80 backdrop-blur-sm rounded-xl overflow-hidden shadow-lg border border-white/10">
        <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-[#738fbd]/10 to-[#cc8eb1]/10">
          <Skeleton className="h-7 w-48" />
        </div>
        <div className="p-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/60">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <th key={i} className="text-left p-3">
                      <Skeleton className="h-4 w-16" />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    {Array.from({ length: 4 }).map((_, j) => (
                      <td key={j} className="p-3">
                        <Skeleton className="h-4 w-full" />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AccountPage() {
  const { data: session } = useSession()
  const { language } = useLanguage()
  const [mounted, setMounted] = useState(false)
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isResuming, setIsResuming] = useState(false);
  const [isResumeDialogOpen, setIsResumeDialogOpen] = useState(false);

  useEffect(() => {
    setMounted(true)
  }, [])

  // 多语言内容
  const content = {
    en: {
      title: 'Account Management',
      accountInfo: 'Account Information',
      membership: 'Membership & Credits',
      transactions: 'Transaction History',
      usageHistory: 'Usage History',
      loading: 'Loading your account information...',
      noSession: 'Please sign in to view your account',
      signIn: 'Sign In',
      name: 'Name',
      email: 'Email',
      lastLogin: 'Last Login',
      joinDate: 'Join Date',
      vipStatus: 'VIP Status',
      vipExpiry: 'Expires on',
      vipActive: 'Active',
      vipInactive: 'Inactive',
      credits: 'Credits',
      totalUsage: 'Total Usage',
      buyCredits: 'Buy Credits',
      upgradeToVIP: 'Upgrade to VIP',
      date: 'Date',
      amount: 'Amount',
      type: 'Type',
      status: 'Status',
      pointsAdded: 'Points Added',
      noTransactions: 'No transactions yet',
      subscriptionDetails: 'Subscription Details',
      subscriptionId: 'Subscription ID',
      subscriptionStatus: 'Status',
      planType: 'Plan',
      startDate: 'Start Date',
      nextBilling: 'Next Billing',
      cancelSubscription: 'Cancel Subscription',
      managedThroughPaddle: 'Your subscription is managed through Paddle',
      noSubscription: 'You don\'t have an active subscription',
      noUsageRecords: 'No usage records yet',
      usageType: 'Usage Type',
      pointsUsed: 'Points Used',
      description: 'Description',
      subscriptionType: 'Subscription',
      oneTimeType: 'One-time Purchase',
      cancelAutoRenewal: 'Cancel Auto-renewal',
      resumeAutoRenewal: 'Resume Auto-renewal',
      processing: 'Processing...',
      autoRenewalDisabled: 'Auto-renewal Disabled',
      autoRenewalEnabled: 'Auto-renewal Enabled',
      autoRenewalDisabledDesc: 'Your subscription will not renew automatically. You will continue to enjoy all VIP benefits until the end of the current billing period.',
      autoRenewalEnabledDesc: 'Your subscription will now renew automatically at the end of each billing period.',
      cancelFailed: 'Cancellation Failed',
      cancelFailedDesc: 'Error canceling subscription',
      resumeFailed: 'Resume Failed',
      resumeFailedDesc: 'Error resuming subscription',
      confirmCancelTitle: 'Cancel Auto-renewal?',
      confirmCancelDesc: 'After cancelling auto-renewal, your subscription will stop at the end of the current billing period. You will continue to enjoy all VIP benefits until then. After the billing period ends, you will revert to a free user.',
      confirmResumeTitle: 'Resume Auto-renewal?',
      confirmResumeDesc: 'By resuming auto-renewal, your subscription will automatically renew at the end of each billing period, and your payment method will be charged accordingly.',
      back: 'Back',
      confirmCancel: 'Confirm Cancellation',
      confirmResume: 'Confirm Resume',
      cancelled: 'Cancelled',
      letterGeneration: 'Letter Generation',
      templateUnlock: 'Template Unlock',
      credits10: '10 Credits Pack',
      credits100: '100 Credits Pack',
      credits500: '500 Credits Pack',
      credits1000: '1000 Credits Pack'
    },
    zh: {
      title: '账户管理',
      accountInfo: '账户信息',
      membership: '会员与点数',
      transactions: '交易记录',
      usageHistory: '使用记录',
      loading: '正在加载您的账户信息...',
      noSession: '请登录以查看您的账户',
      signIn: '登录',
      name: '姓名',
      email: '邮箱',
      lastLogin: '上次登录',
      joinDate: '注册日期',
      vipStatus: 'VIP 状态',
      vipExpiry: '到期日期',
      vipActive: '已激活',
      vipInactive: '未激活',
      credits: '点数余额',
      totalUsage: '总使用量',
      buyCredits: '购买点数',
      upgradeToVIP: '升级为 VIP',
      date: '日期',
      amount: '金额',
      type: '类型',
      status: '状态',
      pointsAdded: '增加点数',
      noTransactions: '暂无交易记录',
      subscriptionDetails: '订阅详情',
      subscriptionId: '订阅 ID',
      subscriptionStatus: '状态',
      planType: '计划',
      startDate: '开始日期',
      nextBilling: '下次扣费',
      cancelSubscription: '取消订阅',
      managedThroughPaddle: '您的订阅通过 Paddle 管理',
      noSubscription: '您没有活跃的订阅',
      noUsageRecords: '暂无使用记录',
      usageType: '使用类型',
      pointsUsed: '使用点数',
      description: '描述',
      subscriptionType: '订阅',
      oneTimeType: '一次性购买',
      cancelAutoRenewal: '取消自动续费',
      resumeAutoRenewal: '恢复自动续费',
      processing: '处理中...',
      autoRenewalDisabled: '订阅已设置为不自动续费',
      autoRenewalEnabled: '订阅已设置为自动续费',
      autoRenewalDisabledDesc: '您的订阅已成功取消自动续费，但在当前计费周期结束前，您仍然可以享受所有VIP特权。',
      autoRenewalEnabledDesc: '您的订阅将在每个计费周期结束时自动续费。',
      cancelFailed: '取消失败',
      cancelFailedDesc: '取消订阅时出错',
      resumeFailed: '恢复失败',
      resumeFailedDesc: '恢复订阅时出错',
      confirmCancelTitle: '确认取消自动续费？',
      confirmCancelDesc: '取消自动续费后，您的订阅将在当前计费周期结束后停止。在此期间，您仍然可以享受所有VIP特权。计费周期结束后，您将恢复为免费用户。',
      confirmResumeTitle: '确认恢复自动续费？',
      confirmResumeDesc: '恢复自动续费后，您的订阅将在每个计费周期结束时自动续费，并且您的支付方式将相应地被扣款。',
      back: '返回',
      confirmCancel: '确认取消自动续费',
      confirmResume: '确认恢复自动续费',
      cancelled: '已取消',
      letterGeneration: '生成情书',
      templateUnlock: '解锁模板',
      credits10: '10点数包',
      credits100: '100点数包',
      credits500: '500点数包',
      credits1000: '1000点数包'
    }
  }

  const t = content[language as keyof typeof content]

  // 获取用户信息
  const { data: userInfo, error: userError } = useSWR<UserInfo>(
    mounted && session?.user?.id ? '/api/user/info' : null,
    fetcher('/api/user/info', language)
  )

  // 获取交易记录
  const { data: transactions } = useSWR<Transaction[]>(
    mounted && session?.user?.id ? '/api/user/transactions' : null,
    fetcher('/api/user/transactions', language)
  )

  // 获取订阅信息
  const { data: subscription, mutate: mutateSubscription } = useSWR<Subscription | null>(
    mounted && session?.user?.id ? '/api/user/subscription' : null,
    fetcher('/api/user/subscription', language)
  )

  // 获取使用记录
  const { data: usageRecords } = useSWR<UsageRecord[]>(
    mounted && session?.user?.id ? '/api/user/usage' : null,
    fetcher('/api/user/usage', language)
  )

  // 处理升级为 VIP
  const handleUpgradeToVIP = () => {
    try {
      // 检查 Paddle 是否已加载
      if (!window.Paddle || !window.Paddle.Checkout) {
        throw new Error(language === 'en' 
          ? 'Payment system is not available. Please try again later.' 
          : '支付系统暂不可用，请稍后再试。'
        )
      }
      
      openSubscriptionCheckout()
      
      // 显示提示信息
      toast({
        title: language === 'en' ? 'Processing payment' : '正在处理支付',
        description: language === 'en' 
          ? 'Please complete the payment process.' 
          : '请完成支付流程。',
      })
      
      // 30秒后自动刷新页面，以确保能看到最新状态
      setTimeout(() => {
        window.location.reload()
      }, 30000)
    } catch (error) {
      console.error('Failed to open checkout:', error)
      toast({
        title: language === 'en' ? 'Error' : '错误',
        description: error instanceof Error 
          ? error.message 
          : (language === 'en' 
              ? 'Failed to open payment window. Please try again.' 
              : '打开支付窗口失败，请重试。'),
        variant: 'destructive'
      })
    }
  }

  // 格式化日期
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString(language === 'en' ? 'en-US' : 'zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  // 修改取消订阅的处理函数
  const handleCancelSubscription = async () => {
    try {
      setIsCancelling(true);
      const response = await fetch('/api/user/subscription/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      
      if (response.ok) {
        // 显示成功消息
        toast({
          title: t.autoRenewalDisabled,
          description: data.warning ? `${t.autoRenewalDisabledDesc} ${data.warning}` : t.autoRenewalDisabledDesc,
          variant: 'default',
        });
        
        // 刷新订阅数据
        mutateSubscription();
        
        // 增加一个延迟，然后再查询一次订阅数据，以确保UI更新
        setTimeout(() => {
          mutateSubscription();
        }, 2000);
      } else {
        // 显示错误消息
        console.error('取消订阅失败:', data);
        toast({
          title: t.cancelFailed,
          description: data.error || t.cancelFailedDesc,
          variant: 'destructive',
        });
      }
    } catch (error) {
      // 处理网络错误等
      console.error('取消订阅请求出错:', error);
      toast({
        title: t.cancelFailed,
        description: t.cancelFailedDesc,
        variant: 'destructive',
      });
    } finally {
      setIsCancelling(false);
      setIsCancelDialogOpen(false);
    }
  };

  // 添加恢复订阅的处理函数
  const handleResumeSubscription = async () => {
    try {
      setIsResuming(true);
      const response = await fetch('/api/user/subscription/resume', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      
      if (response.ok) {
        // 显示成功消息
        toast({
          title: t.autoRenewalEnabled,
          description: data.warning ? `${t.autoRenewalEnabledDesc} ${data.warning}` : t.autoRenewalEnabledDesc,
          variant: 'default',
        });
        
        // 刷新订阅数据
        mutateSubscription();
        
        // 增加一个延迟，然后再查询一次订阅数据，以确保UI更新
        setTimeout(() => {
          mutateSubscription();
        }, 2000);
      } else {
        // 显示错误消息
        console.error('恢复订阅失败:', data);
        toast({
          title: t.resumeFailed,
          description: data.error || t.resumeFailedDesc,
          variant: 'destructive',
        });
      }
    } catch (error) {
      // 处理网络错误等
      console.error('恢复订阅请求出错:', error);
      toast({
        title: t.resumeFailed,
        description: t.resumeFailedDesc,
        variant: 'destructive',
      });
    } finally {
      setIsResuming(false);
      setIsResumeDialogOpen(false);
    }
  };

  // 如果未登录，显示提示
  if (!session && mounted) {
    return (
      <div className="flex flex-col min-h-screen">
        <div className="fixed inset-0 z-0 opacity-30 bg-gradient-to-br from-rose-500/10 via-purple-500/10 to-blue-500/10" />
        <Nav />
        <main className="flex-1 relative z-10">
          <div className="container max-w-4xl mx-auto px-4 py-8 flex flex-col items-center">
            <motion.h1 
              className={`text-4xl font-bold mb-8 text-center bg-gradient-to-r from-[#738fbd] via-[#db88a4] to-[#cc8eb1] bg-clip-text text-transparent ${language === 'en' ? 'font-serif' : 'font-serif-zh'}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              {t.title}
            </motion.h1>
            <motion.div 
              className="text-center p-8 bg-white/5 backdrop-blur-sm rounded-xl border border-gray-200/20 shadow-lg"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <p className="mb-4">{t.noSession}</p>
              <Button 
                asChild
                className="bg-gradient-to-r from-[#738fbd] to-[#cc8eb1] hover:opacity-90 rounded-full px-6"
              >
                <Link href="/auth/signin">{t.signIn}</Link>
              </Button>
            </motion.div>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  // 加载中状态
  if (!userInfo && !userError) {
    return (
      <div className="flex flex-col min-h-screen">
        <div className="fixed inset-0 z-0 opacity-30 bg-gradient-to-br from-rose-500/10 via-purple-500/10 to-blue-500/10" />
        <Nav />
        <main className="flex-1 relative z-10">
          <div className="container max-w-4xl mx-auto px-4 py-8">
            <motion.h1 
              className={`text-4xl font-bold mb-8 text-center bg-gradient-to-r from-[#738fbd] via-[#db88a4] to-[#cc8eb1] bg-clip-text text-transparent ${language === 'en' ? 'font-serif' : 'font-serif-zh'}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              {t.title}
            </motion.h1>
            <motion.div 
              className="max-w-4xl mx-auto"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center gap-2 mb-4">
                  <div className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-2 h-2 rounded-full bg-primary animate-bounce"></div>
                </div>
                <p className="text-gray-500">{t.loading}</p>
              </div>
              <LoadingSkeleton />
            </motion.div>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Nav />
      <main className="flex-1">
        <div className="container py-6 md:py-12">
          <motion.h1 
            className={`text-4xl font-bold mb-8 text-center bg-gradient-to-r from-[#738fbd] via-[#db88a4] to-[#cc8eb1] bg-clip-text text-transparent ${language === 'en' ? 'font-serif' : 'font-serif-zh'}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {t.title}
          </motion.h1>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Tabs defaultValue="accountInfo" className="w-full">
              <TabsList className="grid grid-cols-4 mb-8 p-1 bg-white/10 backdrop-blur-sm rounded-xl">
                <TabsTrigger value="accountInfo" className="rounded-lg data-[state=active]:bg-white/80 data-[state=active]:text-gray-800 data-[state=active]:shadow-sm">
                  {t.accountInfo}
                </TabsTrigger>
                <TabsTrigger value="membership" className="rounded-lg data-[state=active]:bg-white/80 data-[state=active]:text-gray-800 data-[state=active]:shadow-sm">
                  {t.membership}
                </TabsTrigger>
                <TabsTrigger value="transactions" className="rounded-lg data-[state=active]:bg-white/80 data-[state=active]:text-gray-800 data-[state=active]:shadow-sm">
                  {t.transactions}
                </TabsTrigger>
                <TabsTrigger value="usageHistory" className="rounded-lg data-[state=active]:bg-white/80 data-[state=active]:text-gray-800 data-[state=active]:shadow-sm">
                  {t.usageHistory}
                </TabsTrigger>
              </TabsList>
              
              {/* 账户信息选项卡 */}
              <TabsContent value="accountInfo">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-sm rounded-xl overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-[#738fbd]/10 to-[#cc8eb1]/10 border-b border-gray-100">
                      <CardTitle>{t.accountInfo}</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                      {userInfo && (
                        <div className="space-y-6">
                          <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
                            <div className="h-24 w-24 rounded-full overflow-hidden bg-gray-100 flex-shrink-0 ring-4 ring-white shadow-lg">
                              {userInfo.image && (
                                <img 
                                  src={userInfo.image} 
                                  alt={userInfo.name} 
                                  className="h-full w-full object-cover" 
                                  referrerPolicy="no-referrer"
                                />
                              )}
                            </div>
                            <div className="space-y-2 flex-1">
                              <h3 className="text-xl font-medium">{userInfo.name}</h3>
                              <p className="text-gray-500">{userInfo.email}</p>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-4 rounded-lg border border-gray-100 bg-gray-50/60 hover:bg-white hover:shadow-sm transition-all duration-300">
                              <p className="text-sm text-gray-500">{t.lastLogin}</p>
                              <p className="font-medium">{formatDate(userInfo.lastLoginAt)}</p>
                            </div>
                            <div className="p-4 rounded-lg border border-gray-100 bg-gray-50/60 hover:bg-white hover:shadow-sm transition-all duration-300">
                              <p className="text-sm text-gray-500">{t.joinDate}</p>
                              <p className="font-medium">{formatDate(userInfo.createdAt)}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              </TabsContent>
              
              {/* 会员与点数选项卡 */}
              <TabsContent value="membership">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-sm rounded-xl overflow-hidden mb-6">
                    <CardHeader className="bg-gradient-to-r from-[#738fbd]/10 to-[#cc8eb1]/10 border-b border-gray-100">
                      <CardTitle>{t.membership}</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                      {userInfo && (
                        <div className="space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-5 rounded-lg border border-gray-100 bg-gray-50/60 hover:bg-white hover:shadow-sm transition-all duration-300">
                              <p className="text-sm text-gray-500">{t.vipStatus}</p>
                              <div className="flex items-center mt-1">
                                <p className={`text-lg font-medium ${userInfo.isVIP ? 'text-green-500' : 'text-gray-400'}`}>
                                  {userInfo.isVIP ? t.vipActive : t.vipInactive}
                                </p>
                                {userInfo.isVIP && userInfo.vipExpiresAt && (
                                  <p className="ml-2 text-sm text-gray-500">
                                    ({t.vipExpiry} {formatDate(userInfo.vipExpiresAt)})
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="p-5 rounded-lg border border-gray-100 bg-gray-50/60 hover:bg-white hover:shadow-sm transition-all duration-300">
                              <p className="text-sm text-gray-500">{t.credits}</p>
                              <p className="text-3xl font-medium text-gray-800">{userInfo.credits}</p>
                            </div>
                          </div>
                          
                          <div className="p-5 rounded-lg border border-gray-100 bg-gray-50/60 hover:bg-white hover:shadow-sm transition-all duration-300">
                            <p className="text-sm text-gray-500">{t.totalUsage}</p>
                            <p className="text-xl font-medium text-gray-800">{userInfo.totalUsage}</p>
                          </div>
                          
                          <div className="flex flex-wrap gap-3">
                            {!userInfo.isVIP && (
                              <Button onClick={handleUpgradeToVIP} className="bg-gradient-to-r from-[#738fbd] to-[#cc8eb1] hover:opacity-90 text-white rounded-full px-6 shadow-md">
                                {t.upgradeToVIP}
                              </Button>
                            )}
                            <Button asChild variant="outline" className="border-[#cc8eb1]/30 hover:bg-[#cc8eb1]/5 rounded-full px-6">
                              <Link href="/pricing">{language === 'en' ? 'Purchase Credits' : '购买点数'}</Link>
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                
                {subscription && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.1 }}
                  >
                    <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-sm rounded-xl overflow-hidden">
                      <CardHeader className="bg-gradient-to-r from-[#738fbd]/10 to-[#cc8eb1]/10 border-b border-gray-100">
                        <CardTitle>{t.subscriptionDetails}</CardTitle>
                        <CardDescription>{t.managedThroughPaddle}</CardDescription>
                      </CardHeader>
                      <CardContent className="pt-6">
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-4 rounded-lg border border-gray-100 bg-gray-50/60 hover:bg-white hover:shadow-sm transition-all duration-300">
                              <p className="text-sm text-gray-500">{t.subscriptionId}</p>
                              <p className="font-medium truncate">{subscription.paddleSubscriptionId}</p>
                            </div>
                            <div className="p-4 rounded-lg border border-gray-100 bg-gray-50/60 hover:bg-white hover:shadow-sm transition-all duration-300">
                              <p className="text-sm text-gray-500">{t.subscriptionStatus}</p>
                              <p className={`font-medium ${subscription.status === 'active' ? 'text-green-500' : 'text-yellow-500'}`}>
                                {subscription.status}
                              </p>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-4 rounded-lg border border-gray-100 bg-gray-50/60 hover:bg-white hover:shadow-sm transition-all duration-300">
                              <p className="text-sm text-gray-500">{t.startDate}</p>
                              <p className="font-medium">{formatDate(subscription.startedAt)}</p>
                            </div>
                            {subscription.nextBillingAt && (
                              <div className="p-4 rounded-lg border border-gray-100 bg-gray-50/60 hover:bg-white hover:shadow-sm transition-all duration-300">
                                <p className="text-sm text-gray-500">{t.nextBilling}</p>
                                <p className="font-medium">
                                  {subscription.canceledAt ? (
                                    <span className="text-amber-500">{t.cancelled}</span>
                                  ) : (
                                    formatDate(subscription.nextBillingAt)
                                  )}
                                </p>
                              </div>
                            )}
                          </div>
                          
                          {/* 修改订阅取消按钮 */}
                          {subscription.status === 'active' && !subscription.canceledAt && (
                            <div className="mt-6 flex justify-end">
                              <Button 
                                variant="outline" 
                                className="text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600"
                                onClick={() => setIsCancelDialogOpen(true)}
                                disabled={isCancelling}
                              >
                                {isCancelling ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    {t.processing}
                                  </>
                                ) : (
                                  t.cancelAutoRenewal
                                )}
                              </Button>
                            </div>
                          )}

                          {/* 添加恢复订阅按钮 */}
                          {subscription.status === 'active' && subscription.canceledAt && (
                            <div className="mt-6 flex justify-end">
                              <Button 
                                variant="outline" 
                                className="text-green-500 border-green-200 hover:bg-green-50 hover:text-green-600"
                                onClick={() => setIsResumeDialogOpen(true)}
                                disabled={isResuming}
                              >
                                {isResuming ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    {t.processing}
                                  </>
                                ) : (
                                  t.resumeAutoRenewal
                                )}
                              </Button>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
                
                {userInfo && userInfo.isVIP && !subscription && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.1 }}
                  >
                    <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-sm rounded-xl overflow-hidden">
                      <CardHeader className="bg-gradient-to-r from-[#738fbd]/10 to-[#cc8eb1]/10 border-b border-gray-100">
                        <CardTitle>{t.subscriptionDetails}</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-6">
                        <p>{t.noSubscription}</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
                </motion.div>
              </TabsContent>
              
              {/* 交易记录选项卡 */}
              <TabsContent value="transactions">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-sm rounded-xl overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-[#738fbd]/10 to-[#cc8eb1]/10 border-b border-gray-100">
                      <CardTitle>{t.transactions}</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                      {!transactions || transactions.length === 0 ? (
                        <p className="text-center py-8 text-gray-500">{t.noTransactions}</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b border-gray-200 bg-gray-50/60">
                                <th className="text-left p-3 font-medium text-gray-600">{t.date}</th>
                                <th className="text-left p-3 font-medium text-gray-600">{t.type}</th>
                                <th className="text-left p-3 font-medium text-gray-600">{t.amount}</th>
                                <th className="text-left p-3 font-medium text-gray-600">{t.status}</th>
                                <th className="text-left p-3 font-medium text-gray-600">{t.pointsAdded}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {transactions?.map((transaction) => (
                                <tr key={transaction.id} className="border-b border-gray-100 hover:bg-gray-50/70 transition-colors duration-150">
                                  <td className="p-3">{formatDate(transaction.createdAt)}</td>
                                  <td className="p-3">
                                    {transaction.type === 'subscription_payment' 
                                      ? t.subscriptionType 
                                      : transaction.type === 'credits_10'
                                        ? t.credits10
                                        : transaction.type === 'credits_100'
                                          ? t.credits100
                                          : transaction.type === 'credits_500'
                                            ? t.credits500
                                            : transaction.type === 'credits_1000'
                                              ? t.credits1000
                                              : t.oneTimeType
                                    }
                                  </td>
                                  <td className="p-3">
                                    {(transaction.amount / 100).toFixed(2)} {transaction.currency}
                                  </td>
                                  <td className="p-3">
                                    <span className={`px-2 py-1 rounded-full text-xs ${
                                      transaction.status === 'completed' ? 'bg-green-100 text-green-800' : 
                                      transaction.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                                      'bg-red-100 text-red-800'
                                    }`}>
                                      {transaction.status}
                                    </span>
                                  </td>
                                  <td className="p-3">{transaction.pointsAdded && transaction.pointsAdded > 0 ? transaction.pointsAdded : '-'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              </TabsContent>
              
              {/* 使用记录选项卡 */}
              <TabsContent value="usageHistory">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-sm rounded-xl overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-[#738fbd]/10 to-[#cc8eb1]/10 border-b border-gray-100">
                      <CardTitle>{t.usageHistory}</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                      {!usageRecords || usageRecords.length === 0 ? (
                        <p className="text-center py-8 text-gray-500">{t.noUsageRecords}</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b border-gray-200 bg-gray-50/60">
                                <th className="text-left p-3 font-medium text-gray-600">{t.date}</th>
                                <th className="text-left p-3 font-medium text-gray-600">{t.usageType}</th>
                                <th className="text-left p-3 font-medium text-gray-600">{t.pointsUsed}</th>
                                <th className="text-left p-3 font-medium text-gray-600">{t.description}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {usageRecords?.map((record) => (
                                <tr key={record.id} className="border-b border-gray-100 hover:bg-gray-50/70 transition-colors duration-150">
                                  <td className="p-3">{formatDate(record.createdAt)}</td>
                                  <td className="p-3">
                                    <div className="flex items-center gap-1.5">
                                      {record.type === (language === 'en' ? 'Letter Generation' : '生成情书') ? (
                                        <PenLine className="h-4 w-4 text-blue-500" />
                                      ) : record.type === (language === 'en' ? 'Template Unlock' : '解锁模板') ? (
                                        <Brush className="h-4 w-4 text-purple-500" />
                                      ) : (
                                        <Sparkles className="h-4 w-4 text-amber-500" />
                                      )}
                                      <span>{record.type}</span>
                                    </div>
                                  </td>
                                  <td className="p-3">
                                    <span className={`flex items-center ${record.pointsUsed > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
                                      {record.pointsUsed > 0 ? record.pointsUsed : '-'}
                                      {record.pointsUsed > 0 && <Sparkles className="h-3 w-3 ml-1" />}
                                    </span>
                                  </td>
                                  <td className="p-3">{record.description}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              </TabsContent>
            </Tabs>
          </motion.div>
        </div>
      </main>
      <Footer />

      {/* 修改确认对话框 */}
      <AlertDialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t.confirmCancelTitle}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t.confirmCancelDesc}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCancelling}>
              {t.back}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleCancelSubscription();
              }}
              disabled={isCancelling}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              {isCancelling ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t.processing}
                </>
              ) : (
                t.confirmCancel
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* 恢复订阅对话框 */}
      <AlertDialog open={isResumeDialogOpen} onOpenChange={setIsResumeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.confirmResumeTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.confirmResumeDesc}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isResuming}>{t.back}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleResumeSubscription();
              }}
              disabled={isResuming}
              className="bg-green-600 hover:bg-green-700"
            >
              {isResuming ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t.processing}
                </>
              ) : (
                t.confirmResume
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Paddle Script */}
      <PaddleScript />
    </div>
  )
} 