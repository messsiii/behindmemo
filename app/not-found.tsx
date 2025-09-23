import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-bold">404 - 页面不存在</h2>
        <p className="mt-4">抱歉，您访问的页面不存在。</p>
        <Link href="/" className="mt-6 inline-block text-blue-500 hover:text-blue-700">
          返回首页
        </Link>
      </div>
    </div>
  )
}
