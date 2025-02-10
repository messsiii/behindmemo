'use client'

import { Skeleton } from '@/components/ui/skeleton'
import dynamic from 'next/dynamic'

function HistorySkeleton() {
  return (
    <div className="min-h-screen flex flex-col">
      <div
        className="fixed inset-0 z-0"
        style={{
          backgroundImage: `
            linear-gradient(135deg, 
              #738fbd 0%,
              #a8c3d4 20%,
              #dbd6df 40%,
              #ecc6c7 60%,
              #db88a4 80%,
              #cc8eb1 100%
            )
          `,
          opacity: 0.3,
        }}
      />
      <div className="relative z-10 flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="space-y-8">
            <div className="text-center">
              <Skeleton className="h-12 w-64 mx-auto rounded-lg" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="relative group">
                  <div className="group bg-white/80 backdrop-blur-sm rounded-xl overflow-hidden shadow-lg border border-white/10">
                    <div className="relative aspect-[4/3]">
                      <Skeleton className="absolute inset-0" />
                    </div>
                    <div className="p-4 bg-gradient-to-b from-white/80 to-white space-y-3">
                      <Skeleton className="h-4 w-24" />
                      <div className="space-y-2">
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-3 w-[85%]" />
                        <Skeleton className="h-3 w-[70%]" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
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
