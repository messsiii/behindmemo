'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Plus, Calendar, MessageSquare, MoreVertical, Trash2, Home } from 'lucide-react'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'react-hot-toast'

interface Collection {
  id: string
  title: string
  mainImage: string | null
  createdAt: string
  updatedAt: string
  creator: {
    id: string
    name: string | null
    image: string | null
  }
  _count: {
    messages: number
  }
}

export default function CollectorPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [collections, setCollections] = useState<Collection[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/login')
      return
    }
    fetchCollections()
  }, [session, status])

  const fetchCollections = async () => {
    try {
      const response = await fetch('/api/collector/collections')
      if (!response.ok) throw new Error('获取失败')
      const data = await response.json()
      setCollections(data)
    } catch (error) {
      console.error('获取收集列表失败:', error)
      toast.error('获取收集列表失败')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    setCreating(true)
    try {
      const response = await fetch('/api/collector/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      if (!response.ok) throw new Error('创建失败')

      const collection = await response.json()
      // 确保立即跳转
      await router.push(`/collector/${collection.id}`)
    } catch (error) {
      console.error('创建收集失败:', error)
      toast.error('创建失败')
      setCreating(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个收集吗？')) return

    try {
      const response = await fetch(`/api/collector/collections/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('删除失败')

      toast.success('删除成功')
      fetchCollections()
    } catch (error) {
      console.error('删除收集失败:', error)
      toast.error('删除失败')
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-primary mx-auto" />
          <p className="mt-4 text-gray-500">加载中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* 页面标题和创建按钮 */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.push('/')} title="回到首页">
              <Home className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">记忆收集</h1>
              <p className="mt-2 text-gray-600">和朋友一起收集美好的回忆</p>
            </div>
          </div>
          <Button onClick={handleCreate} disabled={creating} className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            {creating ? '创建中...' : '创建收集'}
          </Button>
        </div>

        {/* 收集列表 - 画廊模式 */}
        {collections.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="mb-4 text-gray-400">
              <MessageSquare className="h-16 w-16" />
            </div>
            <h3 className="mb-2 text-lg font-medium text-gray-900">还没有收集</h3>
            <p className="mb-6 text-sm text-gray-500">创建你的第一个记忆收集，邀请朋友一起分享</p>
            <Button onClick={handleCreate} disabled={creating} className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              {creating ? '创建中...' : '创建第一个收集'}
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {collections.map(collection => (
              <div
                key={collection.id}
                className="group relative cursor-pointer overflow-hidden rounded-2xl bg-white shadow-md transition-all hover:shadow-xl"
                onClick={() => router.push(`/collector/${collection.id}`)}
              >
                {/* 主图或占位符 */}
                <div className="aspect-square overflow-hidden bg-gradient-to-br from-purple-100 to-pink-100">
                  {collection.mainImage ? (
                    <img
                      src={collection.mainImage}
                      alt={collection.title}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <MessageSquare className="h-20 w-20 text-gray-300" />
                    </div>
                  )}
                </div>

                {/* 收集信息 */}
                <div className="p-4">
                  <div className="mb-2 flex items-start justify-between">
                    <h3 className="text-lg font-semibold text-gray-900 line-clamp-1">
                      {collection.title}
                    </h3>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        onClick={e => e.stopPropagation()}
                        className="ml-2 rounded-md p-1 hover:bg-gray-100"
                      >
                        <MoreVertical className="h-4 w-4 text-gray-500" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={e => {
                            e.stopPropagation()
                            handleDelete(collection.id)
                          }}
                          className="text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          删除
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <MessageSquare className="h-4 w-4" />
                      <span>{collection._count.messages} 条消息</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {format(new Date(collection.updatedAt), 'MM月dd日', {
                          locale: zhCN,
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
