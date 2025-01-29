import type { Metadata } from "next"
import ResultContent from "../components/ResultContent"

export const metadata: Metadata = {
  title: "Your Love Letter",
  description: "View your personalized love letter",
}

export default function ResultPage() {
  return <ResultContent />
}

