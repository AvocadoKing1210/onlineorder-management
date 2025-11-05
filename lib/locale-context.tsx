"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from "react"
import { usePreferences } from "./preferences-context"
import type { Locale } from "./i18n"

interface LocaleContextType {
  locale: Locale
  setLocale: (locale: Locale) => void
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined)

export function LocaleProvider({ children }: { children: ReactNode }) {
  const { preferences } = usePreferences()
  const [locale, setLocaleState] = useState<Locale>('en')

  // Load locale from preferences on mount
  useEffect(() => {
    if (preferences?.preferred_locale) {
      const prefLocale = preferences.preferred_locale as Locale
      if (['en', 'zh'].includes(prefLocale)) {
        setLocaleState(prefLocale)
      }
    }
  }, [preferences?.preferred_locale])

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale)
    // Note: The settings dialog will save the locale to preferences
    // This just updates the UI immediately
  }

  return (
    <LocaleContext.Provider value={{ locale, setLocale }}>
      {children}
    </LocaleContext.Provider>
  )
}

export function useLocale() {
  const context = useContext(LocaleContext)
  if (context === undefined) {
    throw new Error("useLocale must be used within a LocaleProvider")
  }
  return context
}

