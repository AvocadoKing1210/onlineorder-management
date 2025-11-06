'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useTranslation } from '@/components/i18n-text'
import {
  type ModifierGroup,
  type CreateModifierGroupData,
  type UpdateModifierGroupData,
} from '@/lib/api/menu-modifier-groups'
import { cn } from '@/lib/utils'
import { IconSettings, IconList, IconEye } from '@tabler/icons-react'

interface ModifierGroupDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  group?: ModifierGroup | null
  onSave: (data: CreateModifierGroupData | UpdateModifierGroupData) => Promise<void>
}

type ModifierGroupCategory = 'general' | 'options'

interface CategoryConfig {
  id: ModifierGroupCategory
  label: string
  icon: React.ComponentType<{ className?: string }>
}

export function ModifierGroupDialog({
  open,
  onOpenChange,
  group,
  onSave,
}: ModifierGroupDialogProps) {
  const { t } = useTranslation()
  const isEditing = !!group
  const [selectedCategory, setSelectedCategory] = useState<ModifierGroupCategory>('general')

  const [name, setName] = useState('')
  const [minSelect, setMinSelect] = useState(0)
  const [maxSelect, setMaxSelect] = useState(1)
  const [required, setRequired] = useState(false)
  const [visible, setVisible] = useState(true)

  const [errors, setErrors] = useState<{
    name?: string
    min_select?: string
    max_select?: string
  }>({})
  const [isSaving, setIsSaving] = useState(false)
  const [showDiscardDialog, setShowDiscardDialog] = useState(false)
  
  // Store original form values to detect changes
  const [originalValues, setOriginalValues] = useState<{
    name: string
    min_select: number
    max_select: number
    required: boolean
    visible: boolean
  } | null>(null)

  // Category configuration
  const getCategories = (): CategoryConfig[] => [
    {
      id: 'general',
      label: t('menu.modifiers.groups.categories.general'),
      icon: IconSettings,
    },
    {
      id: 'options',
      label: t('menu.modifiers.groups.categories.options'),
      icon: IconList,
    },
  ]

  // Reset form when dialog opens/closes or group changes
  useEffect(() => {
    if (open) {
      // Reset to general category when dialog opens
      setSelectedCategory('general')

      if (group) {
        const nameValue = group.name
        const minSelectValue = group.min_select
        const maxSelectValue = group.max_select
        const requiredValue = group.required
        const visibleValue = group.visible
        
        setName(nameValue)
        setMinSelect(minSelectValue)
        setMaxSelect(maxSelectValue)
        setRequired(requiredValue)
        setVisible(visibleValue)
        
        // Store original values for change detection
        setOriginalValues({
          name: nameValue,
          min_select: minSelectValue,
          max_select: maxSelectValue,
          required: requiredValue,
          visible: visibleValue,
        })
      } else {
        setName('')
        setMinSelect(0)
        setMaxSelect(1)
        setRequired(false)
        setVisible(true)
        
        // Store original values for new group (all empty/default)
        setOriginalValues({
          name: '',
          min_select: 0,
          max_select: 1,
          required: false,
          visible: true,
        })
      }
      setErrors({})
    } else {
      // Reset when dialog closes
      setOriginalValues(null)
      setShowDiscardDialog(false)
    }
  }, [open, group])

  // Update min_select when required changes
  useEffect(() => {
    if (required && minSelect < 1) {
      setMinSelect(1)
      if (errors.min_select) {
        setErrors({ ...errors, min_select: undefined })
      }
    }
  }, [required])

  // Check if form has unsaved changes
  const hasUnsavedChanges = (): boolean => {
    if (!originalValues) return false
    
    return (
      name.trim() !== originalValues.name.trim() ||
      minSelect !== originalValues.min_select ||
      maxSelect !== originalValues.max_select ||
      required !== originalValues.required ||
      visible !== originalValues.visible
    )
  }

  // Handle dialog close with unsaved changes check
  const handleDialogClose = (newOpen: boolean) => {
    if (!newOpen) {
      if (hasUnsavedChanges()) {
        setShowDiscardDialog(true)
      } else {
        onOpenChange(false)
      }
    } else {
      onOpenChange(true)
    }
  }
  
  // Handle discard confirmation
  const handleDiscard = () => {
    setShowDiscardDialog(false)
    onOpenChange(false)
  }
  
  // Handle cancel discard (keep editing)
  const handleKeepEditing = () => {
    setShowDiscardDialog(false)
  }

  const validate = (): boolean => {
    const newErrors: {
      name?: string
      min_select?: string
      max_select?: string
    } = {}

    if (!name.trim()) {
      newErrors.name = t('menu.modifiers.groups.nameRequired')
    }

    if (minSelect < 0) {
      newErrors.min_select = t('menu.modifiers.groups.minSelectInvalid')
    }

    if (maxSelect < minSelect) {
      newErrors.max_select = t('menu.modifiers.groups.maxSelectInvalid')
    }

    if (required && minSelect < 1) {
      newErrors.min_select = t('menu.modifiers.groups.requiredMinSelect')
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = async () => {
    if (!validate()) {
      return
    }

    setIsSaving(true)
    try {
      const data: CreateModifierGroupData | UpdateModifierGroupData = {
        name: name.trim(),
        min_select: minSelect,
        max_select: maxSelect,
        required,
        visible,
      }

      await onSave(data)
      
      // Update original values after successful save
      setOriginalValues({
        name: name.trim(),
        min_select: minSelect,
        max_select: maxSelect,
        required,
        visible,
      })
      
      onOpenChange(false)
    } catch (error) {
      // Error handling is done in parent component
      console.error('Error saving modifier group:', error)
    } finally {
      setIsSaving(false)
    }
  }

  // Render functions for each category
  const renderGeneral = () => (
    <div className="space-y-6">
      {/* Name */}
      <div className="grid gap-2.5">
        <div className="flex items-baseline gap-1.5">
          <Label htmlFor="name" className="text-sm font-medium">
            {t('menu.modifiers.groups.name')}
          </Label>
          <span className="text-destructive text-sm">*</span>
        </div>
        <Input
          id="name"
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            if (errors.name) {
              setErrors({ ...errors, name: undefined })
            }
          }}
          placeholder={t('menu.modifiers.groups.namePlaceholder')}
          className={errors.name ? 'border-destructive' : ''}
        />
        {errors.name && (
          <p className="text-sm text-destructive mt-0.5">{errors.name}</p>
        )}
      </div>

      <Separator />

      {/* Selection Rules */}
      <div className="grid gap-4">
        <div>
          <Label className="text-sm font-medium mb-3 block">
            {t('menu.modifiers.groups.selectionRules')}
          </Label>
          <p className="text-xs text-muted-foreground mb-4">
            {t('menu.modifiers.groups.selectionRulesDescription')}
          </p>

          <div className="space-y-4">
            {/* Min Select */}
            <div className="grid gap-2.5">
              <Label htmlFor="minSelect" className="text-sm font-medium">
                {t('menu.modifiers.groups.minSelect')}
              </Label>
              <Input
                id="minSelect"
                type="number"
                min="0"
                value={minSelect}
                onChange={(e) => {
                  const value = parseInt(e.target.value) || 0
                  setMinSelect(value)
                  if (errors.min_select) {
                    setErrors({ ...errors, min_select: undefined })
                  }
                  if (errors.max_select && value > maxSelect) {
                    setErrors({ ...errors, max_select: undefined })
                  }
                }}
                className={errors.min_select ? 'border-destructive' : ''}
              />
              {errors.min_select && (
                <p className="text-sm text-destructive mt-0.5">{errors.min_select}</p>
              )}
            </div>

            {/* Max Select */}
            <div className="grid gap-2.5">
              <Label htmlFor="maxSelect" className="text-sm font-medium">
                {t('menu.modifiers.groups.maxSelect')}
              </Label>
              <Input
                id="maxSelect"
                type="number"
                min={minSelect}
                value={maxSelect}
                onChange={(e) => {
                  const value = parseInt(e.target.value) || minSelect
                  setMaxSelect(Math.max(value, minSelect))
                  if (errors.max_select) {
                    setErrors({ ...errors, max_select: undefined })
                  }
                }}
                className={errors.max_select ? 'border-destructive' : ''}
              />
              {errors.max_select && (
                <p className="text-sm text-destructive mt-0.5">{errors.max_select}</p>
              )}
            </div>

            {/* Required */}
            <div className="flex items-start gap-3">
              <div className="pt-0.5">
                <Checkbox
                  id="required"
                  checked={required}
                  onCheckedChange={(checked) => {
                    setRequired(checked === true)
                    if (checked && minSelect < 1) {
                      setMinSelect(1)
                    }
                  }}
                />
              </div>
              <div className="grid gap-1 flex-1">
                <Label
                  htmlFor="required"
                  className="text-sm font-medium leading-normal cursor-pointer"
                >
                  {t('menu.modifiers.groups.required')}
                </Label>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {t('menu.modifiers.groups.requiredDescription')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Separator />

      {/* Visibility */}
      <div className="flex items-start gap-3">
        <div className="pt-0.5">
          <Checkbox
            id="visible"
            checked={visible}
            onCheckedChange={(checked) => setVisible(checked === true)}
          />
        </div>
        <div className="grid gap-1 flex-1">
          <Label
            htmlFor="visible"
            className="text-sm font-medium leading-normal cursor-pointer"
          >
            {t('menu.modifiers.groups.visible')}
          </Label>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {t('menu.modifiers.groups.visibleDescription')}
          </p>
        </div>
      </div>

      {/* Rules Preview */}
      <div className="p-3 rounded-md border bg-muted/30">
        <Label className="text-xs font-medium text-muted-foreground mb-2 block">
          {t('menu.modifiers.groups.rulesPreview')}
        </Label>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs font-normal">
            {minSelect === maxSelect
              ? minSelect === 1
                ? t('menu.modifiers.groups.selectExactlyOne')
                : t('menu.modifiers.groups.selectExactly', { count: minSelect })
              : minSelect === 0
              ? t('menu.modifiers.groups.selectUpTo', { count: maxSelect })
              : t('menu.modifiers.groups.selectRange', { min: minSelect, max: maxSelect })}
          </Badge>
          {required && (
            <Badge variant="outline" className="text-xs">
              {t('menu.modifiers.groups.required')}
            </Badge>
          )}
        </div>
      </div>
    </div>
  )

  const renderOptions = () => {
    const optionCount = group?.option_count ?? 0
    return (
      <div className="space-y-6">
        <div>
          <Label className="text-sm font-medium mb-2 block">
            {t('menu.modifiers.groups.options')}
          </Label>
          <p className="text-xs text-muted-foreground mb-4">
            {t('menu.modifiers.groups.optionsDescription')}
          </p>

          {isEditing ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-md border bg-muted/30">
                <div className="flex items-center gap-2">
                  <IconList className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">
                      {optionCount === 0
                        ? t('menu.modifiers.groups.noOptions')
                        : optionCount === 1
                        ? t('menu.modifiers.groups.optionCount', { count: optionCount })
                        : t('menu.modifiers.groups.optionCountPlural', { count: optionCount })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t('menu.modifiers.groups.optionsHint')}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // Navigate to options page with filter for this group
                    window.location.href = `/menu/modifiers/options?group=${group?.id}`
                  }}
                >
                  {t('menu.modifiers.groups.manageOptions')}
                </Button>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-md border bg-muted/30">
              <p className="text-sm text-muted-foreground">
                {t('menu.modifiers.groups.saveToManageOptions')}
              </p>
            </div>
          )}
        </div>
      </div>
    )
  }

  const renderContent = () => {
    switch (selectedCategory) {
      case 'general':
        return renderGeneral()
      case 'options':
        return renderOptions()
      default:
        return null
    }
  }

  return (
    <>
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogContent 
        className="max-w-5xl h-[80vh] p-0 flex flex-col overflow-hidden sm:max-w-5xl max-w-[calc(100%-3rem)] sm:h-[72vh]"
        onInteractOutside={(e) => {
          if (hasUnsavedChanges()) {
            e.preventDefault()
            setShowDiscardDialog(true)
          }
        }}
        onEscapeKeyDown={(e) => {
          if (hasUnsavedChanges()) {
            e.preventDefault()
            setShowDiscardDialog(true)
          }
        }}
      >
        <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-4 border-b">
          <DialogTitle className="text-lg sm:text-xl">
            {isEditing ? t('menu.modifiers.groups.editGroup') : t('menu.modifiers.groups.createGroup')}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? t('menu.modifiers.groups.editGroupDescription') 
              : t('menu.modifiers.groups.createGroupDescription')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col sm:flex-row flex-1 overflow-hidden">
          {/* Side Navigation */}
          <div className="w-full sm:w-64 border-b sm:border-b-0 sm:border-r bg-muted/30 flex-shrink-0 overflow-x-auto sm:overflow-y-auto">
            <nav className="p-3 sm:p-4 flex sm:flex-col gap-1 sm:space-y-1">
              {getCategories().map((category) => {
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

        <DialogFooter className="px-4 sm:px-6 py-3 sm:py-4 border-t">
          <Button
            variant="outline"
            onClick={() => handleDialogClose(false)}
            disabled={isSaving}
            className="w-full sm:w-auto"
          >
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto">
            {isSaving ? t('common.saving') : t('common.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    
    {/* Discard Changes Confirmation Dialog */}
    <Dialog open={showDiscardDialog} onOpenChange={setShowDiscardDialog}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle>{t('menu.modifiers.groups.unsavedChanges')}</DialogTitle>
          <DialogDescription>
            {t('menu.modifiers.groups.unsavedChangesDescription')}
          </DialogDescription>
        </DialogHeader>
        <div className="px-4 pb-4 pt-2 flex flex-col sm:flex-row justify-end gap-2">
          <Button
            onClick={handleDiscard}
            disabled={isSaving}
            variant="outline"
            className="w-full sm:w-auto bg-background text-foreground border-border hover:bg-muted"
          >
            {t('menu.modifiers.groups.discardChanges')}
          </Button>
          <Button
            onClick={handleKeepEditing}
            disabled={isSaving}
            className="w-full sm:w-auto bg-foreground text-background hover:bg-foreground/90"
          >
            {t('menu.modifiers.groups.keepEditing')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    </>
  )
}

