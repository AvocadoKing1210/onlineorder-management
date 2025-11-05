"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from "react"
import {
  getManagementPreferences,
  type ManagementPreference,
} from "./preferences"

interface PreferencesContextType {
  preferences: ManagementPreference | null
  loading: boolean
  refreshPreferences: () => Promise<void>
}

const PreferencesContext = createContext<PreferencesContextType | undefined>(
  undefined
)

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<ManagementPreference | null>(
    null
  )
  const [loading, setLoading] = useState(true)

  const loadPreferences = async () => {
    try {
      const prefs = await getManagementPreferences()
      setPreferences(prefs)
    } catch (error) {
      console.error("Error loading preferences:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Silent background load on mount
    loadPreferences()
  }, [])

  return (
    <PreferencesContext.Provider
      value={{
        preferences,
        loading,
        refreshPreferences: loadPreferences,
      }}
    >
      {children}
    </PreferencesContext.Provider>
  )
}

export function usePreferences() {
  const context = useContext(PreferencesContext)
  if (context === undefined) {
    throw new Error("usePreferences must be used within a PreferencesProvider")
  }
  return context
}

