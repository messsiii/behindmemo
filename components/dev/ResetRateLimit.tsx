'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { toast } from 'sonner';

/**
 * 开发工具：重置频率限制
 * 仅在开发环境下显示
 */
export function ResetRateLimit() {
  const [email, setEmail] = useState('');
  const [ip, setIp] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // 重置频率限制
  const handleReset = async () => {
    if (!email && !ip) {
      toast.error('请至少输入一个邮箱或IP地址');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/reset-rate-limit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, ip }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '重置失败');
      }

      toast.success(`频率限制已重置: ${email || ''} ${ip || ''}`);
    } catch (error) {
      console.error('重置频率限制错误:', error);
      toast.error('重置频率限制失败，请查看控制台');
    } finally {
      setIsLoading(false);
    }
  };

  // 如果不是开发环境，不显示此组件
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  return (
    <div className="p-4 border border-yellow-300 bg-yellow-50 rounded-md mt-4">
      <h3 className="text-sm font-medium mb-2">开发工具：重置频率限制</h3>
      <div className="space-y-2">
        <div className="flex space-x-2">
          <Input
            type="email"
            placeholder="邮箱地址"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            type="text"
            placeholder="IP地址"
            value={ip}
            onChange={(e) => setIp(e.target.value)}
          />
          <Button
            onClick={handleReset}
            disabled={isLoading || (!email && !ip)}
            className="whitespace-nowrap"
            size="sm"
          >
            {isLoading ? '重置中...' : '重置限制'}
          </Button>
        </div>
        <p className="text-xs text-gray-500">
          此工具仅在开发环境中可用，用于重置邮箱或IP的频率限制。
        </p>
      </div>
    </div>
  );
} 