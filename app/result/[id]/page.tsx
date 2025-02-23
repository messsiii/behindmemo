import ResultsPage from '@/app/components/ResultsPage'
import { Metadata } from 'next'

interface Props {
  params: Promise<{
    id: string
  }>
}

export async function generateMetadata(_props: Props): Promise<Metadata> {
  return {
    title: 'Your Love Letter - Behind Memory',
    description: 'View your personalized love letter',
  }
}

export default async function ResultPage({ params }: Props) {
  const { id } = await params
  return <ResultsPage id={id} />
}
