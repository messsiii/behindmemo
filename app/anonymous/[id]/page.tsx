import AnonymousLetterResults from '@/app/components/AnonymousLetterResults'
import { Metadata } from 'next'

interface Props {
  params: Promise<{
    id: string
  }>
}

export async function generateMetadata(_props: Props): Promise<Metadata> {
  return {
    title: 'Your Letter - Behind Memory',
    description: 'View your personalized letter',
  }
}

export default async function AnonymousLetterPage({ params }: Props) {
  const { id } = await params
  return <AnonymousLetterResults id={id} isAnonymous={true} />
} 