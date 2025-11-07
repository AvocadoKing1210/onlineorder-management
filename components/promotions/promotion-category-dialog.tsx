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
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useTranslation } from '@/components/i18n-text'
import {
  type CreatePromotionCategoryData,
} from '@/lib/api/promotion-categories'
import { cn } from '@/lib/utils'

interface PromotionCategoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  promotions: Array<{ id: string; name: string; type: string }>
  categories: Array<{ id: string; name: string; visible: boolean }>
  existingAssociations: Array<{ promotion_id: string; category_id: string }>
  onSave: (data: CreatePromotionCategoryData) => Promise<void>
}

export function PromotionCategoryDialog({
  open,
  onOpenChange,
  promotions,
  categories,
  existingAssociations,
  onSave,
}: PromotionCategoryDialogProps) {
  const { t } = useTranslation()
  const [promotionId, setPromotionId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [errors, setErrors] = useState<{ promotion_id?: string; category_id?: string }>({})

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      setPromotionId('')
      setCategoryId('')
      setErrors({})
    }
  }, [open])

  const validate = (): boolean => {
    const newErrors: { promotion_id?: string; category_id?: string } = {}

    if (!promotionId) {
      newErrors.promotion_id = t('promotions.categoryAssociations.promotion') + ' ' + t('common.isRequired')
    }

    if (!categoryId) {
      newErrors.category_id = t('promotions.categoryAssociations.category') + ' ' + t('common.isRequired')
    }

    // Check for duplicate
    if (promotionId && categoryId) {
      const isDuplicate = existingAssociations.some(
        (assoc) => assoc.promotion_id === promotionId && assoc.category_id === categoryId
      )
      if (isDuplicate) {
        newErrors.promotion_id = t('promotions.categoryAssociations.createFailed')
        newErrors.category_id = t('promotions.categoryAssociations.createFailed')
      }
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
      await onSave({
        promotion_id: promotionId,
        category_id: categoryId,
      })
      onOpenChange(false)
    } catch (error) {
      // Error handling is done in parent component
      console.error('Error saving promotion category:', error)
    } finally {
      setIsSaving(false)
    }
  }


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t('promotions.categoryAssociations.createAssociation')}</DialogTitle>
          <DialogDescription>
            {t('promotions.categoryAssociations.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 px-4">
          <div className="grid gap-2.5">
            <div className="flex items-baseline gap-1.5">
              <Label htmlFor="promotion" className="text-sm font-medium">
                {t('promotions.categoryAssociations.promotion')}
              </Label>
              <span className="text-destructive text-sm">*</span>
            </div>
            <Select
              value={promotionId}
              onValueChange={(value) => {
                setPromotionId(value)
                if (errors.promotion_id) {
                  setErrors({ ...errors, promotion_id: undefined })
                }
              }}
            >
              <SelectTrigger id="promotion" className={cn(errors.promotion_id && 'border-destructive')}>
                <SelectValue placeholder={t('common.selectPromotion')} />
              </SelectTrigger>
              <SelectContent>
                {promotions.map((promotion) => (
                  <SelectItem key={promotion.id} value={promotion.id}>
                    {promotion.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.promotion_id && (
              <p className="text-sm text-destructive mt-0.5">{errors.promotion_id}</p>
            )}
          </div>

          <div className="grid gap-2.5">
            <div className="flex items-baseline gap-1.5">
              <Label htmlFor="category" className="text-sm font-medium">
                {t('promotions.categoryAssociations.category')}
              </Label>
              <span className="text-destructive text-sm">*</span>
            </div>
            <Select
              value={categoryId}
              onValueChange={(value) => {
                setCategoryId(value)
                if (errors.category_id) {
                  setErrors({ ...errors, category_id: undefined })
                }
              }}
            >
              <SelectTrigger id="category" className={cn(errors.category_id && 'border-destructive')}>
                <SelectValue placeholder={t('common.selectCategory')} />
              </SelectTrigger>
              <SelectContent>
                {categories
                  .filter((c) => c.visible)
                  .map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            {errors.category_id && (
              <p className="text-sm text-destructive mt-0.5">{errors.category_id}</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
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

