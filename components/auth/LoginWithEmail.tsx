'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@/contexts/LanguageContext';
import { Loader2 } from 'lucide-react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { z } from 'zod';

// 验证码长度
const CODE_LENGTH = 6;

export default function LoginWithEmail() {
  const router = useRouter();
  const { language } = useLanguage();
  
  // 多语言内容
  const content = {
    emailLabel: language === 'en' ? 'Email' : '邮箱',
    emailPlaceholder: language === 'en' ? 'name@example.com' : '请输入邮箱',
    sendCode: language === 'en' ? 'Send Code' : '发送验证码',
    resendCode: language === 'en' ? 'Resend in' : '秒后重发',
    codeLabel: language === 'en' ? 'Code' : '验证码',
    invalidEmail: language === 'en' ? 'Invalid email address' : '邮箱格式错误',
    incompleteCode: language === 'en' ? 'Enter complete code' : '请输入完整验证码',
    sending: language === 'en' ? 'Sending...' : '发送中...',
    codeSent: language === 'en' ? 'Code sent' : '验证码已发送',
    loginButton: language === 'en' ? 'Login' : '登录',
    loggingIn: language === 'en' ? 'Logging in...' : '登录中...',
    loginSuccess: language === 'en' ? 'Success' : '登录成功',
  };
  
  // 邮箱验证模式
  const emailSchema = z.string().email({ 
    message: content.invalidEmail
  });
  
  // 状态管理
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [verificationCode, setVerificationCode] = useState(Array(CODE_LENGTH).fill(''));
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [loginError, setLoginError] = useState('');

  // 验证码输入框引用
  const codeInputRefs = useRef<Array<HTMLInputElement | null>>(Array(CODE_LENGTH).fill(null));
  const emailInputRef = useRef<HTMLInputElement>(null);

  // 倒计时效果
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [countdown]);

  // 发送验证码
  const handleSendCode = async () => {
    // 重置错误
    setEmailError('');
    setLoginError('');
    
    // 验证邮箱
    try {
      emailSchema.parse(email);
    } catch (error) {
      if (error instanceof z.ZodError) {
        setEmailError(error.errors[0].message);
        return;
      }
    }
    
    setIsSendingCode(true);
    
    try {
      const response = await fetch('/api/auth/email-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, language }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || content.sending);
      }
      
      // 成功发送验证码
      setIsCodeSent(true);
      setCountdown(60); // 60秒倒计时
      
      toast.success(content.codeSent);
      
      // 聚焦到第一个验证码输入框
      const firstInput = codeInputRefs.current[0];
      if (firstInput) {
        firstInput.focus();
      }
    } catch (error) {
      console.error('发送验证码错误:', error);
      toast.error(error instanceof Error ? error.message : '发送验证码失败，请稍后重试');
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

  // 处理登录
  const handleLogin = async () => {
    // 重置登录错误
    setLoginError('');
    
    // 验证所有验证码输入框都已填写
    if (verificationCode.some(digit => digit === '')) {
      setLoginError(content.incompleteCode);
      return;
    }
    
    setIsLoggingIn(true);
    
    try {
      // 获取URL中的回调地址参数
      const urlParams = new URLSearchParams(window.location.search);
      const callbackUrl = urlParams.get('callbackUrl') || '/write';
      
      const code = verificationCode.join('');
      const result = await signIn('email-verification', {
        email,
        verificationCode: code,
        redirect: false,
        callbackUrl,
      });
      
      if (result?.error) {
        setLoginError(result.error);
        toast.error(result.error);
      } else if (result?.url) {
        toast.success(content.loginSuccess);
        router.push(result.url);
      }
    } catch (error) {
      console.error('登录错误:', error);
      setLoginError(error instanceof Error ? error.message : '登录失败，请稍后重试');
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="w-full">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium">
            {content.emailLabel}
          </Label>
          <div className="flex gap-2">
            <Input
              id="email"
              type="email"
              ref={emailInputRef}
              placeholder={content.emailPlaceholder}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isCodeSent && countdown > 0}
              className={emailError ? 'border-red-500' : ''}
            />
            <Button 
              type="button" 
              variant="secondary" 
              size="sm"
              disabled={isSendingCode || (isCodeSent && countdown > 0)} 
              onClick={handleSendCode}
              className="whitespace-nowrap"
            >
              {isSendingCode ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {content.sending}
                </>
              ) : isCodeSent && countdown > 0 ? (
                `${countdown}${content.resendCode}`
              ) : (
                content.sendCode
              )}
            </Button>
          </div>
          {emailError && <p className="text-xs text-red-500">{emailError}</p>}
        </div>

        {isCodeSent && (
          <div className="space-y-2">
            <Label htmlFor="code" className="text-sm font-medium">
              {content.codeLabel}
            </Label>
            <div className="flex justify-between gap-2">
              {Array.from({ length: CODE_LENGTH }).map((_, index) => (
                <Input
                  key={index}
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={verificationCode[index]}
                  ref={(el) => {
                    codeInputRefs.current[index] = el;
                  }}
                  onChange={(e) => handleCodeChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={index === 0 ? handlePaste : undefined}
                  className={`w-12 text-center p-2 ${
                    loginError ? 'border-red-500' : ''
                  }`}
                />
              ))}
            </div>
            {loginError && <p className="text-xs text-red-500">{loginError}</p>}

            <Button 
              className="w-full mt-4"
              disabled={isLoggingIn || verificationCode.some(digit => digit === '')} 
              onClick={handleLogin}
            >
              {isLoggingIn ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {content.loggingIn}
                </>
              ) : (
                content.loginButton
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
} 