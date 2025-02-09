import { Metadata } from 'next'
import ResultsPage from '@/app/components/ResultsPage'

interface Props {
  params: Promise<{
    id: string
  }>
}

export async function generateMetadata(_props: Props): Promise<Metadata> {
  return {
    title: 'Your Love Letter',
    description: 'View your generated love letter',
  }
}

export default async function ResultPage({ params }: Props) {
  const { id } = await params
  return <ResultsPage id={id} />
}
