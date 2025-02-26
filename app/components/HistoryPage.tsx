'use client'

import { Footer } from '@/components/footer'
import { Nav } from '@/components/nav'
import { Skeleton } from '@/components/ui/skeleton'
import { useLanguage } from '@/contexts/LanguageContext'
import { format } from 'date-fns'
import { enUS, zhCN } from 'date-fns/locale'
import { AnimatePresence, motion } from 'framer-motion'
import { useSession } from 'next-auth/react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import useSWR from 'swr'

interface Letter {
  id: string
  content: string
  imageUrl: string
  createdAt: string
  prompt: string
  language: string
}

interface LettersResponse {
  letters: Letter[]
  pagination: {
    total: number
    pages: number
    current: number
    limit: number
  }
}

const ITEMS_PER_PAGE = 10

function HistoryItemSkeleton() {
  return (
    <div className="relative group">
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
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <Skeleton className="h-12 w-64 mx-auto rounded-lg" />
      </div>
      <div
        className="columns-1 md:columns-2 lg:columns-3 gap-6 [column-fill:_balance] w-full"
        style={{
          columnGap: '1.5rem',
          columnRuleColor: 'transparent',
        }}
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="mb-6 break-inside-avoid-column">
            <HistoryItemSkeleton />
          </div>
        ))}
      </div>
    </div>
  )
}

function LoadingIndicator() {
  return (
    <div className="flex items-center justify-center gap-2 py-8">
      <div className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]"></div>
      <div className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]"></div>
      <div className="w-2 h-2 rounded-full bg-primary animate-bounce"></div>
    </div>
  )
}

export default function HistoryPage() {
  const { data: session } = useSession()
  const { language } = useLanguage()
  const pathname = usePathname()
  const [currentPage, setCurrentPage] = useState(1)
  const [allLetters, setAllLetters] = useState<Letter[]>([])
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const observerTarget = useRef<HTMLDivElement>(null)
  const loadingRef = useRef(false)
  const [mounted, setMounted] = useState(false)
  const [forceLoading, setForceLoading] = useState(true)
  const [showEmptyState, setShowEmptyState] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const content = {
    en: {
      title: 'Your Love Letters',
      empty: 'No letters yet. Start writing one!',
      write: 'Write a Letter',
      loading: 'Loading your letters...',
      loadMore: 'Loading more letters...',
      noMore: 'No more letters',
    },
    zh: {
      title: '你的情书',
      empty: '还没有情书。现在开始写一封吧！',
      write: '写一封情书',
      loading: '正在加载你的情书...',
      loadMore: '正在加载更多...',
      noMore: '没有更多了',
    },
  }

  const { error, isLoading, mutate } = useSWR<LettersResponse>(
    mounted && session?.user?.id
      ? `/api/letters?page=${currentPage}&limit=${ITEMS_PER_PAGE}`
      : null,
    async url => {
      if (currentPage === 1) {
        setForceLoading(true)
        setShowEmptyState(false)
      }
      
      try {
        const res = await fetch(url)
        if (!res.ok) throw new Error('Failed to fetch letters')
        return res.json()
      } catch (error) {
        if (currentPage === 1) {
          setForceLoading(false)
        }
        throw error
      }
    },
    {
      keepPreviousData: true,
      revalidateOnFocus: false,
      revalidateOnMount: true,
      dedupingInterval: 0,
      loadingTimeout: 0,
      onSuccess: data => {
        if (data?.letters) {
          if (currentPage === 1) {
            setAllLetters(data.letters)
          } else {
            setAllLetters(prev => {
              const newLetters = data.letters.filter(
                newLetter => !prev.some(existingLetter => existingLetter.id === newLetter.id)
              )
              return [...prev, ...newLetters]
            })
          }
          setHasMore(currentPage < (data.pagination.pages || 1))
          setIsLoadingMore(false)
          loadingRef.current = false
          
          if (currentPage === 1) {
            setTimeout(() => {
              setForceLoading(false)
              
              if (data.letters.length === 0) {
                setShowEmptyState(true)
              } else {
                setShowEmptyState(false)
              }
            }, 50)
          }
        }
      },
      onError: () => {
        setForceLoading(false)
        setIsLoadingMore(false)
        loadingRef.current = false
        setShowEmptyState(currentPage === 1)
      }
    }
  )

  useEffect(() => {
    const resetData = () => {
      setForceLoading(true)
      setShowEmptyState(false)
      setAllLetters([])
      setCurrentPage(1)
      mutate()
    }
    
    resetData()
    
    window.addEventListener('popstate', resetData)
    
    return () => {
      window.removeEventListener('popstate', resetData)
      setAllLetters([])
      setForceLoading(true)
    }
  }, [pathname, mutate])
  
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        setForceLoading(true)
        setShowEmptyState(false)
        setAllLetters([])
        mutate()
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [mutate])

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const target = entries[0]
      if (target.isIntersecting && hasMore && !isLoading && !loadingRef.current && !forceLoading && !isLoadingMore) {
        loadingRef.current = true
        setIsLoadingMore(true)
        setCurrentPage(prev => prev + 1)
      }
    },
    [hasMore, isLoading, forceLoading, isLoadingMore]
  )

  useEffect(() => {
    const observer = new IntersectionObserver(handleObserver, {
      threshold: 0.1,
      rootMargin: '100px',
    })

    const currentTarget = observerTarget.current
    if (currentTarget) {
      observer.observe(currentTarget)
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget)
      }
    }
  }, [handleObserver])

  if (!mounted) return null

  const showSkeleton = (isLoading && !allLetters.length) || forceLoading;
  
  if (showSkeleton) {
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
        <Nav />
        <main className="relative z-10 flex-1 container mx-auto px-4 py-8">
          <LoadingSkeleton />
        </main>
        <Footer />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col">
        <Nav />
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="text-center text-red-500">Error loading letters. Please try again.</div>
        </main>
        <Footer />
      </div>
    )
  }

  const sortedLetters = [...allLetters].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

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

      <Nav />

      <main className="relative z-10 flex-1 container mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={sortedLetters.length ? 'content' : 'empty'}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="space-y-8"
          >
            <h1 className="text-4xl font-bold text-center mb-12">{content[language].title}</h1>

            {!sortedLetters.length && showEmptyState ? (
              <motion.div
                className="text-center space-y-4"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <p className="text-gray-500">{content[language].empty}</p>
                <Link
                  href="/write"
                  className="inline-block bg-primary text-white px-6 py-3 rounded-full hover:opacity-90 transition-opacity"
                >
                  {content[language].write}
                </Link>
              </motion.div>
            ) : (
              <>
                <div
                  className="columns-1 md:columns-2 lg:columns-3 gap-6 [column-fill:_balance] w-full"
                  style={{
                    columnGap: '1.5rem',
                    columnRuleColor: 'transparent',
                  }}
                >
                  {sortedLetters.map((letter, index) => (
                    <Link
                      key={letter.id}
                      href={`/result/${letter.id}`}
                      className="block mb-6 break-inside-avoid-column"
                    >
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                      >
                        <div className="group bg-white/80 backdrop-blur-sm rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1">
                          <div className="relative">
                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <Image
                              src={letter.imageUrl}
                              alt="Love letter memory"
                              width={800}
                              height={600}
                              className="w-full h-auto object-cover"
                              sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                            />
                          </div>
                          <div className="p-4 bg-gradient-to-b from-white/80 to-white">
                            <p className="text-sm text-gray-500 mb-2">
                              {format(new Date(letter.createdAt), 'PPP', {
                                locale: language === 'zh' ? zhCN : enUS,
                              })}
                            </p>
                            <p className="text-sm line-clamp-3 text-gray-700 font-serif italic">
                              {letter.content}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    </Link>
                  ))}
                </div>

                <div ref={observerTarget} className="w-full py-4 flex items-center justify-center">
                  {isLoadingMore && <LoadingIndicator />}
                  {!isLoadingMore && hasMore && sortedLetters.length > 0 && (
                    <div className="text-center text-gray-500">{content[language].loadMore}</div>
                  )}
                  {!hasMore && sortedLetters.length > 0 && (
                    <div className="text-center text-gray-500">{content[language].noMore}</div>
                  )}
                </div>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <Footer />
    </div>
  )
}
