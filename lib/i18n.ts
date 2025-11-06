export type Locale = 'en' | 'zh'

export const locales: Locale[] = ['en', 'zh']
export const defaultLocale: Locale = 'en'

export const localeNames: Record<Locale, string> = {
  en: 'English',
  zh: '中文',
}

// Translation files - dynamically imported for Next.js compatibility
import enTranslations from '@/messages/en.json'
import zhTranslations from '@/messages/zh.json'

const translations: Record<Locale, Record<string, any>> = {
  en: enTranslations as Record<string, any>,
  zh: zhTranslations as Record<string, any>,
}

export function getTranslations(locale: Locale) {
  return translations[locale] || translations.en
}

export function t(locale: Locale) {
  const dict = getTranslations(locale)
  
  return (key: string, params?: Record<string, string | number>) => {
    const keys = key.split('.')
    let value: any = dict
    
    for (const k of keys) {
      value = value?.[k]
      if (value === undefined) return key
    }
    
    if (typeof value !== 'string') return key
    
    // Replace params if provided
    if (params) {
      return value.replace(/\{\{(\w+)\}\}/g, (_, param) => {
        return String(params[param] ?? '')
      })
    }
    
    return value
  }
}

