'use client'

// 添加全局类型声明，确保TypeScript识别window.Paddle
declare global {
  interface Window {
    Paddle: any;
  }
}

import PaddleScript from '@/components/PaddleScript';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import html2canvas from 'html2canvas';
import { Download, Home, LogIn } from 'lucide-react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ImagePreviewDialog } from './ImagePreviewDialog';
import { LoginDialog } from './LoginDialog'; // 导入LoginDialog组件
import { StyleDrawer } from './StyleDrawer';

interface Letter {
  id: string
  content: string
  imageUrl: string
  status: 'pending' | 'generating' | 'completed' | 'failed'
  metadata?: {
    name: string
    loverName: string
    story: string
    orientation: number
    isAnonymous?: boolean
  }
}

// 添加模板常量
const TEMPLATES = {
  classic: {
    name: 'Classic Dark',
    style: {
      width: 1200,
      padding: 80,
      background: 'linear-gradient(135deg, #000000 0%, #1a1a1a 50%, #000000 100%)',
      titleFont: '"Cormorant Garamond", serif',
      contentFont: '"Cormorant Garamond", serif',
    },
    isFree: true // 免费模板
  },
  postcard: {
    name: 'Postcard',
    style: {
      width: 1200,
      padding: 60,
      background: 'linear-gradient(to right, #f9f7f7 0%, #ffffff 100%)',
      titleFont: '"Playfair Display", serif',
      contentFont: '"Cormorant Garamond", serif',
    },
    isFree: true // 免费模板
  },
  magazine: {
    name: 'Magazine',
    style: {
      width: 1200,
      padding: 80,
      background: 'linear-gradient(135deg, #ffffff 0%, #f5f5f5 100%)',
      titleFont: '"Playfair Display", serif',
      contentFont: '"Cormorant Garamond", serif',
    },
    isFree: true // 免费模板
  },
  artisan: {
    name: 'Artisan Red',
    style: {
      width: 1200,
      padding: 60,
      background: 'url(/images/artisan-red-bg.jpg) no-repeat center center / cover',
      titleFont: '"Source Serif Pro", serif',
      contentFont: '"Source Serif Pro", serif',
    },
    isFree: false // 需要VIP或解锁
  },
  natural: {
    name: 'Natural Parchment',
    style: {
      width: 1173,
      padding: 49,
      background: 'url(/images/natural-bg.jpg) no-repeat center center / cover',
      titleFont: '"Source Serif Pro", serif',
      contentFont: '"Source Serif Pro", serif',
    },
    isFree: false // 需要VIP或解锁
  },
  darkWine: {
    name: 'Dark Wine',
    style: {
      width: 1173,
      padding: 49,
      background: 'url(/images/dark-wine-bg.jpg) no-repeat center center / cover',
      titleFont: '"Source Serif Pro", serif',
      contentFont: '"Source Serif Pro", serif',
    },
    isFree: false // 需要VIP或解锁
  },
  paperMemo: {
    name: 'Paper Memoir',
    style: {
      width: 1173,
      padding: 49,
      background: 'url(/images/annie-spratt-fDghTk7Typw-unsplash.jpg) no-repeat center center / cover',
      titleFont: '"Source Serif Pro", serif',
      contentFont: '"Source Serif Pro", serif',
    },
    isFree: false // 需要VIP或解锁
  },
  oceanBreeze: {
    name: 'Ocean Breeze',
    style: {
      width: 1173,
      padding: 49,
      background: 'url(/images/pawel-czerwinski-YUGf6Hs1F3A-unsplash.jpg) no-repeat center center / cover',
      titleFont: '"Source Serif Pro", serif',
      contentFont: '"Source Serif Pro", serif',
    },
    isFree: false // 需要VIP或解锁
  },
  darkCrimson: {
    name: 'Dark Crimson',
    style: {
      width: 1173,
      padding: 49,
      background: 'url(/images/sufyan-eRpeXTJEgMw-unsplash.jpg) no-repeat center center / cover',
      titleFont: '"Source Serif Pro", serif',
      contentFont: '"Source Serif Pro", serif',
    },
    isFree: false // 需要VIP或解锁
  },
  purpleDream: {
    name: 'Purple Dream',
    style: {
      width: 1173,
      padding: 49,
      background: 'url(/images/efe-kurnaz-RnCPiXixooY-unsplash.jpg) no-repeat center center / cover',
      titleFont: '"Source Serif Pro", serif',
      contentFont: '"Source Serif Pro", serif',
    },
    isFree: false // 需要VIP或解锁
  },
  elegantPaper: {
    name: 'Elegant Paper',
    style: {
      width: 1173,
      padding: 49,
      background: 'url(/images/lunelle-B-9i06FP0SI-unsplash.jpg) no-repeat center center / cover',
      titleFont: '"Source Serif Pro", serif',
      contentFont: '"Source Serif Pro", serif',
    },
    isFree: false // 需要VIP或解锁
  },
  roseParchment: {
    name: 'Rose Parchment',
    style: {
      width: 1173,
      padding: 49,
      background: 'url(/images/andrei-j-castanha-V8GVT2XQ5oc-unsplash.jpg) no-repeat center center / cover',
      titleFont: '"Source Serif Pro", serif',
      contentFont: '"Source Serif Pro", serif',
    },
    isFree: false // 需要VIP或解锁
  }
}

export default function AnonymousLetterResults({ id, isAnonymous = false }: { id: string, isAnonymous?: boolean }) {
  const router = useRouter()
  const { language } = useLanguage()
  const [letter, setLetter] = useState<Letter | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<keyof typeof TEMPLATES>('classic')
  const [isGenerating, setIsGenerating] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [showStyleDrawer, setShowStyleDrawer] = useState(false)
  const [unlockedTemplates, setUnlockedTemplates] = useState<string[]>([])
  const [isVIP, setIsVIP] = useState(false)
  const [_userCredits, setUserCredits] = useState(0) // 标记为未使用但仍然保留setter
  const [checkingVipStatus, setCheckingVipStatus] = useState(false)
  // 添加水印控制状态
  const [hideWatermark, setHideWatermark] = useState(false)
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)
  const [searchParams, setSearchParams] = useState<URLSearchParams | null>(null)
  const { data: session, status } = useSession()
  const [isClaimingAfterLogin, setIsClaimingAfterLogin] = useState(false)
  const [isSavingAnonymous, setIsSavingAnonymous] = useState(false)

  // 设置URL搜索参数
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setSearchParams(new URLSearchParams(window.location.search));
    }
  }, []);

  // 检查登录后回调（匿名信件认领）
  useEffect(() => {
    // 如果已登录且URL包含callbackParam=claimLetter，则自动认领信件
    if (isAnonymous && status === 'authenticated' && searchParams?.get('callbackParam') === 'claimLetter') {
      console.log('[DEBUG] 检测到登录回调，准备认领匿名信件:', id);
      
      // 延迟一点时间再执行保存，确保session完全加载
      const timer = setTimeout(() => {
        saveAnonymousLetter();
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [status, searchParams, isAnonymous, id]);

  // 获取信件内容
  useEffect(() => {
    async function fetchLetter() {
      setIsLoading(true)
      let retryCount = 0;
      const maxRetries = 3;
      
      const attemptFetch = async () => {
        try {
          // 根据是否为匿名信件选择不同的API端点
          const apiUrl = isAnonymous 
            ? `/api/anonymous/letters/${id}`
            : `/api/letters/${id}`
  
          console.log(`[DEBUG] 开始获取信件 (匿名: ${isAnonymous}): ${apiUrl}`)
          const res = await fetch(apiUrl)
          
          if (!res.ok) {
            // 服务器错误，可能需要重试
            if (res.status >= 500 && retryCount < maxRetries) {
              retryCount++;
              console.log(`[DEBUG] 服务器错误 (${res.status})，第 ${retryCount} 次重试...`);
              // 指数退避策略，延迟增加
              await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount - 1)));
              return attemptFetch();
            }
            
            // 客户端错误或重试次数用尽
            const errorText = await res.text();
            throw new Error(`API错误 (${res.status}): ${errorText}`);
          }
          
          // 解析响应
          let data;
          try {
            const text = await res.text();
            data = text ? JSON.parse(text) : {};
          } catch (parseError) {
            console.error('[DEBUG] 解析响应失败:', parseError);
            
            // 如果解析失败且未达到最大重试次数，重试
            if (retryCount < maxRetries) {
              retryCount++;
              console.log(`[DEBUG] 解析失败，第 ${retryCount} 次重试...`);
              await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount - 1)));
              return attemptFetch();
            }
            
            throw new Error('无法解析API响应');
          }
  
          if (!data.letter) {
            throw new Error('API响应中缺少信件数据');
          }
  
          console.log(`[DEBUG] 信件内容获取成功:`, data.letter)
          
          // 确保匿名信件的状态被设置为completed
          if (isAnonymous && data.letter) {
            console.log('[DEBUG] 检查匿名信件状态')
            
            // 只要信件有内容，无论状态如何，都强制设置为completed
            if (data.letter.content && data.letter.content.trim()) {
              console.log('[DEBUG] 信件有内容，强制设置状态为completed')
              setLetter({
                ...data.letter,
                status: 'completed'  // 强制匿名信件状态为completed
              })
            } else if (data.letter.status === 'completed') {
              // 状态已经是completed但可能没有内容
              console.log('[DEBUG] 信件状态为completed，保持状态')
              setLetter(data.letter)
            } else {
              // 没有内容且状态不是completed
              console.log('[DEBUG] 信件没有内容且状态不是completed:', data.letter.status)
              setLetter(data.letter)
            }
          } else {
            setLetter(data.letter)
          }
          
          // 加载成功，清除loading状态
          setIsLoading(false)
        } catch (error) {
          console.error('[FETCH_LETTER_ERROR]', error)
          
          // 如果是网络错误且未达到最大重试次数，重试
          if (error instanceof TypeError && error.message.includes('network') && retryCount < maxRetries) {
            retryCount++;
            console.log(`[DEBUG] 网络错误，第 ${retryCount} 次重试...`);
            await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount - 1)));
            return attemptFetch();
          }
          
          // 所有重试都失败或不需要重试的错误
          toast({
            title: 'Error',
            description: 'Failed to fetch letter details',
            variant: 'destructive',
          })
          setIsLoading(false)
        }
      };
      
      // 开始尝试获取
      await attemptFetch();
    }

    fetchLetter()
  }, [id, isAnonymous])

  // 添加轮询机制，定期检查匿名信件状态
  useEffect(() => {
    // 只有在匿名信件且状态不是"completed"或"failed"时才启动轮询
    if (!isAnonymous || !letter) return;
    
    // 如果信件已经有内容或状态已经是completed或failed，不需要轮询
    if (letter.content && letter.content.trim() || 
        letter.status === 'completed' || 
        letter.status === 'failed') {
      return;
    }
    
    console.log('[DEBUG] 启动匿名信件状态轮询检查，当前状态:', letter.status);
    
    // 记录重试次数
    let retryCount = 0;
    const maxRetries = 40; // 从20增加到40，延长总轮询时间
    
    // 定义查询函数
    const checkLetterStatus = async () => {
      try {
        const apiUrl = `/api/anonymous/letters/${id}`;
        const res = await fetch(apiUrl);
        
        if (!res.ok) {
          // 如果请求失败，增加重试计数
          retryCount++;
          console.warn(`[DEBUG] 轮询请求失败，状态码: ${res.status}，重试次数: ${retryCount}/${maxRetries}`);
          
          // 如果超过最大重试次数，停止轮询，显示错误
          if (retryCount >= maxRetries) {
            console.error('[DEBUG] 已达到最大重试次数，停止轮询');
            setLetter(prev => ({
              ...prev!,
              status: 'failed'
            }));
            
            toast({
              title: language === 'en' ? 'Connection Error' : '连接错误',
              description: language === 'en' 
                ? 'Unable to retrieve letter status. Please try refreshing the page.' 
                : '无法获取信件状态，请尝试刷新页面。',
              variant: 'destructive',
            });
            
            return;
          }
          
          return;
        }
        
        try {
          // 请求成功，重置重试计数
          retryCount = 0;
          
          const data = await res.json();
          console.log(`[DEBUG] 轮询获取信件状态:`, data.letter?.status, '内容长度:', data.letter?.content?.length || 0);
          
          // 如果服务端信件有内容或状态是completed，更新本地状态
          if (data.letter && (data.letter.status === 'completed' || (data.letter.content && data.letter.content.trim()))) {
            console.log('[DEBUG] 匿名信件已完成或有内容，更新状态');
            setLetter({
              ...data.letter,
              status: 'completed'  // 强制设为completed
            });
          } 
          // 如果状态是failed，也更新本地状态
          else if (data.letter && data.letter.status === 'failed') {
            console.log('[DEBUG] 匿名信件生成失败');
            setLetter({
              ...data.letter,
              status: 'failed'
            });
          }
        } catch (parseError) {
          console.error('[DEBUG] 解析轮询响应出错:', parseError);
          retryCount++;
        }
      } catch (error) {
        // 如果捕获到错误，增加重试计数
        retryCount++;
        console.error('[POLL_LETTER_ERROR]', error, `重试次数: ${retryCount}/${maxRetries}`);
        
        // 如果超过最大重试次数，停止轮询，显示错误
        if (retryCount >= maxRetries) {
          console.error('[DEBUG] 已达到最大重试次数，停止轮询');
          setLetter(prev => ({
            ...prev!,
            status: 'failed'
          }));
          
          toast({
            title: language === 'en' ? 'Connection Error' : '连接错误',
            description: language === 'en' 
              ? 'Unable to retrieve letter status. Please try refreshing the page.' 
              : '无法获取信件状态，请尝试刷新页面。',
            variant: 'destructive',
          });
        }
      }
    };
    
    // 立即检查一次
    checkLetterStatus();
    
    // 设置轮询间隔
    const intervalId = setInterval(checkLetterStatus, 3000); // 每3秒检查一次
    
    // 清理函数
    return () => {
      clearInterval(intervalId);
    };
  }, [id, letter, isAnonymous, language]);

  // 或者，当检测到信件有内容但状态不是completed时，强制更新状态
  useEffect(() => {
    if (isAnonymous && letter && letter.content && letter.status !== 'completed') {
      console.log('[DEBUG] 匿名信件有内容但状态不是completed，强制更新状态');
      setLetter(prev => ({
        ...prev!,
        status: 'completed'
      }));
    }
  }, [letter, isAnonymous]);

  // 获取用户信息，包括积分和VIP状态
  useEffect(() => {
    // 只有在用户已登录的情况下才获取用户信息
    if (status !== 'authenticated') return;

    const fetchUserInfo = async () => {
      try {
        const res = await fetch('/api/user/credits')
        if (!res.ok) return
        
        const data = await res.json()
        setUserCredits(data.credits)
        setIsVIP(data.isVIP)
      } catch (error) {
        console.error('[FETCH_CREDITS_ERROR]', error)
      }
    }

    // 定期检查VIP状态
    const checkVipStatus = () => {
      if (checkingVipStatus) {
        fetchUserInfo().then(() => {
          // 延迟重新检查
          setTimeout(checkVipStatus, 10000) // 每10秒检查一次
        })
      }
    }

    // 获取已解锁的模板
    const fetchUnlockedTemplates = async () => {
      if (!id) return
      
      try {
        const res = await fetch(`/api/user/unlock-template/check?letterId=${id}`)
        if (!res.ok) return
        
        const data = await res.json()
        setUnlockedTemplates(data.unlockedTemplates || [])
      } catch (error) {
        console.error('[FETCH_UNLOCKED_TEMPLATES_ERROR]', error)
      }
    }

    // 立即获取用户信息和已解锁模板
    fetchUserInfo()
    fetchUnlockedTemplates()

    // 开始检查VIP状态
    const startVipCheck = () => {
      console.log('开始检查VIP状态')
      setCheckingVipStatus(true)
      checkVipStatus()
      
      // 30秒后停止检查
      setTimeout(() => {
        setCheckingVipStatus(false)
        // 最后再检查一次，确保获取最新状态
        fetchUserInfo()
      }, 30000)
    }

    // 监听订阅成功事件
    window.addEventListener('subscription:success', startVipCheck)

    return () => {
      setCheckingVipStatus(false)
      window.removeEventListener('subscription:success', startVipCheck)
    }
  }, [id, checkingVipStatus, status])

  // 处理模板变更 - 从StyleDrawer组件调用
  const handleTemplateChange = (template: string) => {
    const targetTemplate = TEMPLATES[template as keyof typeof TEMPLATES]
    
    // 检查模板是否可用（免费模板可直接使用，非免费则引导登录）
    if (targetTemplate.isFree) {
      setSelectedTemplate(template as keyof typeof TEMPLATES)
    } else {
      // 匿名模式下引导用户登录
      setShowLoginPrompt(true);
    }
  }
  
  // 处理水印切换 - 从StyleDrawer组件调用
  const handleWatermarkToggle = (hide: boolean) => {
    if (isVIP) {
      // VIP用户可以直接隐藏水印
      setHideWatermark(hide);
    } else if (hide) {
      // 非VIP用户点击时显示登录引导
      setShowLoginPrompt(true);
    }
  }

  // 切换抽屉显示状态
  const toggleStyleDrawer = () => {
    setShowStyleDrawer(!showStyleDrawer)
  }

  // 如果是新创建的信件，自动开始生成
  useEffect(() => {
    if (!letter) return
    if (letter.status === 'completed' && letter.content) return
    // 移除这一行，允许匿名信件也触发生成
    // if (isAnonymous) return

    const generateContent = async () => {
      try {
        // 根据是否为匿名信件选择不同的API端点
        const apiUrl = isAnonymous 
          ? `/api/anonymous/letters/${letter.id}/generate` 
          : `/api/letters/${letter.id}/generate`;
          
        console.log(`[DEBUG] 开始生成信件内容，API: ${apiUrl}`);
        
        const response = await fetch(apiUrl, {
          method: 'POST',
          credentials: 'include',
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || data.details || 'Failed to generate content')
        }

        if (!data.content) {
          throw new Error('No content received from server')
        }

        console.log('[DEBUG] 内容生成成功，更新信件状态');
        
        // 更新信件内容
        setLetter(prev => ({
          ...prev!,
          content: data.content,
          status: 'completed',
        }))
      } catch (error) {
        console.error('[GENERATE_ERROR]', error)
        setLetter(prev => ({
          ...prev!,
          status: 'failed',
        }))
        toast({
          title: 'Error',
          description: 'Failed to generate letter content',
          variant: 'destructive',
        })
      }
    }

    console.log(`[DEBUG] 检查是否需要生成内容: 状态=${letter.status}, 内容长度=${letter.content?.length || 0}`);
    
    // 只有在状态是pending或generating且没有内容时才触发生成
    if (letter.status === 'pending' || letter.status === 'generating' || !letter.content) {
      console.log('[DEBUG] 触发内容生成');
      generateContent()
    }
  }, [letter, isAnonymous])

  // 保存为图片功能
  const saveAsImage = async () => {
    if (!contentRef.current || isSaving) return
    
    // 如果是匿名模式且用户未登录，显示登录弹窗
    if (isAnonymous && !session) {
      setShowLoginPrompt(true);
      return;
    }
    
    try {
      setIsSaving(true)
      setIsGenerating(true)
      
      const template = TEMPLATES[selectedTemplate]
      const tempContainer = document.createElement('div')
      tempContainer.style.position = 'absolute'
      tempContainer.style.left = '-9999px'
      tempContainer.style.width = `${template.style.width}px`
      document.body.appendChild(tempContainer)
      
      // 根据不同模板创建内容
      tempContainer.innerHTML = await generateTemplateHtml(letter, template.style, language, selectedTemplate)

      // 生成图片
      const canvas = await html2canvas(tempContainer, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: template.style.background.startsWith('#') 
          ? template.style.background 
          : '#000000',
        logging: false,
      })

      // 清理临时容器
      document.body.removeChild(tempContainer)

      // 获取图片 URL
      const image = canvas.toDataURL('image/png', 1.0)
      setPreviewImage(image)
      
      if (!showPreview) {
        setShowPreview(true)
      }
    } catch (error) {
      console.error('Error generating image:', error)
      toast({
        title: "Error",
        description: "Failed to generate image. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
      setIsSaving(false)
    }
  }

  // 添加模板 HTML 生成函数
  const generateTemplateHtml = async (
    letter: Letter | null, 
    style: typeof TEMPLATES[keyof typeof TEMPLATES]['style'],
    language: string,
    templateType: keyof typeof TEMPLATES = 'classic'
  ) => {
    if (!letter) return ''

    // 根据语言选择字体
    const fontFamily = language === 'zh' ? style.contentFont + ', "Noto Serif SC"' : style.contentFont

    switch (templateType) {
      case 'postcard':
        return `
          <div style="
            width: ${style.width}px;
            min-height: ${style.width * 0.75}px;
            padding: ${style.padding}px;
            background: ${style.background};
            position: relative;
            font-family: ${fontFamily};
            color: #2c3e50;
            display: flex;
            flex-direction: column;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            border-radius: 12px;
            overflow: hidden;
          ">
            <div style="
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              height: 8px;
              background: linear-gradient(90deg, #738fbd, #cc8eb1);
            "></div>

            ${letter.imageUrl ? `
              <div style="
                margin: 20px 0 40px;
                border-radius: 8px;
                overflow: hidden;
                box-shadow: 0 8px 24px rgba(0,0,0,0.1);
              ">
                <img 
                  src="${letter.imageUrl}" 
                  style="
                    width: 100%;
                    height: auto;
                    display: block;
                    transform: scale(1.01);
                  "
                  crossorigin="anonymous"
                />
              </div>
            ` : ''}

            <div style="
              font-size: 24px;
              line-height: 1.8;
              color: #2c3e50;
              font-style: italic;
              text-align: justify;
              position: relative;
              padding: 40px;
              background: rgba(255,255,255,0.8);
              border-radius: 8px;
              box-shadow: 0 4px 12px rgba(0,0,0,0.05);
            ">
              <div style="
                position: absolute;
                top: 20px;
                left: 20px;
                font-size: 60px;
                line-height: 1;
                color: #738fbd;
                opacity: 0.2;
                font-family: Georgia, serif;
              ">"</div>
              ${letter.content?.split('\n').filter(p => p.trim()).join('<br><br>')}
              <div style="
                position: absolute;
                bottom: 20px;
                right: 20px;
                font-size: 60px;
                line-height: 1;
                color: #cc8eb1;
                opacity: 0.2;
                font-family: Georgia, serif;
              ">"</div>
            </div>

            <div style="
              margin-top: 40px;
              text-align: center;
              font-size: 16px;
              color: #666;
              font-style: italic;
              height: 35px;
              display: flex;
              justify-content: center;
            ">
              ${getWatermarkHTML('light')}
            </div>
          </div>
        `

      case 'magazine':
        return `
          <div style="
            width: ${style.width}px;
            min-height: ${style.width * 0.75}px;
            padding: ${style.padding}px;
            background: ${style.background};
            font-family: ${style.contentFont};
            color: #333;
            position: relative;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            border-radius: 12px;
            overflow: hidden;
          ">
            ${letter.imageUrl ? `
              <div style="
                margin-bottom: 60px;
                position: relative;
              ">
                <img 
                  src="${letter.imageUrl}" 
                  style="
                    width: 100%;
                    height: auto;
                    display: block;
                    border-radius: 8px;
                    box-shadow: 0 12px 36px rgba(0,0,0,0.15);
                  "
                  crossorigin="anonymous"
                />
              </div>
            ` : ''}

            <div style="
              column-count: 2;
              column-gap: 60px;
              font-size: 22px;
              line-height: 1.8;
              text-align: justify;
              padding: 40px;
              background: white;
              border-radius: 12px;
              box-shadow: 0 4px 12px rgba(0,0,0,0.05);
            ">${letter.content?.split('\n').filter(p => p.trim()).join('<br><br>')}</div>

            <div style="
              margin-top: 40px;
              text-align: center;
              font-size: 16px;
              color: #666;
              font-style: italic;
              height: 35px;
              display: flex;
              justify-content: center;
            ">
              ${getWatermarkHTML('light')}
            </div>
          </div>
        `

      case 'artisan':
        return `
          <div style="
            width: ${style.width}px;
            min-height: ${style.width * 0.75}px;
            padding: ${style.padding}px;
            background-image: url('/images/artisan-red-bg.jpg');
            background-size: cover;
            background-position: center;
            position: relative;
            font-family: ${fontFamily};
            color: #B00702;
            display: flex;
            flex-direction: column;
            box-shadow: 0 20px 40px rgba(0,0,0,0.2);
            border-radius: 12px;
            overflow: hidden;
          ">
            ${letter.imageUrl ? `
              <div style="
                margin: 20px 0 40px;
                border-radius: 8px;
                overflow: hidden;
                box-shadow: 0 8px 24px rgba(0,0,0,0.2);
              ">
                <img 
                  src="${letter.imageUrl}" 
                  style="
                    width: 100%;
                    height: auto;
                    display: block;
                    transform: scale(1.01);
                  "
                  crossorigin="anonymous"
                />
              </div>
            ` : ''}

            <div style="
              font-size: 22px;
              line-height: 1.8;
              color: #B00702;
              font-style: italic;
              text-align: justify;
              position: relative;
              padding: 40px;
              background: #CFCFCC;
              border-radius: 8px;
              box-shadow: 0 4px 12px rgba(176, 7, 2, 0.1);
              margin: 0 10px;
            ">
              <div style="
                position: absolute;
                top: 20px;
                left: 20px;
                font-size: 60px;
                line-height: 1;
                color: #B00702;
                opacity: 0.2;
                font-family: Georgia, serif;
              ">"</div>
              ${letter.content?.split('\n').filter(p => p.trim()).join('<br><br>')}
              <div style="
                position: absolute;
                bottom: 20px;
                right: 20px;
                font-size: 60px;
                line-height: 1;
                color: #B00702;
                opacity: 0.2;
                font-family: Georgia, serif;
              ">"</div>
            </div>

            <div style="
              margin-top: 40px;
              text-align: center;
              font-size: 16px;
              color: #666;
              font-style: italic;
              height: 35px;
              display: flex;
              justify-content: center;
            ">
              ${getWatermarkHTML('light')}
            </div>
          </div>
        `;

      case 'natural':
        return `
          <div style="
            width: ${style.width}px;
            min-height: ${style.width * 0.75}px;
            padding: ${style.padding}px;
            background-image: url('/images/natural-bg.jpg');
            background-size: cover;
            background-position: center;
            position: relative;
            font-family: ${fontFamily};
            color: #5E4027;
            display: flex;
            flex-direction: column;
            box-shadow: 0 20px 40px rgba(0,0,0,0.2);
            border-radius: 12px;
            overflow: hidden;
          ">
            ${letter.imageUrl ? `
              <div style="
                margin: 20px 0 40px;
                border-radius: 8px;
                overflow: hidden;
                box-shadow: 0 8px 24px rgba(0,0,0,0.2);
              ">
                <img 
                  src="${letter.imageUrl}" 
                  style="
                    width: 100%;
                    height: auto;
                    display: block;
                    transform: scale(1.01);
                  "
                  crossorigin="anonymous"
                />
              </div>
            ` : ''}

            <div style="
              font-size: 22px;
              line-height: 1.8;
              color: #5E4027;
              font-style: normal;
              text-align: justify;
              position: relative;
              padding: 40px;
              background: #FFFFF2;
              border-radius: 8px;
              box-shadow: 0 4px 12px rgba(94, 64, 39, 0.1);
              margin: 0 10px;
            ">
              ${letter.content?.split('\n').filter(p => p.trim()).join('<br><br>')}
            </div>

            <div style="
              margin-top: 40px;
              text-align: center;
              font-size: 16px;
              color: #666;
              font-style: italic;
              height: 35px;
              display: flex;
              justify-content: center;
            ">
              ${getWatermarkHTML('light')}
            </div>
          </div>
        `;

      case 'darkWine':
        return `
          <div style="
            width: ${style.width}px;
            min-height: ${style.width * 0.75}px;
            padding: ${style.padding}px;
            background-image: url('/images/dark-wine-bg.jpg');
            background-size: cover;
            background-position: center;
            position: relative;
            font-family: ${fontFamily};
            color: #F4F4F4;
            display: flex;
            flex-direction: column;
            box-shadow: 0 20px 40px rgba(0,0,0,0.2);
            border-radius: 12px;
            overflow: hidden;
          ">
            ${letter.imageUrl ? `
              <div style="
                margin: 20px 0 40px;
                border-radius: 8px;
                overflow: hidden;
                box-shadow: 0 8px 24px rgba(0,0,0,0.2);
              ">
                <img 
                  src="${letter.imageUrl}" 
                  style="
                    width: 100%;
                    height: auto;
                    display: block;
                    transform: scale(1.01);
                  "
                  crossorigin="anonymous"
                />
              </div>
            ` : ''}

            <div style="
              font-size: 22px;
              line-height: 1.8;
              color: #F4F4F4;
              font-style: normal;
              text-align: justify;
              position: relative;
              padding: 40px;
              background: #430311;
              border-radius: 8px;
              box-shadow: 0 4px 12px rgba(244, 244, 244, 0.1);
              margin: 0 10px;
            ">
              ${letter.content?.split('\n').filter(p => p.trim()).join('<br><br>')}
            </div>

            <div style="
              margin-top: 40px;
              text-align: center;
              font-size: 16px;
              color: #666;
              font-style: italic;
              height: 35px;
              display: flex;
              justify-content: center;
            ">
              ${getWatermarkHTML('dark')}
            </div>
          </div>
        `;

      case 'paperMemo':
        return `
          <div style="
            width: ${style.width}px;
            min-height: ${style.width * 0.75}px;
            padding: ${style.padding}px;
            background-image: url('/images/annie-spratt-fDghTk7Typw-unsplash.jpg');
            background-size: cover;
            background-position: center;
            position: relative;
            font-family: ${fontFamily};
            color: #151212;
            display: flex;
            flex-direction: column;
            box-shadow: 0 20px 40px rgba(0,0,0,0.2);
            border-radius: 12px;
            overflow: hidden;
          ">
            ${letter.imageUrl ? `
              <div style="
                margin: 20px 0 40px;
                border-radius: 8px;
                overflow: hidden;
                box-shadow: 0 8px 24px rgba(0,0,0,0.2);
              ">
                <img 
                  src="${letter.imageUrl}" 
                  style="
                    width: 100%;
                    height: auto;
                    display: block;
                    transform: scale(1.01);
                  "
                  crossorigin="anonymous"
                />
              </div>
            ` : ''}

            <div style="
              font-size: 22px;
              line-height: 1.8;
              color: #151212;
              font-style: normal;
              text-align: justify;
              position: relative;
              padding: 40px;
              background: #C9C9C9;
              border-radius: 8px;
              box-shadow: 0 4px 12px rgba(21, 18, 18, 0.1);
              margin: 0 10px;
            ">
              ${letter.content?.split('\n').filter(p => p.trim()).join('<br><br>')}
            </div>

            <div style="
              margin-top: 40px;
              text-align: center;
              font-size: 16px;
              color: #666;
              font-style: italic;
              height: 35px;
              display: flex;
              justify-content: center;
            ">
              ${getWatermarkHTML('light')}
            </div>
          </div>
        `;

      case 'oceanBreeze':
        return `
          <div style="
            width: ${style.width}px;
            min-height: ${style.width * 0.75}px;
            padding: ${style.padding}px;
            background-image: url('/images/pawel-czerwinski-YUGf6Hs1F3A-unsplash.jpg');
            background-size: cover;
            background-position: center;
            position: relative;
            font-family: ${fontFamily};
            color: #0B5A6B;
            display: flex;
            flex-direction: column;
            box-shadow: 0 20px 40px rgba(0,0,0,0.2);
            border-radius: 12px;
            overflow: hidden;
          ">
            ${letter.imageUrl ? `
              <div style="
                margin: 20px 0 40px;
                border-radius: 8px;
                overflow: hidden;
                box-shadow: 0 8px 24px rgba(0,0,0,0.2);
              ">
                <img 
                  src="${letter.imageUrl}" 
                  style="
                    width: 100%;
                    height: auto;
                    display: block;
                    transform: scale(1.01);
                  "
                  crossorigin="anonymous"
                />
              </div>
            ` : ''}

            <div style="
              font-size: 22px;
              line-height: 1.8;
              color: #0B5A6B;
              font-style: normal;
              text-align: justify;
              position: relative;
              padding: 40px;
              background: #F5F5EF;
              border-radius: 8px;
              box-shadow: 0 4px 12px rgba(11, 90, 107, 0.1);
              margin: 0 10px;
            ">
              ${letter.content?.split('\n').filter(p => p.trim()).join('<br><br>')}
            </div>

            <div style="
              margin-top: 40px;
              text-align: center;
              font-size: 16px;
              color: #666;
              font-style: italic;
              height: 35px;
              display: flex;
              justify-content: center;
            ">
              ${getWatermarkHTML('light')}
            </div>
          </div>
        `;

      case 'darkCrimson':
        return `
          <div style="
            width: ${style.width}px;
            min-height: ${style.width * 0.75}px;
            padding: ${style.padding}px;
            background-image: url('/images/sufyan-eRpeXTJEgMw-unsplash.jpg');
            background-size: cover;
            background-position: center;
            position: relative;
            font-family: ${fontFamily};
            color: #FF1100;
            display: flex;
            flex-direction: column;
            box-shadow: 0 20px 40px rgba(0,0,0,0.2);
            border-radius: 12px;
            overflow: hidden;
          ">
            ${letter.imageUrl ? `
              <div style="
                margin: 20px 0 40px;
                border-radius: 8px;
                overflow: hidden;
                box-shadow: 0 8px 24px rgba(0,0,0,0.2);
              ">
                <img 
                  src="${letter.imageUrl}" 
                  style="
                    width: 100%;
                    height: auto;
                    display: block;
                    transform: scale(1.01);
                  "
                  crossorigin="anonymous"
                />
              </div>
            ` : ''}

            <div style="
              font-size: 22px;
              line-height: 1.8;
              color: #FF1100;
              font-style: normal;
              text-align: justify;
              position: relative;
              padding: 40px;
              background: #000000;
              border-radius: 8px;
              box-shadow: 0 4px 12px rgba(255, 17, 0, 0.1);
              margin: 0 10px;
            ">
              ${letter.content?.split('\n').filter(p => p.trim()).join('<br><br>')}
            </div>

            <div style="
              margin-top: 40px;
              text-align: center;
              font-size: 16px;
              color: #666;
              font-style: italic;
              height: 35px;
              display: flex;
              justify-content: center;
            ">
              ${getWatermarkHTML('dark')}
            </div>
          </div>
        `;

      case 'purpleDream':
        return `
          <div style="
            width: ${style.width}px;
            min-height: ${style.width * 0.75}px;
            padding: ${style.padding}px;
            background-image: url('/images/efe-kurnaz-RnCPiXixooY-unsplash.jpg');
            background-size: cover;
            background-position: center;
            position: relative;
            font-family: ${fontFamily};
            color: #E83DEE;
            display: flex;
            flex-direction: column;
            box-shadow: 0 20px 40px rgba(0,0,0,0.2);
            border-radius: 12px;
            overflow: hidden;
          ">
            ${letter.imageUrl ? `
              <div style="
                margin: 20px 0 40px;
                border-radius: 8px;
                overflow: hidden;
                box-shadow: 0 8px 24px rgba(0,0,0,0.2);
              ">
                <img 
                  src="${letter.imageUrl}" 
                  style="
                    width: 100%;
                    height: auto;
                    display: block;
                    transform: scale(1.01);
                  "
                  crossorigin="anonymous"
                />
              </div>
            ` : ''}

            <div style="
              font-size: 22px;
              line-height: 1.8;
              color: #E83DEE;
              font-style: normal;
              text-align: justify;
              position: relative;
              padding: 40px;
              background: #E7F5F9;
              border-radius: 8px;
              box-shadow: 0 4px 12px rgba(232, 61, 238, 0.1);
              margin: 0 10px;
            ">
              ${letter.content?.split('\n').filter(p => p.trim()).join('<br><br>')}
            </div>

            <div style="
              margin-top: 40px;
              text-align: center;
              font-size: 16px;
              color: #666;
              font-style: italic;
              height: 35px;
              display: flex;
              justify-content: center;
            ">
              ${getWatermarkHTML('dark')}
            </div>
          </div>
        `;

      case 'elegantPaper':
        return `
          <div style="
            width: ${style.width}px;
            min-height: ${style.width * 0.75}px;
            padding: ${style.padding}px;
            background-image: url('/images/lunelle-B-9i06FP0SI-unsplash.jpg');
            background-size: cover;
            background-position: center;
            position: relative;
            font-family: ${fontFamily};
            color: #E75C31;
            display: flex;
            flex-direction: column;
            box-shadow: 0 20px 40px rgba(0,0,0,0.2);
            border-radius: 12px;
            overflow: hidden;
          ">
            ${letter.imageUrl ? `
              <div style="
                margin: 20px 0 40px;
                border-radius: 8px;
                overflow: hidden;
                box-shadow: 0 8px 24px rgba(0,0,0,0.2);
              ">
                <img 
                  src="${letter.imageUrl}" 
                  style="
                    width: 100%;
                    height: auto;
                    display: block;
                    transform: scale(1.01);
                  "
                  crossorigin="anonymous"
                />
              </div>
            ` : ''}

            <div style="
              font-size: 22px;
              line-height: 1.8;
              color: #E75C31;
              font-style: normal;
              text-align: justify;
              position: relative;
              padding: 40px;
              background: #EFE9DB;
              border-radius: 8px;
              box-shadow: 0 4px 12px rgba(231, 92, 49, 0.1);
              margin: 0 10px;
            ">
              ${letter.content?.split('\n').filter(p => p.trim()).join('<br><br>')}
            </div>

            <div style="
              margin-top: 40px;
              text-align: center;
              font-size: 16px;
              color: #666;
              font-style: italic;
              height: 35px;
              display: flex;
              justify-content: center;
            ">
              ${getWatermarkHTML('light')}
            </div>
          </div>
        `;

      case 'roseParchment':
        return `
          <div style="
            width: ${style.width}px;
            min-height: ${style.width * 0.75}px;
            padding: ${style.padding}px;
            background-image: url('/images/andrei-j-castanha-V8GVT2XQ5oc-unsplash.jpg');
            background-size: cover;
            background-position: center;
            position: relative;
            font-family: ${fontFamily};
            color: #E358A2;
            display: flex;
            flex-direction: column;
            box-shadow: 0 20px 40px rgba(0,0,0,0.2);
            border-radius: 12px;
            overflow: hidden;
          ">
            ${letter.imageUrl ? `
              <div style="
                margin: 20px 0 40px;
                border-radius: 8px;
                overflow: hidden;
                box-shadow: 0 8px 24px rgba(0,0,0,0.2);
              ">
                <img 
                  src="${letter.imageUrl}" 
                  style="
                    width: 100%;
                    height: auto;
                    display: block;
                    transform: scale(1.01);
                  "
                  crossorigin="anonymous"
                />
              </div>
            ` : ''}

            <div style="
              font-size: 22px;
              line-height: 1.8;
              color: #E358A2;
              font-style: normal;
              text-align: justify;
              position: relative;
              padding: 40px;
              background: #FAEFDA;
              border-radius: 8px;
              box-shadow: 0 4px 12px rgba(227, 88, 162, 0.1);
              margin: 0 10px;
            ">
              ${letter.content?.split('\n').filter(p => p.trim()).join('<br><br>')}
            </div>

            <div style="
              margin-top: 40px;
              text-align: center;
              font-size: 16px;
              color: #666;
              font-style: italic;
              height: 35px;
              display: flex;
              justify-content: center;
            ">
              ${getWatermarkHTML('light')}
            </div>
          </div>
        `;

      default: // classic
        return `
          <div style="
            width: ${style.width}px;
            min-height: ${style.width * 0.75}px;
            padding: ${style.padding}px;
            background: ${style.background};
            color: white;
            font-family: ${fontFamily};
            position: relative;
            box-shadow: 0 20px 40px rgba(0,0,0,0.3);
            border-radius: 12px;
            overflow: hidden;
          ">
            <div style="
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              background: radial-gradient(circle at top right, rgba(115,143,189,0.1), transparent 70%),
                          radial-gradient(circle at bottom left, rgba(204,142,177,0.1), transparent 70%);
            "></div>

            ${letter.imageUrl ? `
              <div style="
                margin: 40px 0;
                border-radius: 16px;
                overflow: hidden;
                box-shadow: 0 12px 36px rgba(0,0,0,0.3);
                position: relative;
              ">
                <div style="
                  position: absolute;
                  inset: 0;
                  background: linear-gradient(to bottom, transparent 80%, rgba(0,0,0,0.2));
                  pointer-events: none;
                "></div>
                <img 
                  src="${letter.imageUrl}" 
                  style="
                    width: 100%;
                    height: auto;
                    display: block;
                    transform: scale(1.01);
                  "
                  crossorigin="anonymous"
                />
              </div>
            ` : ''}

            <div style="
              font-size: 24px;
              line-height: 1.8;
              color: rgba(255,255,255,0.9);
              font-style: italic;
              text-align: justify;
              padding: 60px;
              background: rgba(255,255,255,0.05);
              border-radius: 16px;
              border: 1px solid rgba(255,255,255,0.1);
              position: relative;
              backdrop-filter: blur(10px);
            ">
              <div style="
                position: absolute;
                top: 20px;
                left: 20px;
                width: 40px;
                height: 40px;
                border-left: 2px solid rgba(115,143,189,0.3);
                border-top: 2px solid rgba(115,143,189,0.3);
              "></div>
              ${letter.content?.split('\n').filter(p => p.trim()).join('<br><br>')}
              <div style="
                position: absolute;
                bottom: 20px;
                right: 20px;
                width: 40px;
                height: 40px;
                border-right: 2px solid rgba(204,142,177,0.3);
                border-bottom: 2px solid rgba(204,142,177,0.3);
              "></div>
            </div>

            <div style="
              margin-top: 40px;
              text-align: center;
              font-size: 16px;
              font-style: italic;
              color: rgba(255,255,255,0.5);
              height: 35px;
              display: flex;
              justify-content: center;
            ">
              ${getWatermarkHTML('dark')}
            </div>
          </div>
        `
    }
  }

  // 获取水印HTML
  const getWatermarkHTML = (type: 'light' | 'dark') => {
    if (hideWatermark) return '';
    return `<img src="/watermark-${type}.svg" style="height: 35px;" alt="watermark" />`;
  }

  // 下载图片
  const downloadImage = () => {
    if (!previewImage) return
    
    // 如果是匿名模式且用户未登录，显示登录弹窗
    if (isAnonymous && !session) {
      setShowLoginPrompt(true);
      return;
    }
    
    const link = document.createElement('a')
    link.download = `love-letter-${id}.png`
    link.href = previewImage
    link.click()
    
    toast({
      title: "Success",
      description: "Your letter has been downloaded!",
    })
  }

  // 保存匿名信件到用户账户
  const saveAnonymousLetter = async () => {
    if (!session) {
      // 显示登录弹窗，而不是直接调用signIn
      setShowLoginPrompt(true);
      return;
    }

    // 显示保存状态
    setIsSavingAnonymous(true);
    console.log('[DEBUG] 开始保存匿名信件到用户账户:', id);
    
    // 其余逻辑保持不变
    try {
      // 将匿名信件认领到用户账户
      const res = await fetch('/api/anonymous/claim-letter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ letterId: id }),
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error('[API_ERROR]', res.status, errorText);
        throw new Error(`Failed to save letter: ${res.status} ${errorText}`);
      }
      
      const data = await res.json();
      console.log('[DEBUG] 匿名信件保存成功，获取到新ID:', data.newLetterId);
      
      // 显示成功提示
      toast({
        title: language === 'en' ? 'Successfully saved' : '保存成功',
        description: language === 'en' 
          ? 'Letter has been saved to your account and is no longer anonymous' 
          : '信件已保存到您的账户，不再是匿名信件',
      });
      
      // 保存成功后重定向到常规结果页（使用新的letterId）
      if (data.newLetterId) {
        console.log(`[DEBUG] 匿名信件认领成功，跳转到常规结果页: /result/${data.newLetterId}`);
        
        // 修改：在跳转前等待一段时间，确保数据同步完成
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // 设置localStorage标记，告知结果页这是从匿名信件跳转过来的
        localStorage.setItem('from_anonymous_claim', 'true');
        
        // 使用replace而不是push，防止浏览器回退到匿名页面
        // 添加查询参数，表明是从匿名信件保存跳转过来的
        router.replace(`/result/${data.newLetterId}?from=anonymous_save&t=${Date.now()}`);
      }
    } catch (error) {
      console.error('[SAVE_ANONYMOUS_LETTER_ERROR]', error);
      toast({
        title: language === 'en' ? 'Save failed' : '保存失败',
        description: language === 'en' ? 'Failed to save letter to your account, please try again' : '无法将信件保存到您的账户，请重试',
        variant: 'destructive',
      });
      
      // 隐藏全屏加载
      setIsClaimingAfterLogin(false);
    } finally {
      // 延迟关闭保存状态，确保用户看到过渡效果
      setTimeout(() => {
        setIsSavingAnonymous(false);
      }, 500);
    }
  };

  // 检查登录状态变化，处理自动认领
  useEffect(() => {
    // 仅当用户登录后执行
    if (status === 'authenticated' && session?.user) {
      console.log('[DEBUG] 用户已登录，检查是否需要认领匿名信件');
      
      // 检查是否有待认领的信件
      try {
        const letterIdToClaim = localStorage.getItem('anonymous_letter_to_claim');
        
        // 确保有信件ID且与当前信件匹配
        if (letterIdToClaim && letterIdToClaim === id) {
          console.log('[DEBUG] 发现待认领的匿名信件:', letterIdToClaim);
          
          // 移除存储的信件ID
          localStorage.removeItem('anonymous_letter_to_claim');
          
          // 显示全屏加载
          setIsClaimingAfterLogin(true);
          
          // 执行认领流程
          saveAnonymousLetter();
        }
      } catch (err) {
        console.error('[DEBUG] 检查待认领信件时出错:', err);
      }
    }
  }, [status, session, id]);

  // 渲染全屏加载
  const renderFullscreenLoading = () => {
    if (!isSavingAnonymous && !isClaimingAfterLogin) return null;
    
    // 使用Portal确保加载提示显示在最顶层
    return typeof window !== 'undefined' 
      ? createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="bg-gray-900/80 p-8 rounded-lg shadow-xl border border-gray-700 max-w-md w-full text-center">
              <div className="w-16 h-16 border-4 border-t-blue-500 border-blue-500/30 rounded-full animate-spin mx-auto mb-6"></div>
              <h2 className="text-2xl font-bold text-white mb-2">
                {language === 'en' ? 'Saving your letter...' : '正在保存您的信件...'}
              </h2>
              <p className="text-gray-300 text-sm">
                {language === 'en' 
                  ? 'Please wait while we save your letter. This may take a few moments.' 
                  : '正在将您的信件保存到账户，请稍候...'}
              </p>
            </div>
          </div>,
          document.body
        )
      : null;
  };

  // 添加额外的安全措施，确保在初始加载后检查并修正信件状态
  useEffect(() => {
    // 如果不是匿名信件或还在加载中，则不需要这个检查
    if (!isAnonymous || isLoading) return;
    
    // 如果信件为空，可能是还未获取到数据
    if (!letter) return;
    
    // 检查状态：如果信件有内容但状态不是completed，则修正状态
    if (letter.content && letter.content.trim() && letter.status !== 'completed') {
      console.log('[DEBUG] 初始加载后检测到信件有内容但状态不是completed，修正状态');
      setLetter(prev => ({
        ...prev!,
        status: 'completed'
      }));
    }
    
    // 处理信件内容获取超时情况
    if (!letter.content && letter.status === 'generating') {
      console.log('[DEBUG] 检测到信件正在生成中，设置超时检查');
      
      // 设置超时计时器 - 从15秒延长到30秒后检查
      const timeoutId = setTimeout(async () => {
        if (!letter.content && letter.status === 'generating') {
          console.log('[DEBUG] 生成超时，尝试重新获取信件');
          
          try {
            const apiUrl = `/api/anonymous/letters/${id}`;
            const res = await fetch(apiUrl);
            
            if (res.ok) {
              const data = await res.json();
              
              // 更宽容的状态处理
              if (data.letter) {
                if (data.letter.content || data.letter.status === 'completed') {
                  // 如果有内容或状态是completed，立即更新
                  console.log('[DEBUG] 重新获取成功，信件已生成完成');
                  setLetter({
                    ...data.letter,
                    status: 'completed'
                  });
                } else {
                  // 即使没有内容，也先更新状态，再给多一些时间
                  console.log('[DEBUG] 重新获取成功，但内容可能仍在生成');
                  setLetter(data.letter);
                  
                  // 再次延迟检查，最后决定是否失败
                  setTimeout(() => {
                    if (letter?.status === 'generating' && !letter.content) {
                      console.log('[DEBUG] 最终检查仍无内容，标记为失败');
                      setLetter(prev => ({
                        ...prev!,
                        status: 'failed'
                      }));
                      
                      toast({
                        title: language === 'en' ? 'Generation Timeout' : '生成超时',
                        description: language === 'en' 
                          ? 'Letter generation is taking longer than expected. Please refresh the page to check again.' 
                          : '信件生成时间超过预期。请刷新页面重新检查。',
                        variant: 'destructive',
                      });
                    }
                  }, 10000); // 再给10秒钟
                }
              } else if (data.letter && data.letter.status === 'failed') {
                console.log('[DEBUG] 信件生成失败');
                setLetter(data.letter);
              } else {
                console.log('[DEBUG] 重新获取后仍无内容，标记为失败');
                setLetter(prev => ({
                  ...prev!,
                  status: 'failed'
                }));
                
                toast({
                  title: language === 'en' ? 'Error' : '错误',
                  description: language === 'en' 
                    ? 'Failed to generate letter content. Please try refreshing the page.' 
                    : '生成信件内容失败，请尝试刷新页面。',
                  variant: 'destructive',
                });
              }
            } else {
              console.error('[DEBUG] 重新获取请求失败:', res.status);
            }
          } catch (error) {
            console.error('[TIMEOUT_RETRY_ERROR]', error);
          }
        }
      }, 30000); // 从15秒增加到30秒超时
      
      return () => clearTimeout(timeoutId);
    }
  }, [letter, isAnonymous, isLoading, id, language]);

  // 添加自动重试功能，当标记为失败时自动尝试重新加载，但限制最多3次
  useEffect(() => {
    // 获取当前重试次数
    const currentRetryCount = parseInt(sessionStorage.getItem(`retry_count_${id}`) || '0');
    
    if (letter?.status === 'failed' && !letter.content && currentRetryCount < 3) {
      // 增加重试计数
      const newRetryCount = currentRetryCount + 1;
      sessionStorage.setItem(`retry_count_${id}`, newRetryCount.toString());
      
      // 短暂延迟后自动重试
      const retryTimer = setTimeout(() => {
        console.log(`[DEBUG] 自动重试获取信件（第${newRetryCount}/3次）`);
        window.location.reload();
      }, 3000);
      
      return () => clearTimeout(retryTimer);
    }
  }, [letter, id]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black overflow-x-hidden">
        <div className="max-w-[1600px] mx-auto pb-20 px-4 sm:px-6 lg:px-8">
          <div className="relative min-h-screen flex flex-col items-center justify-center py-10">
            <div className="w-full max-w-4xl space-y-12">
              {/* 标题占位 */}
              <div className="h-16 w-96 mx-auto bg-white/5 rounded-lg animate-pulse" />
              
              {/* 图片占位 */}
              <div className="relative h-[50vh] md:h-[60vh] overflow-hidden rounded-xl bg-white/5 animate-pulse" />
              
              {/* 内容占位 */}
              <div className="bg-black/40 backdrop-blur-lg rounded-2xl p-8 md:p-10 shadow-2xl border border-white/10 space-y-4">
                <div className="h-6 bg-white/5 rounded animate-pulse w-[85%]" />
                <div className="h-6 bg-white/5 rounded animate-pulse w-[90%]" />
                <div className="h-6 bg-white/5 rounded animate-pulse w-[80%]" />
                <div className="h-6 bg-white/5 rounded animate-pulse w-[95%]" />
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!letter) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold mb-4 text-white">Letter not found</h1>
        <Button onClick={() => router.push('/')} variant="outline">
          Write a new letter
        </Button>
      </div>
    )
  }

  const paragraphs = letter.content ? letter.content.split('\n').filter(p => p.trim()) : []

  // 添加调试输出
  console.log(`[DEBUG] 当前信件状态: ${letter.status}, 是否匿名: ${isAnonymous}, 是否有内容: ${Boolean(letter.content)}, 是否显示已完成: ${letter.status === 'completed'}`)

  return (
    <>
      {renderFullscreenLoading()}
      <div className={cn(
         "min-h-screen overflow-x-hidden relative",
         selectedTemplate === 'artisan' 
          ? "before:bg-[url('/images/artisan-red-bg.jpg')] before:safari-fixed" 
          : selectedTemplate === 'natural'
            ? "before:bg-[url('/images/natural-bg.jpg')] before:safari-fixed"
            : selectedTemplate === 'darkWine'
              ? "before:bg-[url('/images/dark-wine-bg.jpg')] before:safari-fixed"
              : selectedTemplate === 'paperMemo'
                ? "before:bg-[url('/images/annie-spratt-fDghTk7Typw-unsplash.jpg')] before:safari-fixed"
                : selectedTemplate === 'oceanBreeze'
                  ? "before:bg-[url('/images/pawel-czerwinski-YUGf6Hs1F3A-unsplash.jpg')] before:safari-fixed"
                  : selectedTemplate === 'darkCrimson'
                    ? "before:bg-[url('/images/sufyan-eRpeXTJEgMw-unsplash.jpg')] before:safari-fixed"
                    : selectedTemplate === 'purpleDream'
                      ? "before:bg-[url('/images/efe-kurnaz-RnCPiXixooY-unsplash.jpg')] before:safari-fixed"
                      : selectedTemplate === 'elegantPaper'
                        ? "before:bg-[url('/images/lunelle-B-9i06FP0SI-unsplash.jpg')] before:safari-fixed"
                        : selectedTemplate === 'roseParchment'
                          ? "before:bg-[url('/images/andrei-j-castanha-V8GVT2XQ5oc-unsplash.jpg')] before:safari-fixed"
                          : "bg-gradient-to-b from-black via-gray-900 to-black"
      )}
      style={{
        '--bg-url': `url(${TEMPLATES[selectedTemplate].style.background.includes('url') ? 
          TEMPLATES[selectedTemplate].style.background.match(/url\((.*?)\)/)?.[1] : ''})`
      } as React.CSSProperties}
      >
         {/* 返回首页按钮 */}
         <motion.div
           initial={{ opacity: 0, x: -20 }}
           animate={{ opacity: 1, x: 0 }}
           transition={{ duration: 0.5 }}
           className="fixed top-[14px] left-4 z-50"
         >
           <Link href="/">
             <Button
               variant="ghost"
               size="icon"
               className="h-6 w-6 p-0 text-white/70 hover:text-white hover:bg-transparent"
             >
               <Home className="h-[18px] w-[18px]" />
             </Button>
           </Link>
         </motion.div>

         <div className="max-w-[1600px] mx-auto pb-20 px-4 sm:px-6 lg:px-8">
           <div className="relative min-h-screen">
             {/* 背景效果 */}
             <div className={cn(
               "fixed inset-0",
               // 对带背景图的模板隐藏或减少蒙版不透明度
               TEMPLATES[selectedTemplate].style.background.includes('url')
                 ? "opacity-0" // 带背景图模板不需要额外的蒙版
                 : "opacity-20" // 其他模板保持原有蒙版效果
             )}>
               <div className="absolute inset-0 bg-gradient-to-br from-rose-500/10 via-purple-500/10 to-blue-500/10" />
               {letter.imageUrl && (
                 <Image
                   src={imageError ? '/placeholder.svg' : letter.imageUrl}
                   alt="Background"
                   fill
                   className="filter blur-2xl scale-110 object-cover mix-blend-overlay"
                   priority
                   unoptimized
                 />
               )}
             </div>

             {/* 内容部分 */}
             <div className="relative z-10 min-h-screen flex flex-col items-center justify-center py-10">
               <div className="w-full max-w-4xl">
                 <AnimatePresence mode="wait">
                   <motion.div
                     ref={contentRef}
                     initial={{ opacity: 0, y: 20 }}
                     animate={{ opacity: 1, y: 0 }}
                     transition={{ duration: 0.8, ease: 'easeOut' }}
                     className="space-y-12"
                   >
                     {/* 标题 */}
                     <motion.h1
                       initial={{ opacity: 0, y: -20 }}
                       animate={{ opacity: 1, y: 0 }}
                       transition={{ delay: 0.3, duration: 0.8 }}
                       className={cn(
                         "text-5xl md:text-6xl font-bold text-center font-display tracking-wide",
                         TEMPLATES[selectedTemplate].style.background.includes('url')
                           ? selectedTemplate === 'artisan'
                             ? "text-[#B00702] drop-shadow-[0_1px_2px_rgba(255,255,255,0.5)]"
                             : selectedTemplate === 'natural'
                               ? "text-[#5E4027] drop-shadow-[0_1px_2px_rgba(255,255,255,0.5)]"
                               : selectedTemplate === 'darkWine'
                                 ? "text-[#F4F4F4] drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]"
                                 : selectedTemplate === 'paperMemo'
                                   ? "text-[#151212] drop-shadow-[0_1px_2px_rgba(255,255,255,0.5)]"
                                   : selectedTemplate === 'oceanBreeze'
                                     ? "text-[#0B5A6B] drop-shadow-[0_1px_2px_rgba(173,216,230,0.5)]"
                                     : selectedTemplate === 'darkCrimson'
                                       ? "text-[#FF1100] drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)]"
                                       : selectedTemplate === 'purpleDream'
                                         ? "text-[#E83DEE] drop-shadow-[0_0_12px_rgba(255,105,244,0.6)]"
                                         : selectedTemplate === 'elegantPaper'
                                           ? "text-[#FFFFFF] drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]"
                                           : selectedTemplate === 'roseParchment'
                                             ? "text-[#FFFFFF] drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]"
                                             : "text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.7)]"
                           : "bg-clip-text text-transparent bg-gradient-to-r from-[#738fbd] via-[#db88a4] to-[#cc8eb1]"
                       )}
                     >
                       {language === 'en' ? 'Your Letter' : '您的信件'}
                     </motion.h1>
                     <motion.div
                       className={cn(
                         "mt-8 w-20 h-1 mx-auto", 
                         TEMPLATES[selectedTemplate].style.background.includes('url')
                           ? selectedTemplate === 'artisan'
                             ? "bg-[#B00702]"
                             : selectedTemplate === 'natural'
                               ? "bg-[#5E4027]"
                               : selectedTemplate === 'darkWine'
                                 ? "bg-[#F4F4F4]"
                                 : selectedTemplate === 'paperMemo'
                                   ? "bg-[#151212]"
                                   : selectedTemplate === 'oceanBreeze'
                                     ? "bg-[#0B5A6B]"
                                     : selectedTemplate === 'darkCrimson'
                                       ? "bg-[#FF1100]"
                                       : selectedTemplate === 'purpleDream'
                                         ? "bg-[#E83DEE]"
                                         : selectedTemplate === 'elegantPaper'
                                           ? "bg-[#E75C31]"
                                           : selectedTemplate === 'roseParchment'
                                             ? "bg-[#E358A2]"
                                             : "bg-white/80 shadow-md"
                           : "bg-gradient-to-r from-[#738fbd] to-[#cc8eb1]"
                       )}
                       initial={{ width: 0 }}
                       animate={{ width: 80 }}
                       transition={{ duration: 0.8, delay: 0.5 }}
                     />

                     {/* 图片容器 */}
                     {letter.imageUrl && (
                       <motion.div
                         initial={{ opacity: 0, scale: 0.95 }}
                         animate={{ opacity: 1, scale: 1 }}
                         transition={{ delay: 0.4, duration: 0.8 }}
                       >
                         <div className="relative w-full rounded-xl bg-black/40 overflow-hidden">
                           <div
                             className={cn(
                               'relative w-full pt-[56.25%]', // 16:9 默认比例
                               'max-h-[80vh]', // 最大高度限制
                               'transition-opacity duration-500',
                               imageLoaded ? 'opacity-100' : 'opacity-0'
                             )}
                           >
                             <Image
                               src={imageError ? '/placeholder.svg' : letter.imageUrl}
                               alt="Your special moment"
                               fill
                               className={cn(
                                 'absolute top-0 left-0 w-full h-full object-contain',
                                 letter.metadata?.orientation === 6 && 'rotate-90',
                                 letter.metadata?.orientation === 3 && 'rotate-180',
                                 letter.metadata?.orientation === 8 && '-rotate-90'
                               )}
                               onError={() => setImageError(true)}
                               onLoad={(e) => {
                                 // 获取图片实际尺寸
                                 const img = e.target as HTMLImageElement
                                 const container = img.parentElement
                                 if (container) {
                                   // 计算宽高比
                                   const ratio = img.naturalHeight / img.naturalWidth
                                   // 如果图片高度超过宽度的1.5倍（3:2），则限制高度
                                   if (ratio > 1.5) {
                                     container.style.paddingTop = '150%'
                                   } else {
                                     // 否则使用实际比例
                                     container.style.paddingTop = `${ratio * 100}%`
                                   }
                                 }
                                 setImageLoaded(true)
                               }}
                               priority
                               unoptimized
                               sizes="(max-width: 768px) 100vw, (max-width: 1600px) 80vw, 1280px"
                             />
                           </div>
                         </div>
                       </motion.div>
                     )}

                     {/* 信件内容 */}
                     <motion.div
                       initial={{ opacity: 0 }}
                       animate={{ opacity: 1 }}
                       transition={{ delay: 0.6, duration: 0.8 }}
                       className={cn(
                         "backdrop-blur-lg rounded-2xl p-8 md:p-10 shadow-2xl border transition-all duration-500",
                         selectedTemplate === 'classic' 
                           ? "bg-black/40 border-white/10" 
                           : selectedTemplate === 'postcard'
                             ? "bg-[#f9f7f7]/90 border-black/5"
                             : selectedTemplate === 'artisan'
                               ? "bg-[#CFCFCC] border-[#B00702]/10 relative"
                               : selectedTemplate === 'natural'
                                 ? "bg-[#FFFFF2] border-[#5E4027]/10 relative"
                                 : selectedTemplate === 'darkWine'
                                   ? "bg-[#430311] border-[#F4F4F4]/10 relative"
                                   : selectedTemplate === 'paperMemo'
                                     ? "bg-[#C9C9C9] border-[#151212]/10 relative"
                                     : selectedTemplate === 'oceanBreeze'
                                       ? "bg-[#F5F5EF] border-[#4A90A2]/10 relative"
                                       : selectedTemplate === 'darkCrimson'
                                         ? "bg-[#000000] border-[#FF1100]/20 relative"
                                         : selectedTemplate === 'purpleDream'
                                           ? "bg-[#E7F5F9] border-[#E83DEE]/20 relative"
                                           : selectedTemplate === 'elegantPaper'
                                             ? "bg-[#EFE9DB] border-[#E75C31]/20 relative"
                                             : "bg-white/90 border-black/5" // magazine样式
                       )}
                     >
                       <motion.div 
                         layout
                         transition={{ duration: 0.5, type: "spring", damping: 20 }}
                         className={cn(
                           "prose prose-lg max-w-none transition-all duration-300",
                           selectedTemplate === 'classic' || selectedTemplate === 'darkWine' || selectedTemplate === 'darkCrimson'
                             ? "prose-invert" 
                             : selectedTemplate === 'artisan' || selectedTemplate === 'natural'
                               ? "prose-slate"
                               : "prose-slate",
                           // 杂志模板添加双列布局
                           selectedTemplate === 'magazine' && "sm:columns-2 sm:gap-8"
                         )}
                       >
                         {/* 内容区域的 loading 状态 */}
                         {letter?.status === 'pending' && (
                           <div className="flex items-center justify-center space-x-3 py-8">
                             <div className="w-3 h-3 bg-white/60 rounded-full animate-bounce [animation-delay:-0.3s]" />
                             <div className="w-3 h-3 bg-white/60 rounded-full animate-bounce [animation-delay:-0.15s]" />
                             <div className="w-3 h-3 bg-white/60 rounded-full animate-bounce" />
                           </div>
                         )}

                         {letter?.status === 'generating' && (
                           <div className="flex items-center justify-center space-x-3 py-8">
                             <div className="w-3 h-3 bg-white/60 rounded-full animate-bounce [animation-delay:-0.3s]" />
                             <div className="w-3 h-3 bg-white/60 rounded-full animate-bounce [animation-delay:-0.15s]" />
                             <div className="w-3 h-3 bg-white/60 rounded-full animate-bounce" />
                           </div>
                         )}

                         {letter?.status === 'completed' && (
                           <div className={cn(
                             "transition-all duration-500",
                           )}>
                             {paragraphs.map((paragraph, index) => (
                               <motion.p
                                 key={index}
                                 initial={{ opacity: 0, y: 10 }}
                                 animate={{ opacity: 1, y: 0 }}
                                 transition={{ duration: 0.5, delay: index * 0.1 }}
                                 className={cn(
                                   "font-serif italic leading-relaxed text-lg md:text-xl transition-colors duration-300",
                                   selectedTemplate === 'classic' 
                                     ? "text-gray-100"
                                     : selectedTemplate === 'magazine'
                                       ? "text-gray-900"
                                       : selectedTemplate === 'artisan'
                                         ? "text-[#B00702]"
                                         : selectedTemplate === 'natural'
                                           ? "text-[#5E4027]"
                                           : selectedTemplate === 'darkWine'
                                             ? "text-[#F4F4F4]"
                                             : selectedTemplate === 'paperMemo'
                                               ? "text-[#151212]"
                                               : selectedTemplate === 'oceanBreeze'
                                                 ? "text-[#0B5A6B]"
                                                 : selectedTemplate === 'darkCrimson'
                                                   ? "text-[#FF1100]"
                                                   : selectedTemplate === 'purpleDream'
                                                     ? "text-[#E83DEE]"
                                                     : selectedTemplate === 'elegantPaper'
                                                       ? "text-[#E75C31]"
                                                       : selectedTemplate === 'roseParchment'
                                                         ? "text-[#E358A2]"
                                                         : "text-gray-800"
                                 )}
                                 style={{ 
                                   fontFamily: language === 'zh' 
                                     ? `${TEMPLATES[selectedTemplate].style.contentFont}, "Noto Serif SC", serif`
                                     : TEMPLATES[selectedTemplate].style.contentFont
                                 }}
                               >
                                 {paragraph.trim()}
                               </motion.p>
                             ))}
                           </div>
                         )}
                       </motion.div>
                     </motion.div>

                     {/* 底部状态和按钮 */}
                     <motion.div
                       initial={{ opacity: 0, y: 20 }}
                       animate={{ opacity: 1, y: 0 }}
                       transition={{ delay: 0.8, duration: 0.8 }}
                       className="text-center space-y-6"
                     >
                       {/* 底部状态指示器 */}
                       <motion.div
                         className="flex items-center justify-center"
                         initial={{ opacity: 0 }}
                         animate={{ opacity: 1 }}
                         transition={{ duration: 0.5 }}
                       >
                         {letter.status === 'pending' && (
                           <motion.div
                             className="flex items-center gap-2 px-4 py-2 rounded-lg bg-black/40 backdrop-blur-sm border border-white/20"
                             initial={{ scale: 0.9 }}
                             animate={{ scale: 1 }}
                             transition={{ duration: 0.2 }}
                           >
                             <div className="w-2 h-2 bg-white/60 rounded-full animate-pulse" />
                             <span className="text-white/80 text-sm">
                               {language === 'en' ? 'Creating your letter...' : '正在创建信件...'}
                             </span>
                           </motion.div>
                         )}

                         {letter.status === 'generating' && (
                           <motion.div
                             className="flex items-center gap-2 px-4 py-2 rounded-lg bg-black/40 backdrop-blur-sm border border-white/20"
                             initial={{ scale: 0.9 }}
                             animate={{ scale: 1 }}
                             transition={{ duration: 0.2 }}
                           >
                             <div className="w-2 h-2 bg-white/60 rounded-full animate-pulse" />
                             <span className="text-white/80 text-sm">
                               {language === 'en' ? 'Generating your letter...' : '正在生成信件...'}
                             </span>
                           </motion.div>
                         )}

                         {letter.status === 'completed' && (
                           <motion.div
                             className="flex items-center gap-2 px-4 py-2 rounded-lg bg-black/40 backdrop-blur-sm border border-[#00FF66]/20"
                             initial={{ scale: 0.9, opacity: 0 }}
                             animate={{ scale: 1, opacity: 1 }}
                             transition={{ duration: 0.3, type: 'spring' }}
                           >
                             <div className="w-2 h-2 bg-[#00FF66] rounded-full" />
                             <span className="text-[#00FF66] text-sm">
                               {language === 'en' ? 'Letter completed' : '信件已完成'}
                             </span>
                           </motion.div>
                         )}
                       </motion.div>

                       {/* 按钮组 */}
                       {letter.status === 'completed' && (
                         <motion.div
                           initial={{ opacity: 0, y: 10 }}
                           animate={{ opacity: 1, y: 0 }}
                           transition={{
                             duration: 0.5,
                             delay: 0.2,
                             type: 'spring',
                             bounce: 0.3,
                           }}
                           className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full px-4 sm:px-0"
                         >
                           <Button
                             variant="outline"
                             className="rounded-full px-8 py-2 bg-black/60 text-white border-white/10 hover:bg-white/20 hover:border-white/40 hover:text-white hover:shadow-[0_0_15px_rgba(255,255,255,0.2)] backdrop-blur-sm text-sm transition-all duration-300 w-full sm:w-auto"
                             onClick={() => saveAsImage()}
                             disabled={isSaving}
                           >
                             <span className="flex items-center justify-center gap-2">
                               {isSaving ? (
                                 <>
                                   <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                   {language === 'en' ? 'Generating...' : '生成中...'}
                                 </>
                               ) : (
                                 <>
                                   <Download className="w-4 h-4" />
                                   {language === 'en' ? 'Save as Image' : '保存为图片'}
                                 </>
                               )}
                             </span>
                           </Button>
                           
                           {isAnonymous ? (
                             <Button
                               variant="outline"
                               className="rounded-full px-8 py-2 bg-black/60 text-white border-white/10 hover:bg-white/20 hover:border-white/40 hover:text-white hover:shadow-[0_0_15px_rgba(255,255,255,0.2)] backdrop-blur-sm text-sm transition-all duration-300 w-full sm:w-auto"
                               onClick={saveAnonymousLetter}
                               disabled={isSavingAnonymous}
                             >
                               <span className="flex items-center justify-center gap-2">
                                 {isSavingAnonymous ? (
                                   <>
                                     <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                     {language === 'en' ? 'Saving to Account...' : '正在保存到账户...'}
                                   </>
                                 ) : (
                                   <>
                                     <LogIn className="w-4 h-4" />
                                     {language === 'en' ? 'Save Forever' : '永久保存'}
                                   </>
                                 )}
                               </span>
                             </Button>
                           ) : (
                             <Link href="/history" className="w-full sm:w-auto">
                               <Button
                                 variant="outline"
                                 className="rounded-full px-8 py-2 bg-black/60 text-white border-white/10 hover:bg-white/20 hover:border-white/40 hover:text-white hover:shadow-[0_0_15px_rgba(255,255,255,0.2)] backdrop-blur-sm text-sm transition-all duration-300 w-full"
                               >
                                 {language === 'en' ? 'View History' : '查看历史'}
                               </Button>
                             </Link>
                           )}
                           
                           <Link href="/write" className="w-full sm:w-auto">
                             <Button
                               variant="outline"
                               className="rounded-full px-8 py-2 bg-black/60 text-white border-white/10 hover:bg-white/20 hover:border-white/40 hover:text-white hover:shadow-[0_0_15px_rgba(255,255,255,0.2)] backdrop-blur-sm text-sm transition-all duration-300 w-full"
                             >
                               {language === 'en' ? 'Write Another' : '再写一封'}
                             </Button>
                           </Link>
                         </motion.div>
                       )}
                     </motion.div>
                   </motion.div>
                 </AnimatePresence>
               </div>
             </div>
           </div>
         </div>
       </div>

      {/* 匿名信件登录弹窗 */}
      <LoginDialog
        isOpen={showLoginPrompt}
        onClose={() => setShowLoginPrompt(false)}
        callbackType="anonymous"
        letterId={id}
      />

      {/* Preview Dialog - 恢复模板切换功能 */}
      <ImagePreviewDialog
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        imageUrl={previewImage || ''}
        onDownload={downloadImage}
        templates={TEMPLATES} // 提供所有模板
        selectedTemplate={selectedTemplate}
        onTemplateChange={handleTemplateChange} // 使用真实的模板切换函数
        isGenerating={isGenerating}
      />

      {/* 样式抽屉 */}
      <StyleDrawer
        templates={TEMPLATES}
        selectedTemplate={selectedTemplate}
        onTemplateChange={handleTemplateChange}
        onWatermarkToggle={handleWatermarkToggle}
        hideWatermark={hideWatermark}
        isShown={showStyleDrawer}
        onToggle={toggleStyleDrawer}
        isVIP={isVIP}
        unlockedTemplates={unlockedTemplates}
      />

      {/* PaddleScript component */}
      <PaddleScript />
    </>
  )
}
