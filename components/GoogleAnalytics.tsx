'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import Script from 'next/script'
import { useEffect, Suspense } from 'react'

function GoogleAnalyticsInner({
  GA_MEASUREMENT_ID = 'G-9CSJJFEZRJ',
}: {
  GA_MEASUREMENT_ID?: string
}) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (pathname) {
      // 页面浏览事件
      window.gtag?.('event', 'page_view', {
        page_path: pathname,
        page_search: searchParams?.toString(),
        page_location: window.location.href,
      })
    }
  }, [pathname, searchParams])

  return (
    <>
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
      />
      <Script
        id="google-analytics"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}', {
              page_path: window.location.pathname,
            });
          `,
        }}
      />
    </>
  )
}

export default function GoogleAnalytics({ GA_MEASUREMENT_ID }: { GA_MEASUREMENT_ID?: string }) {
  return (
    <Suspense fallback={null}>
      <GoogleAnalyticsInner GA_MEASUREMENT_ID={GA_MEASUREMENT_ID} />
    </Suspense>
  )
}

// 全局可用的GA事件跟踪函数
export function trackEvent(action: string, category: string, label?: string, value?: number) {
  window.gtag?.('event', action, {
    event_category: category,
    event_label: label,
    value: value,
  })
}

// 声明全局window类型扩展
declare global {
  interface Window {
    gtag?: (
      command: 'event' | 'config' | 'set' | 'consent' | 'js',
      target: any,
      params?: any
    ) => void
    dataLayer?: any[]
  }
}
