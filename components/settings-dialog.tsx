"use client"

import { useState, useEffect, useRef } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import {
  IconSettings,
  IconBell,
  IconX,
} from "@tabler/icons-react"
import {
  saveManagementPreferences,
  type ManagementPreference,
} from "@/lib/preferences"
import { usePreferences } from "@/lib/preferences-context"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type SettingsCategory = "general" | "notifications"

interface CategoryConfig {
  id: SettingsCategory
  label: string
  icon: React.ComponentType<{ className?: string }>
}

const categories: CategoryConfig[] = [
  {
    id: "general",
    label: "General",
    icon: IconSettings,
  },
  {
    id: "notifications",
    label: "Notifications",
    icon: IconBell,
  },
]

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { preferences, refreshPreferences } = usePreferences()
  const [selectedCategory, setSelectedCategory] =
    useState<SettingsCategory>("general")
  const [saving, setSaving] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const pendingClose = useRef(false)
  
  const defaultPreferences: {
    theme: "light" | "dark" | "system"
    preferred_locale: string
    sidebar_collapsed: boolean
    notifications_enabled: boolean
    user_guide_completed: boolean
  } = {
    theme: "system",
    preferred_locale: "en",
    sidebar_collapsed: false,
    notifications_enabled: true,
    user_guide_completed: false,
  }

  const [originalPreferences, setOriginalPreferences] = useState<typeof defaultPreferences>(
    preferences ? {
      theme: preferences.theme || "system",
      preferred_locale: preferences.preferred_locale || "en",
      sidebar_collapsed: preferences.sidebar_collapsed || false,
      notifications_enabled: preferences.notifications_enabled ?? true,
      user_guide_completed: preferences.user_guide_completed || false,
    } : defaultPreferences
  )
  const [localPreferences, setLocalPreferences] = useState<typeof defaultPreferences>(
    preferences ? {
      theme: preferences.theme || "system",
      preferred_locale: preferences.preferred_locale || "en",
      sidebar_collapsed: preferences.sidebar_collapsed || false,
      notifications_enabled: preferences.notifications_enabled ?? true,
      user_guide_completed: preferences.user_guide_completed || false,
    } : defaultPreferences
  )

  // Update local and original preferences when context preferences change
  useEffect(() => {
    if (preferences) {
      const prefs = {
        theme: preferences.theme || "system",
        preferred_locale: preferences.preferred_locale || "en",
        sidebar_collapsed: preferences.sidebar_collapsed || false,
        notifications_enabled: preferences.notifications_enabled ?? true,
        user_guide_completed: preferences.user_guide_completed || false,
      }
      setLocalPreferences(prefs)
      setOriginalPreferences(prefs)
    }
  }, [preferences])

  // Reset when dialog opens
  useEffect(() => {
    if (open && preferences) {
      const prefs = {
        theme: preferences.theme || "system",
        preferred_locale: preferences.preferred_locale || "en",
        sidebar_collapsed: preferences.sidebar_collapsed || false,
        notifications_enabled: preferences.notifications_enabled ?? true,
        user_guide_completed: preferences.user_guide_completed || false,
      }
      setLocalPreferences(prefs)
      setOriginalPreferences(prefs)
      pendingClose.current = false
    }
  }, [open, preferences])

  // Check if there are unsaved changes
  const hasChanges = () => {
    if (!originalPreferences) return false
    return (
      localPreferences.theme !== originalPreferences.theme ||
      localPreferences.preferred_locale !== originalPreferences.preferred_locale ||
      localPreferences.sidebar_collapsed !== originalPreferences.sidebar_collapsed ||
      localPreferences.notifications_enabled !== originalPreferences.notifications_enabled ||
      localPreferences.user_guide_completed !== originalPreferences.user_guide_completed
    )
  }

  // Get list of changed fields
  const getChangedFields = (): string[] => {
    if (!originalPreferences) return []
    const changes: string[] = []
    
    if (localPreferences.theme !== originalPreferences.theme) {
      changes.push("Theme")
    }
    if (localPreferences.preferred_locale !== originalPreferences.preferred_locale) {
      changes.push("Preferred Locale")
    }
    if (localPreferences.sidebar_collapsed !== originalPreferences.sidebar_collapsed) {
      changes.push("Sidebar Collapsed")
    }
    if (localPreferences.notifications_enabled !== originalPreferences.notifications_enabled) {
      changes.push("Notifications Enabled")
    }
    if (localPreferences.user_guide_completed !== originalPreferences.user_guide_completed) {
      changes.push("User Guide Completed")
    }
    
    return changes
  }

  const handleClose = (force = false) => {
    if (!force && hasChanges()) {
      setShowConfirmDialog(true)
      pendingClose.current = true
    } else {
      onOpenChange(false)
      setShowConfirmDialog(false)
    }
  }

  const handleConfirmDiscard = () => {
    setLocalPreferences(originalPreferences)
    onOpenChange(false)
    setShowConfirmDialog(false)
    pendingClose.current = false
  }

  const handleConfirmSave = async () => {
    // Always close after initiating save
    handleSave()
    onOpenChange(false)
    setShowConfirmDialog(false)
    pendingClose.current = false
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const success = await saveManagementPreferences({
        theme: localPreferences.theme,
        preferred_locale: localPreferences.preferred_locale,
        sidebar_collapsed: localPreferences.sidebar_collapsed,
        notifications_enabled: localPreferences.notifications_enabled,
        user_guide_completed: localPreferences.user_guide_completed,
      })

      if (success) {
        await refreshPreferences()
        setOriginalPreferences(localPreferences)
        toast.success("Settings saved successfully")
        return true
      } else {
        toast.error("Failed to save settings")
        return false
      }
    } catch (error) {
      console.error("Error saving preferences:", error)
      toast.error("Failed to save settings")
      return false
    } finally {
      setSaving(false)
    }
  }

  const renderGeneralSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium mb-4">Appearance</h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="theme">Theme</Label>
            <Select
              value={localPreferences.theme || "system"}
              onValueChange={(value: "light" | "dark" | "system") =>
                setLocalPreferences({
                  ...localPreferences,
                  theme: value,
                })
              }
            >
              <SelectTrigger id="theme" className="w-full sm:w-[300px]">
                <SelectValue placeholder="Select theme" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Choose your preferred color scheme
            </p>
          </div>
        </div>
      </div>

      <Separator />

      <div>
        <h3 className="text-sm font-medium mb-4">Language & Region</h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="locale">Preferred Locale</Label>
            <Select
              value={localPreferences.preferred_locale || "en"}
              onValueChange={(value) =>
                setLocalPreferences({
                  ...localPreferences,
                  preferred_locale: value,
                })
              }
            >
              <SelectTrigger id="locale" className="w-full sm:w-[300px]">
                <SelectValue placeholder="Select locale" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="fr">Français</SelectItem>
                <SelectItem value="zh">中文</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Select your preferred language
            </p>
          </div>
        </div>
      </div>

      {/* Interface section removed as requested */}
    </div>
  )

  const renderNotificationsSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium mb-4">Notification Preferences</h3>
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <Checkbox
              id="notifications-enabled"
              checked={localPreferences.notifications_enabled ?? true}
              onCheckedChange={(checked) =>
                setLocalPreferences({
                  ...localPreferences,
                  notifications_enabled: checked as boolean,
                })
              }
            />
            <div className="flex-1">
              <Label
                htmlFor="notifications-enabled"
                className="text-sm font-normal cursor-pointer"
              >
                Enable notifications
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                Receive notifications about important updates and events
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* User guide section removed as requested */}
    </div>
  )

  const renderContent = () => {
    switch (selectedCategory) {
      case "general":
        return renderGeneralSettings()
      case "notifications":
        return renderNotificationsSettings()
      default:
        return null
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(open) => {
        if (!open) {
          handleClose()
        } else {
          onOpenChange(open)
        }
      }}>
        <DialogContent className="max-w-5xl h-[80vh] p-0 flex flex-col overflow-hidden sm:max-w-5xl max-w-[calc(100%-3rem)] sm:h-[72vh]">
          <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-4 border-b">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-lg sm:text-xl">Settings</DialogTitle>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleClose()}
                className="h-8 w-8"
              >
                <IconX className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>

        <div className="flex flex-col sm:flex-row flex-1 overflow-hidden">
          {/* Side Navigation */}
          <div className="w-full sm:w-64 border-b sm:border-b-0 sm:border-r bg-muted/30 flex-shrink-0 overflow-x-auto sm:overflow-y-auto">
            <nav className="p-3 sm:p-4 flex sm:flex-col gap-1 sm:space-y-1">
              {categories.map((category) => {
                const Icon = category.icon
                const isActive = selectedCategory === category.id
                return (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap",
                      isActive
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{category.label}</span>
                  </button>
                )
              })}
            </nav>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-4 sm:p-6">
              {renderContent()}
            </div>
          </div>
        </div>

        {/* Footer with Save Button */}
        <div className="border-t px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => handleClose()}
            disabled={saving}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button 
            onClick={() => { handleSave(); onOpenChange(false) }} 
            disabled={saving || !hasChanges()} 
            className="w-full sm:w-auto"
          >
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    {/* Confirmation Dialog */}
    <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle>Unsaved Changes</DialogTitle>
          <DialogDescription>
            You have unsaved changes. What would you like to do?
          </DialogDescription>
        </DialogHeader>
        {getChangedFields().length > 0 && (
          <div className="px-4 pb-2">
            <p className="text-sm font-medium mb-1">Changed settings:</p>
            <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
              {getChangedFields().map((field) => (
                <li key={field}>{field}</li>
              ))}
            </ul>
          </div>
        )}
        <div className="px-4 pb-4 pt-2 flex flex-col sm:flex-row justify-end gap-2">
          <Button
            variant="outline"
            onClick={handleConfirmDiscard}
            disabled={saving}
            className="w-full sm:w-auto"
          >
            Discard Changes
          </Button>
          <Button
            onClick={handleConfirmSave}
            disabled={saving}
            className="w-full sm:w-auto"
          >
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    </>
  )
}
