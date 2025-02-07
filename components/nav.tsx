"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useLanguage } from "@/contexts/LanguageContext"
import { Globe } from "lucide-react"

const content = {
  en: {
    login: "Log in",
    language: "Language",
  },
  zh: {
    login: "登录",
    language: "语言",
  },
}

export function Nav() {
  const { language, setLanguage } = useLanguage()
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? "bg-white/30 backdrop-blur-md" : ""}`}
    >
      <div className="container relative mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <Link
            href="/"
            className={`text-sm text-gray-800 hover:text-gray-900 transition-colors ${
              language === "en" ? "font-serif" : "font-serif-zh"
            }`}
          >
            AI Love Letters
          </Link>
          <div className="flex items-center space-x-6">
            <Link href="/login" className="text-sm text-gray-800 hover:text-gray-900 transition-colors">
              {content[language].login}
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="text-gray-800 hover:text-gray-900 transition-colors">
                  <Globe className="h-4 w-4" />
                  <span className="sr-only">{content[language].language}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[120px]">
                <DropdownMenuItem onClick={() => setLanguage("en")}>English</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLanguage("zh")}>中文</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </nav>
  )
}

