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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useTranslation } from '@/components/i18n-text'
import {
  type ModifierOption,
  type CreateModifierOptionData,
  type UpdateModifierOptionData,
} from '@/lib/api/menu-modifier-options'
import { type ModifierGroup } from '@/lib/api/menu-modifier-groups'
import { cn } from '@/lib/utils'
import { IconSettings, IconCurrencyDollar, IconCheck } from '@tabler/icons-react'

interface ModifierOptionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  option?: ModifierOption | null
  groups: ModifierGroup[]
  onSave: (data: CreateModifierOptionData | UpdateModifierOptionData) => Promise<void>
}

type ModifierOptionCategory = 'general' | 'pricing' | 'availability'

interface CategoryConfig {
  id: ModifierOptionCategory
  label: string
  icon: React.ComponentType<{ className?: string }>
}

export function ModifierOptionDialog({
  open,
  onOpenChange,
  option,
  groups,
  onSave,
}: ModifierOptionDialogProps) {
  const { t } = useTranslation()
  const isEditing = !!option
  const [selectedCategory, setSelectedCategory] = useState<ModifierOptionCategory>('general')

  const [modifierGroupId, setModifierGroupId] = useState<string>('')
  const [name, setName] = useState('')
  const [priceDelta, setPriceDelta] = useState('0.00')
  const [visible, setVisible] = useState(true)
  const [available, setAvailable] = useState(true)

  const [errors, setErrors] = useState<{
    name?: string
    modifier_group_id?: string
    price_delta?: string
  }>({})
  const [isSaving, setIsSaving] = useState(false)

  // Category configuration
  const getCategories = (): CategoryConfig[] => [
    {
      id: 'general',
      label: t('menu.modifiers.options.categories.general'),
      icon: IconSettings,
    },
    {
      id: 'pricing',
      label: t('menu.modifiers.options.categories.pricing'),
      icon: IconCurrencyDollar,
    },
    {
      id: 'availability',
      label: t('menu.modifiers.options.categories.availability'),
      icon: IconCheck,
    },
  ]

  // Reset form when dialog opens/closes or option changes
  useEffect(() => {
    if (open) {
      // Reset to general category when dialog opens
      setSelectedCategory('general')

      if (option) {
        setModifierGroupId(option.modifier_group_id)
        setName(option.name)
        setPriceDelta(option.price_delta.toFixed(2))
        setVisible(option.visible)
        setAvailable(option.available)
      } else {
        setModifierGroupId('')
        setName('')
        setPriceDelta('0.00')
        setVisible(true)
        setAvailable(true)
      }
      setErrors({})
    }
  }, [open, option])

  const validate = (): boolean => {
    const newErrors: {
      name?: string
      modifier_group_id?: string
      price_delta?: string
    } = {}

    if (!name.trim()) {
      newErrors.name = t('menu.modifiers.options.nameRequired')
    }

    if (!isEditing && !modifierGroupId) {
      newErrors.modifier_group_id = t('menu.modifiers.options.groupRequired')
    }

    const priceNum = parseFloat(priceDelta)
    if (isNaN(priceNum)) {
      newErrors.price_delta = t('menu.modifiers.options.priceDeltaInvalid')
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
      const data: CreateModifierOptionData | UpdateModifierOptionData = {
        name: name.trim(),
        price_delta: parseFloat(priceDelta),
        visible,
        available,
      }

      // Only include modifier_group_id when creating
      if (!isEditing) {
        (data as CreateModifierOptionData).modifier_group_id = modifierGroupId
      }

      await onSave(data)
      onOpenChange(false)
    } catch (error) {
      // Error handling is done in parent component
      console.error('Error saving modifier option:', error)
    } finally {
      setIsSaving(false)
    }
  }

  // Render functions for each category
  const renderGeneral = () => (
    <div className="space-y-6">
      {/* Modifier Group Selection (only when creating) */}
      {!isEditing && (
        <>
          <div className="grid gap-2.5">
            <div className="flex items-baseline gap-1.5">
              <Label htmlFor="modifierGroup" className="text-sm font-medium">
                {t('menu.modifiers.options.group')}
              </Label>
              <span className="text-destructive text-sm">*</span>
            </div>
            <Select
              value={modifierGroupId}
              onValueChange={(value) => {
                setModifierGroupId(value)
                if (errors.modifier_group_id) {
                  setErrors({ ...errors, modifier_group_id: undefined })
                }
              }}
            >
              <SelectTrigger
                className={cn(errors.modifier_group_id && 'border-destructive')}
              >
                <SelectValue placeholder={t('menu.modifiers.options.selectGroup')} />
              </SelectTrigger>
              <SelectContent>
                {groups.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.modifier_group_id && (
              <p className="text-sm text-destructive mt-0.5">{errors.modifier_group_id}</p>
            )}
          </div>

          <Separator />
        </>
      )}

      {/* Name */}
      <div className="grid gap-2.5">
        <div className="flex items-baseline gap-1.5">
          <Label htmlFor="name" className="text-sm font-medium">
            {t('menu.modifiers.options.name')}
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
          placeholder={t('menu.modifiers.options.namePlaceholder')}
          className={errors.name ? 'border-destructive' : ''}
        />
        {errors.name && (
          <p className="text-sm text-destructive mt-0.5">{errors.name}</p>
        )}
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
            {t('menu.modifiers.options.visible')}
          </Label>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {t('menu.modifiers.options.visibleDescription')}
          </p>
        </div>
      </div>
    </div>
  )

  const renderPricing = () => (
    <div className="space-y-6">
      <div>
        <Label className="text-sm font-medium mb-3 block">
          {t('menu.modifiers.options.priceDelta')}
        </Label>
        <p className="text-xs text-muted-foreground mb-4">
          {t('menu.modifiers.options.priceDeltaDescription')}
        </p>

        <div className="grid gap-2.5">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              $
            </span>
            <Input
              id="priceDelta"
              type="number"
              step="0.01"
              value={priceDelta}
              onChange={(e) => {
                setPriceDelta(e.target.value)
                if (errors.price_delta) {
                  setErrors({ ...errors, price_delta: undefined })
                }
              }}
              placeholder="0.00"
              className={cn('pl-7', errors.price_delta && 'border-destructive')}
            />
          </div>
          {errors.price_delta && (
            <p className="text-sm text-destructive mt-0.5">{errors.price_delta}</p>
          )}

          {/* Price Delta Preview */}
          <div className="p-3 rounded-md border bg-muted/30">
            <Label className="text-xs font-medium text-muted-foreground mb-2 block">
              {t('menu.modifiers.options.priceDeltaPreview')}
            </Label>
            <PriceDeltaDisplay priceDelta={parseFloat(priceDelta) || 0} />
          </div>
        </div>
      </div>
    </div>
  )

  const renderAvailability = () => (
    <div className="space-y-6">
      <div>
        <Label className="text-sm font-medium mb-3 block">
          {t('menu.modifiers.options.availability')}
        </Label>
        <p className="text-xs text-muted-foreground mb-4">
          {t('menu.modifiers.options.availabilityDescription')}
        </p>

        <div className="flex items-start gap-3">
          <div className="pt-0.5">
            <Checkbox
              id="available"
              checked={available}
              onCheckedChange={(checked) => setAvailable(checked === true)}
            />
          </div>
          <div className="grid gap-1 flex-1">
            <Label
              htmlFor="available"
              className="text-sm font-medium leading-normal cursor-pointer"
            >
              {t('menu.modifiers.options.available')}
            </Label>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {t('menu.modifiers.options.availableDescription')}
            </p>
          </div>
        </div>
      </div>
    </div>
  )

  function PriceDeltaDisplay({ priceDelta }: { priceDelta: number }) {
    if (priceDelta === 0) {
      return (
        <Badge variant="secondary" className="text-xs font-normal">
          $0.00
        </Badge>
      )
    }
    
    const isPositive = priceDelta > 0
    const formatted = `$${Math.abs(priceDelta).toFixed(2)}`
    
    return (
      <Badge 
        variant={isPositive ? "default" : "destructive"} 
        className="text-xs font-normal"
      >
        {isPositive ? '+' : '-'}{formatted}
      </Badge>
    )
  }

  const renderContent = () => {
    switch (selectedCategory) {
      case 'general':
        return renderGeneral()
      case 'pricing':
        return renderPricing()
      case 'availability':
        return renderAvailability()
      default:
        return null
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[80vh] p-0 flex flex-col overflow-hidden sm:max-w-5xl max-w-[calc(100%-3rem)] sm:h-[72vh]">
        <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-4 border-b">
          <DialogTitle className="text-lg sm:text-xl">
            {isEditing ? t('menu.modifiers.options.editOption') : t('menu.modifiers.options.createOption')}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? t('menu.modifiers.options.editOptionDescription') 
              : t('menu.modifiers.options.createOptionDescription')}
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
            onClick={() => onOpenChange(false)}
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
  )
}

