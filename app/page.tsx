import LoveLetterForm from "./components/LoveLetterForm"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Create Your Love Letter",
  description: "Express your love with a personalized love letter",
}

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 to-slate-50 p-4">
      <LoveLetterForm />
    </main>
  )
}

