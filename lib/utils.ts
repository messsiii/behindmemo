import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 格式化日期字符串为本地格式
 * @param dateString ISO格式日期字符串 (YYYY-MM-DD)
 * @returns 格式化后的日期字符串
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date)
}
