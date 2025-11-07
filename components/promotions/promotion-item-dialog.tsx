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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useTranslation } from '@/components/i18n-text'
import {
  type CreatePromotionItemData,
  type UpdatePromotionItemData,
  type PromotionItemWithRelations,
} from '@/lib/api/promotion-items'
import { cn } from '@/lib/utils'

interface PromotionItemDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item?: PromotionItemWithRelations | null
  promotions: Array<{ id: string; name: string; type: string }>
  menuItems: Array<{ id: string; name: string; visible: boolean }>
  existingAssociations: Array<{ promotion_id: string; menu_item_id: string }>
  onSave: (data: CreatePromotionItemData | UpdatePromotionItemData) => Promise<void>
}

export function PromotionItemDialog({
  open,
  onOpenChange,
  item,
  promotions,
  menuItems,
  existingAssociations,
  onSave,
}: PromotionItemDialogProps) {
  const { t } = useTranslation()
  const isEditing = !!item
  const [promotionId, setPromotionId] = useState('')
  const [menuItemId, setMenuItemId] = useState('')
  const [role, setRole] = useState<'buy' | 'get' | 'target'>('target')
  const [requiredQuantity, setRequiredQuantity] = useState<number | undefined>(1)
  const [getQuantity, setGetQuantity] = useState<number | undefined>(1)
  const [isSaving, setIsSaving] = useState(false)
  const [errors, setErrors] = useState<{
    promotion_id?: string
    menu_item_id?: string
    role?: string
    required_quantity?: string
    get_quantity?: string
  }>({})

  // Reset form when dialog opens/closes or item changes
  useEffect(() => {
    if (open) {
      if (item) {
        setPromotionId(item.promotion_id)
        setMenuItemId(item.menu_item_id)
        setRole(item.role)
        setRequiredQuantity(item.required_quantity ?? undefined)
        setGetQuantity(item.get_quantity ?? undefined)
      } else {
        setPromotionId('')
        setMenuItemId('')
        setRole('target')
        setRequiredQuantity(1)
        setGetQuantity(1)
      }
      setErrors({})
    }
  }, [open, item])

  const validate = (): boolean => {
    const newErrors: typeof errors = {}

    if (!isEditing && !promotionId) {
      newErrors.promotion_id = t('promotions.items.promotion') + ' ' + t('common.isRequired')
    }

    if (!isEditing && !menuItemId) {
      newErrors.menu_item_id = t('promotions.items.menuItem') + ' ' + t('common.isRequired')
    }

    // Check for duplicate (only when creating)
    if (!isEditing && promotionId && menuItemId) {
      const isDuplicate = existingAssociations.some(
        (assoc) => assoc.promotion_id === promotionId && assoc.menu_item_id === menuItemId
      )
      if (isDuplicate) {
        newErrors.promotion_id = t('promotions.items.createFailed')
        newErrors.menu_item_id = t('promotions.items.createFailed')
      }
    }

    // Validate quantities based on role
    if (role === 'buy' && (!requiredQuantity || requiredQuantity < 1)) {
      newErrors.required_quantity = t('promotions.items.requiredQuantity') + ' ' + t('common.isRequired')
    }

    if (role === 'get' && (!getQuantity || getQuantity < 1)) {
      newErrors.get_quantity = t('promotions.items.getQuantity') + ' ' + t('common.isRequired')
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
      if (isEditing) {
        await onSave({
          role,
          required_quantity: role === 'buy' ? requiredQuantity : null,
          get_quantity: role === 'get' ? getQuantity : null,
        } as UpdatePromotionItemData)
      } else {
        await onSave({
          promotion_id: promotionId,
          menu_item_id: menuItemId,
          role,
          required_quantity: role === 'buy' ? requiredQuantity : null,
          get_quantity: role === 'get' ? getQuantity : null,
        } as CreatePromotionItemData)
      }
      onOpenChange(false)
    } catch (error) {
      console.error('Error saving promotion item:', error)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing
              ? t('promotions.items.editAssociation')
              : t('promotions.items.createAssociation')}
          </DialogTitle>
          <DialogDescription>{t('promotions.items.description')}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 px-4">
          {!isEditing && (
            <>
              <div className="grid gap-2.5">
                <div className="flex items-baseline gap-1.5">
                  <Label htmlFor="promotion" className="text-sm font-medium">
                    {t('promotions.items.promotion')}
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
                  <Label htmlFor="menuItem" className="text-sm font-medium">
                    {t('promotions.items.menuItem')}
                  </Label>
                  <span className="text-destructive text-sm">*</span>
                </div>
                <Select
                  value={menuItemId}
                  onValueChange={(value) => {
                    setMenuItemId(value)
                    if (errors.menu_item_id) {
                      setErrors({ ...errors, menu_item_id: undefined })
                    }
                  }}
                >
                  <SelectTrigger id="menuItem" className={cn(errors.menu_item_id && 'border-destructive')}>
                    <SelectValue placeholder={t('common.selectMenuItem')} />
                  </SelectTrigger>
                  <SelectContent>
                    {menuItems
                      .filter((item) => item.visible)
                      .map((menuItem) => (
                        <SelectItem key={menuItem.id} value={menuItem.id}>
                          {menuItem.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {errors.menu_item_id && (
                  <p className="text-sm text-destructive mt-0.5">{errors.menu_item_id}</p>
                )}
              </div>
            </>
          )}

          <div className="grid gap-2.5">
            <div className="flex items-baseline gap-1.5">
              <Label htmlFor="role" className="text-sm font-medium">
                {t('promotions.items.role')}
              </Label>
              <span className="text-destructive text-sm">*</span>
            </div>
            <Select
              value={role}
              onValueChange={(value) => {
                setRole(value as 'buy' | 'get' | 'target')
                // Reset quantities when role changes
                if (value === 'target') {
                  setRequiredQuantity(undefined)
                  setGetQuantity(undefined)
                } else if (value === 'buy') {
                  setRequiredQuantity(1)
                  setGetQuantity(undefined)
                } else if (value === 'get') {
                  setRequiredQuantity(undefined)
                  setGetQuantity(1)
                }
                if (errors.role) {
                  setErrors({ ...errors, role: undefined })
                }
              }}
            >
              <SelectTrigger id="role" className={cn(errors.role && 'border-destructive')}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="buy">{t('promotions.items.roleBuy')}</SelectItem>
                <SelectItem value="get">{t('promotions.items.roleGet')}</SelectItem>
                <SelectItem value="target">{t('promotions.items.roleTarget')}</SelectItem>
              </SelectContent>
            </Select>
            {errors.role && <p className="text-sm text-destructive mt-0.5">{errors.role}</p>}
          </div>

          {role === 'buy' && (
            <div className="grid gap-2.5">
              <div className="flex items-baseline gap-1.5">
                <Label htmlFor="requiredQuantity" className="text-sm font-medium">
                  {t('promotions.items.requiredQuantity')}
                </Label>
                <span className="text-destructive text-sm">*</span>
              </div>
              <Input
                id="requiredQuantity"
                type="number"
                min="1"
                value={requiredQuantity ?? ''}
                onChange={(e) => {
                  const value = e.target.value
                  setRequiredQuantity(value ? parseInt(value, 10) : undefined)
                  if (errors.required_quantity) {
                    setErrors({ ...errors, required_quantity: undefined })
                  }
                }}
                placeholder="1"
                className={cn(errors.required_quantity && 'border-destructive')}
              />
              {errors.required_quantity && (
                <p className="text-sm text-destructive mt-0.5">{errors.required_quantity}</p>
              )}
            </div>
          )}

          {role === 'get' && (
            <div className="grid gap-2.5">
              <div className="flex items-baseline gap-1.5">
                <Label htmlFor="getQuantity" className="text-sm font-medium">
                  {t('promotions.items.getQuantity')}
                </Label>
                <span className="text-destructive text-sm">*</span>
              </div>
              <Input
                id="getQuantity"
                type="number"
                min="1"
                value={getQuantity ?? ''}
                onChange={(e) => {
                  const value = e.target.value
                  setGetQuantity(value ? parseInt(value, 10) : undefined)
                  if (errors.get_quantity) {
                    setErrors({ ...errors, get_quantity: undefined })
                  }
                }}
                placeholder="1"
                className={cn(errors.get_quantity && 'border-destructive')}
              />
              {errors.get_quantity && (
                <p className="text-sm text-destructive mt-0.5">{errors.get_quantity}</p>
              )}
            </div>
          )}
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

