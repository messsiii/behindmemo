"use client"

import { useState, useCallback, memo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { generateLoveLetter } from "../actions/generateLoveLetter"

const questions = [
  { id: 1, question: "What's your name?", field: "name", type: "text" },
  { id: 2, question: "Share a photo of your special moment", field: "photo", type: "file" },
  { id: 3, question: "What's your lover's name?", field: "loverName", type: "text" },
  { id: 4, question: "Tell us your love story", field: "story", type: "textarea" },
] as const

// 重命名我们的接口以避免冲突
interface LoveLetterFormData {
  name: string;
  loverName: string;
  story: string;
  photo: File;
}

// Memoize the progress indicator to prevent unnecessary re-renders
const ProgressIndicator = memo(function ProgressIndicator({
  currentStep,
  totalSteps,
}: {
  currentStep: number
  totalSteps: number
}) {
  return (
    <div className="absolute bottom-[-60px] left-0 right-0">
      <div className="flex justify-center gap-2">
        {Array.from({ length: totalSteps }, (_, index) => (
          <div
            key={index}
            className={`h-1 w-12 rounded-full transition-colors duration-300 ${
              index === currentStep ? "bg-primary" : "bg-primary/20"
            }`}
          />
        ))}
      </div>
    </div>
  )
})

export default function TypeformStyle() {
  const [currentStep, setCurrentStep] = useState(0)
  // 更新状态类型
  const [formData, setFormData] = useState<Partial<LoveLetterFormData>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, files } = e.target as HTMLInputElement
    const newValue = files ? files[0] : value

    setFormData((prev) => {
      // 使用类型断言确保 name 是 FormData 的键
      const key = name as keyof LoveLetterFormData
      // 检查值是否改变
      if (prev[key] === newValue) return prev
      // 返回更新后的状态
      return { ...prev, [key]: newValue }
    })
  }, [])

  const handleNext = useCallback(() => {
    setCurrentStep((prev) => Math.min(prev + 1, questions.length - 1))
  }, [])

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey && !isSubmitting) {
        e.preventDefault()
        if (currentStep === questions.length - 1) {
          const form = e.currentTarget.closest("form")
          if (form) form.requestSubmit()
        } else {
          handleNext()
        }
      }
    },
    [currentStep, handleNext, isSubmitting],
  )

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (isSubmitting) return

      setIsSubmitting(true)
      try {
        if (!formData.name || !formData.loverName || !formData.story || !formData.photo) {
          throw new Error("Please fill in all required fields")
        }

        // 直接传递我们的表单数据，而不是创建 FormData 实例
        const result = await generateLoveLetter({
          name: formData.name,
          loverName: formData.loverName,
          story: formData.story,
          photo: formData.photo
        })

        if (result.success) {
          router.push(`/result/${result.id}`)
        } else {
          throw new Error("Failed to generate love letter")
        }
      } catch {
        // 忽略错误
      } finally {
        setIsSubmitting(false)
      }
    },
    [formData, isSubmitting, router],
  )

  const currentQuestion = questions[currentStep]

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 to-slate-50 p-4">
      <div className="w-full max-w-2xl">
        <form onSubmit={handleSubmit} className="relative">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-8"
            >
              <div className="space-y-6">
                <div className="flex items-center gap-2">
                  <span className="text-xl text-primary">{currentQuestion.id}</span>
                  <motion.h2
                    className="text-3xl font-light"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    {currentQuestion.question}
                  </motion.h2>
                </div>

                {currentQuestion.type === "textarea" ? (
                  <Textarea
                    key={`textarea-${currentQuestion.field}`}
                    name={currentQuestion.field}
                    defaultValue={formData[currentQuestion.field] || ""}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyPress}
                    placeholder="Type your answer here..."
                    className="text-lg border-0 border-b-2 rounded-none bg-transparent focus:ring-0 resize-none min-h-[100px]"
                    required
                  />
                ) : currentQuestion.type === "file" ? (
                  <div className="space-y-4">
                    <Input
                      key={`file-${currentQuestion.field}`}
                      type="file"
                      name={currentQuestion.field}
                      onChange={handleInputChange}
                      accept="image/*"
                      className="text-lg file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                      required
                    />
                  </div>
                ) : (
                  <Input
                    key={`input-${currentQuestion.field}`}
                    type={currentQuestion.type}
                    name={currentQuestion.field}
                    defaultValue={formData[currentQuestion.field] || ""}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyPress}
                    placeholder="Type your answer here..."
                    className="text-lg border-0 border-b-2 rounded-none bg-transparent focus:ring-0"
                    required
                  />
                )}
              </div>

              <div className="flex items-center gap-4">
                <Button
                  type={currentStep === questions.length - 1 ? "submit" : "button"}
                  onClick={currentStep === questions.length - 1 ? undefined : handleNext}
                  disabled={isSubmitting}
                  className="rounded-full px-8"
                >
                  {currentStep === questions.length - 1
                    ? isSubmitting
                      ? "Generating..."
                      : "Create Love Letter"
                    : "OK"}
                </Button>
                <span className="text-sm text-muted-foreground">press Enter ↵</span>
              </div>
            </motion.div>
          </AnimatePresence>

          <ProgressIndicator currentStep={currentStep} totalSteps={questions.length} />
        </form>
      </div>
    </div>
  )
}

