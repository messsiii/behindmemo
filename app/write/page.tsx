import LoveLetterForm from "../components/LoveLetterForm"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "写一封情书",
  description: "用AI帮你写一封动人的情书",
}

export default function WritePage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 to-slate-50 p-4">
      <LoveLetterForm />
    </main>
  )
} 