"use client"

import { useLocale } from "@/lib/locale-context"
import { t } from "@/lib/i18n"

interface I18nTextProps {
  children: string
  key?: string
  params?: Record<string, string | number>
  i18n?: boolean
}

/**
 * Component for internationalized text
 * Usage: <I18nText i18n>Submit</I18nText>
 * The text "Submit" will be extracted and replaced with the translation
 */
export function I18nText({ children, key, params, i18n = false }: I18nTextProps) {
  const { locale } = useLocale()
  
  if (!i18n) {
    return <>{children}</>
  }
  
  const translationKey = key || children.toLowerCase().replace(/\s+/g, '.')
  const translated = t(locale)(translationKey, params)
  
  return <>{translated}</>
}

/**
 * Hook for getting translations
 */
export function useTranslation() {
  const { locale } = useLocale()
  return {
    t: (key: string, params?: Record<string, string | number>) => t(locale)(key, params),
    locale,
  }
}

