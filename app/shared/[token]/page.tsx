import { LoadingSpinner } from '@/app/components/LoadingSpinner';
import { Metadata } from 'next';
import dynamic from 'next/dynamic';

// 动态导入客户端组件
const SharedLetterClient = dynamic(() => import('./client'), {
  ssr: true,
  loading: () => <div className="flex h-screen w-full items-center justify-center">
    <LoadingSpinner />
  </div>
})

// 定义Props类型
interface PageProps {
  params: Promise<{
    token: string
  }>
}

// 添加元数据生成函数
export async function generateMetadata(_props: PageProps): Promise<Metadata> {
  return {
    title: 'Shared Letter - Behind Memory',
    description: 'View a shared letter from Behind Memory',
  }
}

// 服务器组件作为入口点
export default async function SharedLetterPage({ params }: PageProps) {
  const { token } = await params
  return <SharedLetterClient token={token} />
} 