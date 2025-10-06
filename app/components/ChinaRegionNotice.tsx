'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'

/**
 * 中国大陆用户通知组件
 * 当检测到用户来自中国大陆且访问海外站时，显示切换提示
 */
export function ChinaRegionNotice() {
  const [show, setShow] = useState(false)
  const [suggestedUrl, setSuggestedUrl] = useState<string | null>(null)

  useEffect(() => {
    // 检查是否已经关闭过通知
    const dismissed = localStorage.getItem('china-notice-dismissed')
    if (dismissed === 'true') {
      return
    }

    // 调用地理位置检测API
    fetch('/api/geo')
      .then(res => res.json())
      .then(data => {
        if (data.shouldSuggestSwitch && data.suggestedUrl) {
          setShow(true)
          setSuggestedUrl(data.suggestedUrl)
        }
      })
      .catch(err => {
        console.error('Failed to detect region:', err)
      })
  }, [])

  const handleDismiss = () => {
    setShow(false)
    // 记住用户选择，这次访问期间不再显示
    localStorage.setItem('china-notice-dismissed', 'true')
  }

  const handleSwitch = () => {
    if (suggestedUrl) {
      // 保持当前路径
      const currentPath = window.location.pathname + window.location.search
      window.location.href = suggestedUrl + currentPath
    }
  }

  if (!show) return null

  return (
    <div className="fixed top-16 left-0 right-0 z-40 mx-auto max-w-4xl px-4 animate-in slide-in-from-top duration-300">
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 shadow-lg dark:border-blue-800 dark:bg-blue-950">
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🇨🇳</span>
              <h3 className="font-semibold text-blue-900 dark:text-blue-100">
                检测到您来自中国大陆
              </h3>
            </div>
            <p className="mt-2 text-sm text-blue-800 dark:text-blue-200">
              为了给您提供更快速、稳定的访问体验，我们提供了专门优化的中国大陆版本。
              <br />
              国内版本使用国内服务器和CDN，访问速度更快！
            </p>
            <div className="mt-3 flex gap-3">
              <button
                onClick={handleSwitch}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
              >
                切换到中国大陆版本
              </button>
              <button
                onClick={handleDismiss}
                className="rounded-md border border-blue-300 bg-white px-4 py-2 text-sm font-medium text-blue-900 hover:bg-blue-50 transition-colors dark:border-blue-700 dark:bg-blue-900 dark:text-blue-100 dark:hover:bg-blue-800"
              >
                继续使用国际版
              </button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="rounded-md p-1 text-blue-600 hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-blue-900"
            aria-label="关闭通知"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
