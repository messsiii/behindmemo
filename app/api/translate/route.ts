import { authConfig } from '@/auth'
import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    // 检查用户认证
    const session = await getServerSession(authConfig)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { text } = await request.json()

    if (!text || typeof text !== 'string' || !text.trim()) {
      return NextResponse.json(
        { error: 'Missing or invalid text' },
        { status: 400 }
      )
    }

    const cleanText = text.trim()

    // 检查是否已经是英语（简单检测）
    if (isLikelyEnglish(cleanText)) {
      return NextResponse.json({
        originalText: cleanText,
        translatedText: cleanText,
        detectedLanguage: 'en',
        isTranslated: false
      })
    }

    // 如果没有配置谷歌翻译API密钥，返回原文
    if (!process.env.GOOGLE_TRANSLATE_API_KEY) {
      console.warn('Google Translate API key not configured')
      return NextResponse.json({
        originalText: cleanText,
        translatedText: cleanText,
        detectedLanguage: 'unknown',
        isTranslated: false,
        warning: 'Translation service not configured'
      })
    }

    try {
      // 使用 Google Translate API
      const translateUrl = `https://translation.googleapis.com/language/translate/v2?key=${process.env.GOOGLE_TRANSLATE_API_KEY}`
      
      const response = await fetch(translateUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: cleanText,
          target: 'en',
          format: 'text'
        })
      })

      if (!response.ok) {
        throw new Error(`Google Translate API error: ${response.status}`)
      }

      const data = await response.json()
      
      if (!data.data || !data.data.translations || data.data.translations.length === 0) {
        throw new Error('Invalid translation response')
      }

      const translation = data.data.translations[0]
      const translatedText = translation.translatedText
      const detectedLanguage = translation.detectedSourceLanguage || 'unknown'

      // 如果检测到的语言是英语，或者翻译结果与原文相同，则认为不需要翻译
      const isTranslated = detectedLanguage !== 'en' && translatedText !== cleanText

      return NextResponse.json({
        originalText: cleanText,
        translatedText: translatedText,
        detectedLanguage: detectedLanguage,
        isTranslated: isTranslated
      })

    } catch (error) {
      console.error('Google Translate API error:', error)
      
      // 翻译失败时返回原文
      return NextResponse.json({
        originalText: cleanText,
        translatedText: cleanText,
        detectedLanguage: 'unknown',
        isTranslated: false,
        error: 'Translation failed, using original text'
      })
    }

  } catch (error) {
    console.error('Translation API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// 简单的英语检测函数
function isLikelyEnglish(text: string): boolean {
  // 检查常见的英语单词
  const englishWords = [
    'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'it',
    'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at', 'this',
    'but', 'his', 'by', 'from', 'they', 'she', 'or', 'an', 'will', 'my',
    'one', 'all', 'would', 'there', 'their', 'what', 'so', 'up', 'out',
    'if', 'about', 'who', 'get', 'which', 'go', 'me', 'when', 'make',
    'can', 'like', 'time', 'no', 'just', 'him', 'know', 'take', 'people',
    'into', 'year', 'your', 'good', 'some', 'could', 'them', 'see', 'other',
    'than', 'then', 'now', 'look', 'only', 'come', 'its', 'over', 'think',
    'also', 'back', 'after', 'use', 'two', 'how', 'our', 'work', 'first',
    'well', 'way', 'even', 'new', 'want', 'because', 'any', 'these', 'give',
    'day', 'most', 'us'
  ]

  const words = text.toLowerCase().split(/\s+/)
  const englishWordCount = words.filter(word => 
    englishWords.includes(word.replace(/[^\w]/g, ''))
  ).length

  // 如果超过30%的单词是常见英语单词，认为是英语
  const englishRatio = englishWordCount / words.length
  
  // 同时检查字符集（英语主要使用ASCII字符）
  const asciiRatio = (text.match(/[a-zA-Z\s\d\.,!?'"()-]/g) || []).length / text.length

  return englishRatio > 0.3 || asciiRatio > 0.8
} 