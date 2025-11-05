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
import { useTranslation } from '@/components/i18n-text'
import { type MenuCategory, type CreateMenuCategoryData, type UpdateMenuCategoryData } from '@/lib/api/menu-categories'

interface MenuCategoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  category?: MenuCategory | null
  onSave: (data: CreateMenuCategoryData | UpdateMenuCategoryData) => Promise<void>
}

export function MenuCategoryDialog({
  open,
  onOpenChange,
  category,
  onSave,
}: MenuCategoryDialogProps) {
  const { t } = useTranslation()
  const isEditing = !!category

  const [name, setName] = useState('')
  const [visible, setVisible] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [errors, setErrors] = useState<{ name?: string }>({})

  // Reset form when dialog opens/closes or category changes
  useEffect(() => {
    if (open) {
      if (category) {
        setName(category.name)
        setVisible(category.visible)
      } else {
        setName('')
        setVisible(true)
      }
      setErrors({})
    }
  }, [open, category])

  const validate = (): boolean => {
    const newErrors: { name?: string } = {}

    if (!name.trim()) {
      newErrors.name = t('menu.categories.nameRequired')
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
      const data = {
        name: name.trim(),
        visible,
      }

      await onSave(data)
      onOpenChange(false)
    } catch (error) {
      // Error handling is done in parent component
      console.error('Error saving category:', error)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? t('menu.categories.editCategory') : t('menu.categories.createCategory')}
          </DialogTitle>
          <DialogDescription>
            {t('menu.categories.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 px-4">
          <div className="grid gap-2.5">
            <div className="flex items-baseline gap-1.5">
              <Label htmlFor="name" className="text-sm font-medium">
                {t('menu.categories.name')}
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
              placeholder={t('menu.categories.namePlaceholder')}
              className={errors.name ? 'border-destructive' : ''}
            />
            {errors.name && (
              <p className="text-sm text-destructive mt-0.5">{errors.name}</p>
            )}
          </div>


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
                className="text-sm font-medium leading-normal cursor-pointer peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {t('menu.categories.visible')}
              </Label>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {t('menu.categories.visibleDescription')}
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? t('common.saving') : t('common.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

