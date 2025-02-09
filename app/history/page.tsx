'use client'

import dynamic from 'next/dynamic'
import { Skeleton } from '@/components/ui/skeleton'

function HistoryItemSkeleton() {
  return (
    <div className="relative group">
      <div className="overflow-hidden rounded-xl bg-black/40 border border-white/10 backdrop-blur-sm">
        <div className="relative aspect-[16/9]">
          <Skeleton className="absolute inset-0" />
        </div>
        <div className="p-4 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
    </div>
  )
}

function HistorySkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="space-y-8">
          <Skeleton className="h-10 w-48" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <HistoryItemSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

const HistoryPage = dynamic(() => import('../components/HistoryPage'), {
  ssr: false,
  loading: () => <HistorySkeleton />,
})

export default function History() {
  return <HistoryPage />
}
