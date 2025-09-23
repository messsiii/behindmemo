'use client'

import { Suspense } from 'react'

export function SuspenseWrapper({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-primary mx-auto" />
            <p className="mt-4 text-gray-500">加载中...</p>
          </div>
        </div>
      }
    >
      {children}
    </Suspense>
  )
}
