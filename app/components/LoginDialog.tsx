'use client'

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription, DialogHeader,
    DialogTitle
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useLanguage } from "@/contexts/LanguageContext"
import { AlertTriangle, ExternalLink, Loader2 } from "lucide-react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { z } from "zod"

interface LoginDialogProps {
  isOpen: boolean
  onClose: () => void
}

// 验证码长度
const CODE_LENGTH = 6;

export function LoginDialog({ isOpen, onClose }: LoginDialogProps) {
  const { language } = useLanguage()
  const router = useRouter()
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [activeTab, setActiveTab] = useState('google')
  const [isUnsafeEnvironment, setIsUnsafeEnvironment] = useState(false)
  
  // 邮箱验证码状态
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState('')
  const [verificationCode, setVerificationCode] = useState(Array(CODE_LENGTH).fill(''))
  const [isCodeSent, setIsCodeSent] = useState(false)
  const [isSendingCode, setIsSendingCode] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [loginError, setLoginError] = useState('')
  
  // 验证码输入框引用
  const codeInputRefs = useRef<Array<HTMLInputElement | null>>(Array(CODE_LENGTH).fill(null))
  const emailInputRef = useRef<HTMLInputElement>(null)
  
  // 记录组件状态变化
  useEffect(() => {
    console.log('LoginDialog 状态变化：isOpen =', isOpen);
  }, [isOpen]);
  
  // 检测不安全的浏览器环境
  useEffect(() => {
    if (isOpen) {
      console.log('LoginDialog 已打开，检查浏览器环境');
      checkBrowserEnvironment()
    }
  }, [isOpen])
  
  // 组件挂载和卸载日志
  useEffect(() => {
    console.log('LoginDialog 组件已挂载');
    return () => {
      console.log('LoginDialog 组件已卸载');
    };
  }, []);
  
  // 倒计时效果
  useEffect(() => {
    let timer: NodeJS.Timeout
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000)
    }
    return () => {
      if (timer) clearTimeout(timer)
    }
  }, [countdown])
  
  const checkBrowserEnvironment = () => {
    const userAgent = navigator.userAgent.toLowerCase()
    
    // 检测是否在社交媒体App的内置浏览器中
    const isInstagram = userAgent.includes('instagram')
    const isFacebook = userAgent.includes('fbav') || userAgent.includes('fban')
    const isWeChat = userAgent.includes('micromessenger')
    const isLineApp = userAgent.includes('line/')
    const isSnapchat = userAgent.includes('snapchat')
    const isInAppBrowser = userAgent.includes('wv') || 
                         /mozilla\/[\d\.]+ \((?:iphone|ipad|ipod|android).*applewebkit\/[\d\.]+.*mobile.*safari\/[\d\.]+(?!.+chrome)/i.test(userAgent)
    
    setIsUnsafeEnvironment(isInstagram || isFacebook || isWeChat || isLineApp || isSnapchat || isInAppBrowser)
  }
  
  const content = {
    en: {
      title: "One step away from your letter",
      description: "Log in quickly to generate your personalized love letter based on your memories. Your information will be safely preserved.",
      googleButton: "Continue with Google",
      emailTab: "Email",
      googleTab: "Google",
      emailLabel: "Email",
      emailPlaceholder: "name@example.com",
      sendCode: "Send Code",
      resendCode: "Resend in",
      codeLabel: "Code",
      invalidEmail: "Invalid email address",
      incompleteCode: "Enter complete code",
      sending: "Sending...",
      codeSent: "Code sent",
      loginButton: "Login",
      loggingIn: "Logging in...",
      loginSuccess: "Success",
      unsafeEnvironment: {
        title: "Browser Not Supported for Login",
        description: "Google blocks logins from Instagram, Facebook, and other social media in-app browsers due to security concerns.",
        alertTitle: "Login Blocked by Google",
        alertDescription: "To continue, please use one of these options:",
        openInBrowser: "Open in Safari/Chrome",
        orCopy: "Copy link:",
        copyButton: "Copy URL",
        qrCodeTab: "QR Code",
        linkTab: "Copy Link",
        scanQrCode: "Scan QR Code",
        scanQrDescription: "Scan this QR code with your camera to open in an external browser",
        copySuccess: "Link copied to clipboard!"
      }
    },
    zh: {
      title: "距离您的信件只有一步之遥",
      description: "快速登录以生成基于您记忆的专属情书。您的信息将被安全保留。",
      googleButton: "使用 Google 账号登录",
      emailTab: "邮箱登录",
      googleTab: "谷歌登录",
      emailLabel: "邮箱",
      emailPlaceholder: "请输入邮箱",
      sendCode: "发送验证码",
      resendCode: "秒后重发",
      codeLabel: "验证码",
      invalidEmail: "邮箱格式错误",
      incompleteCode: "请输入完整验证码",
      sending: "发送中...",
      codeSent: "验证码已发送",
      loginButton: "登录",
      loggingIn: "登录中...",
      loginSuccess: "登录成功",
      unsafeEnvironment: {
        title: "浏览器不支持登录",
        description: "由于安全原因，Google 阻止了从 Instagram、微信等应用内置浏览器的登录请求。",
        alertTitle: "Google 已阻止登录",
        alertDescription: "请使用以下方式继续操作：",
        openInBrowser: "在浏览器中打开",
        orCopy: "复制链接：",
        copyButton: "复制链接",
        qrCodeTab: "二维码",
        linkTab: "复制链接",
        scanQrCode: "扫描二维码",
        scanQrDescription: "使用相机扫描此二维码在外部浏览器中打开网站",
        copySuccess: "链接已复制到剪贴板！"
      }
    }
  }

  // 设置登录成功后的回调和状态
  const prepareLoginCallback = () => {
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set('returnFrom', 'login');
    
    // 确保设置localStorage标记，用于登录后恢复表单数据
    localStorage.setItem('hasFormDataPending', 'true');
    
    // 检查页面类型并确保导航到正确的页面
    const isWritePage = window.location.pathname.includes('/write');
    console.log(`准备登录回调URL，当前页面类型: ${isWritePage ? '写作页面' : '其他页面'}`);
    
    // 如果不是写作页面，确保回调到写作页面
    if (!isWritePage) {
      currentUrl.pathname = '/write';
      console.log('设置回调到写作页面: /write');
    }
    
    const callbackUrl = currentUrl.toString();
    console.log('设置登录回调URL:', callbackUrl);
    
    // 检查是否已经保存了表单数据
    const hasSavedFormData = !!localStorage.getItem('pendingFormData');
    console.log('检查是否已保存表单数据:', hasSavedFormData);
    
    // 仅当有pendingFormData时才设置hasFormDataPending标记
    if (!hasSavedFormData) {
      console.log('警告: 没有找到已保存的表单数据，但仍然设置了hasFormDataPending标记');
    }
    
    return callbackUrl;
  }

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true)
    try {
      console.log('准备Google登录，设置回调URL');
      const callbackUrl = prepareLoginCallback();
      console.log('使用的回调URL:', callbackUrl);
      
      // 确保redirect设为true，让浏览器完成完整的重定向过程
      signIn('google', { 
        redirect: true,
        callbackUrl
      });
      
    } catch (error) {
      console.error('Google登录错误:', error)
      setIsLoggingIn(false)
    }
  }
  
  // 验证邮箱
  const emailSchema = z.string().email({ 
    message: content[language].invalidEmail
  });
  
  // 发送验证码
  const handleSendCode = async () => {
    // 重置错误状态
    setEmailError('');
    
    // 验证邮箱格式
    if (!emailSchema.safeParse(email).success) {
      setEmailError(content[language].invalidEmail);
      return;
    }
    
    setIsSendingCode(true);
    
    try {
      const response = await fetch('/api/auth/send-verification-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to send verification code');
      }
      
      // 设置倒计时60秒
      setCountdown(60);
      setIsCodeSent(true);
      
      // 显示成功提示
      toast.success(language === 'en' ? 'Code Sent' : '验证码已发送', {
        description: language === 'en' ? 'Please check your email' : '请查看您的邮箱'
      });
      
      // 移动焦点到第一个验证码输入框
      if (codeInputRefs.current[0]) {
        codeInputRefs.current[0].focus();
      }
    } catch (error) {
      toast.error(language === 'en' ? 'Error' : '错误', {
        description: error instanceof Error ? error.message : 'Failed to send code'
      });
    } finally {
      setIsSendingCode(false);
    }
  };

  // 处理验证码输入变化
  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1) {
      // 处理粘贴多位数字的情况
      const pastedValue = value.slice(0, CODE_LENGTH);
      const newVerificationCode = [...verificationCode];
      
      // 分配粘贴的每一位到相应的输入框
      for (let i = 0; i < pastedValue.length && i + index < CODE_LENGTH; i++) {
        if (/^\d$/.test(pastedValue[i])) {
          newVerificationCode[i + index] = pastedValue[i];
        }
      }
      
      setVerificationCode(newVerificationCode);
      
      // 聚焦到最后一个填充的输入框的下一个，或最后一个
      const nextIndex = Math.min(index + pastedValue.length, CODE_LENGTH - 1);
      const nextInput = codeInputRefs.current[nextIndex];
      if (nextInput) {
        nextInput.focus();
      }
      return;
    }

    // 处理单个数字输入
    if (/^\d?$/.test(value)) {
      const newVerificationCode = [...verificationCode];
      newVerificationCode[index] = value;
      setVerificationCode(newVerificationCode);
      
      // 自动聚焦到下一个输入框
      if (value && index < CODE_LENGTH - 1 && codeInputRefs.current[index + 1]) {
        const nextInput = codeInputRefs.current[index + 1];
        if (nextInput) {
          nextInput.focus();
        }
      }
    }
  };

  // 处理按键事件
  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    // 处理删除键
    if (e.key === 'Backspace' && !verificationCode[index] && index > 0) {
      // 当当前输入框为空并且按下退格键时，聚焦到前一个输入框
      const prevInput = codeInputRefs.current[index - 1];
      if (prevInput) {
        prevInput.focus();
      }
    }
  };

  // 处理粘贴事件
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text');
    const digits = pastedData.replace(/\D/g, '').slice(0, CODE_LENGTH);
    
    if (digits.length > 0) {
      const newVerificationCode = [...verificationCode];
      for (let i = 0; i < digits.length; i++) {
        newVerificationCode[i] = digits[i];
      }
      setVerificationCode(newVerificationCode);
      
      // 聚焦到粘贴完后的下一个输入框，或最后一个
      const nextIndex = Math.min(digits.length, CODE_LENGTH - 1);
      const nextInput = codeInputRefs.current[nextIndex];
      if (nextInput) {
        nextInput.focus();
      }
    }
  };

  // 处理邮箱登录
  const handleEmailLogin = async () => {
    // 重置登录错误
    setLoginError('');
    
    // 验证所有验证码输入框都已填写
    if (verificationCode.some(digit => digit === '')) {
      setLoginError(content[language].incompleteCode);
      return;
    }
    
    setIsLoggingIn(true);
    
    try {
      // 设置回调URL
      const callbackUrl = prepareLoginCallback();
      
      const code = verificationCode.join('');
      const result = await signIn('email-verification', {
        email,
        verificationCode: code,
        redirect: false,
        callbackUrl,
      });
      
      if (result?.error) {
        setLoginError(result.error);
        toast.error(language === 'en' ? 'Error' : '错误', {
          description: result.error
        });
        setIsLoggingIn(false);
      } else if (result?.url) {
        toast.success(language === 'en' ? 'Success' : '成功', {
          description: content[language].loginSuccess
        });
        
        // 关闭登录对话框
        onClose();
        
        // 重定向到预定的URL
        router.push(result.url);
      }
    } catch (error) {
      console.error('登录错误:', error);
      setLoginError(error instanceof Error ? error.message : '登录失败，请稍后重试');
      setIsLoggingIn(false);
    }
  };
  
  // 在外部浏览器中打开
  const openInExternalBrowser = () => {
    const currentUrl = window.location.href;
    window.open(currentUrl, '_blank');
  }
  
  // 复制当前URL到剪贴板
  const copyUrlToClipboard = () => {
    const currentUrl = window.location.href;
    navigator.clipboard.writeText(currentUrl).then(() => {
      alert(content[language].unsafeEnvironment.copySuccess);
    }).catch(err => {
      console.error('Failed to copy: ', err);
    });
  }
  
  // 获取QR码URL
  const getQRCodeUrl = () => {
    const currentUrl = encodeURIComponent(window.location.href);
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${currentUrl}`;
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      console.log('Dialog onOpenChange 被触发：', open);
      if (!open) onClose()
    }}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isUnsafeEnvironment 
            ? content[language].unsafeEnvironment.title 
            : content[language].title}
          </DialogTitle>
          <DialogDescription>
            {isUnsafeEnvironment 
              ? content[language].unsafeEnvironment.description 
              : content[language].description}
          </DialogDescription>
        </DialogHeader>
        
        {isUnsafeEnvironment ? (
          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>{content[language].unsafeEnvironment.alertTitle}</AlertTitle>
              <AlertDescription>
                {content[language].unsafeEnvironment.alertDescription}
              </AlertDescription>
            </Alert>
            
            <Button 
              onClick={openInExternalBrowser}
              className="w-full flex items-center justify-center gap-2"
              variant="default"
            >
              <ExternalLink className="h-4 w-4" />
              {content[language].unsafeEnvironment.openInBrowser}
            </Button>
            
            <Tabs defaultValue="qrcode" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="qrcode">{content[language].unsafeEnvironment.qrCodeTab}</TabsTrigger>
                <TabsTrigger value="copy">{content[language].unsafeEnvironment.linkTab}</TabsTrigger>
              </TabsList>
              
              <TabsContent value="qrcode" className="space-y-2 pt-2">
                <div className="flex justify-center py-2">
                  <img 
                    src={getQRCodeUrl()} 
                    alt="QR Code" 
                    className="w-48 h-48 border rounded"
                  />
                </div>
                <p className="text-center text-sm text-gray-500">
                  {content[language].unsafeEnvironment.scanQrDescription}
                </p>
              </TabsContent>
              
              <TabsContent value="copy" className="space-y-2 pt-2">
                <div className="text-sm text-gray-500 mb-2">
                  {content[language].unsafeEnvironment.orCopy}
                </div>
                
                <div className="flex items-center">
                  <div className="border rounded-l px-3 py-2 bg-muted text-xs truncate flex-1 overflow-hidden">
                    {window.location.href}
                  </div>
                  <Button 
                    onClick={copyUrlToClipboard} 
                    className="rounded-l-none"
                    size="sm"
                  >
                    {content[language].unsafeEnvironment.copyButton}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <Tabs 
            defaultValue="google" 
            className="w-full"
            value={activeTab}
            onValueChange={setActiveTab}
          >
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="email">{content[language].emailTab}</TabsTrigger>
              <TabsTrigger value="google">{content[language].googleTab}</TabsTrigger>
            </TabsList>
            
            <TabsContent value="email" className="mt-2 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  {content[language].emailLabel}
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="email"
                    type="email"
                    ref={emailInputRef}
                    placeholder={content[language].emailPlaceholder}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isCodeSent && countdown > 0}
                    className={emailError ? "border-red-500" : ""}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleSendCode}
                    disabled={isSendingCode || (isCodeSent && countdown > 0) || !email}
                    className="whitespace-nowrap min-w-[120px]"
                  >
                    {isSendingCode ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : isCodeSent && countdown > 0 ? (
                      `${countdown}${content[language].resendCode}`
                    ) : (
                      content[language].sendCode
                    )}
                  </Button>
                </div>
                {emailError && <p className="text-sm text-red-500">{emailError}</p>}
              </div>
              
              {isCodeSent && (
                <div className="space-y-2">
                  <Label htmlFor="code" className="text-sm font-medium">
                    {content[language].codeLabel}
                  </Label>
                  <div className="grid grid-cols-6 gap-2 mt-2">
                    {verificationCode.map((digit, index) => (
                      <Input
                        key={index}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={1}
                        className="text-center"
                        value={digit}
                        onChange={(e) => handleCodeChange(index, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(index, e)}
                        onPaste={index === 0 ? handlePaste : undefined}
                        ref={(el) => {
                          codeInputRefs.current[index] = el;
                          return undefined; // 明确返回undefined以符合React类型要求
                        }}
                      />
                    ))}
                  </div>
                  {loginError && <p className="text-sm text-red-500">{loginError}</p>}
                </div>
              )}
              
              {isCodeSent && (
                <Button
                  type="button"
                  variant="default"
                  onClick={handleEmailLogin}
                  disabled={isLoggingIn || verificationCode.some((digit) => digit === '')}
                  className="w-full"
                >
                  {isLoggingIn ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {content[language].loggingIn}
                    </>
                  ) : (
                    content[language].loginButton
                  )}
                </Button>
              )}
            </TabsContent>
            
            <TabsContent value="google" className="mt-2">
              <Button 
                onClick={handleGoogleLogin} 
                className="relative w-full bg-white text-black hover:bg-gray-100 border border-gray-300"
                disabled={isLoggingIn}
              >
                {isLoggingIn ? (
                  <div className="h-5 w-5 rounded-full border-2 border-black/30 border-t-black animate-spin mr-2"></div>
                ) : (
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                )}
                {content[language].googleButton}
              </Button>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  )
} 