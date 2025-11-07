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
import { type MenuItemWithCategory } from '@/lib/api/menu-items'
import { type MenuCategory } from '@/lib/api/menu-categories'
import { cn } from '@/lib/utils'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { IconCheck, IconChevronDown, IconX } from '@tabler/icons-react'

interface PromotionItemDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item?: PromotionItemWithRelations | null
  promotions: Array<{ id: string; name: string; type: string }>
  menuItems: MenuItemWithCategory[]
  menuCategories?: MenuCategory[]
  existingAssociations: Array<{ promotion_id: string; menu_item_id: string }>
  existingItems?: PromotionItemWithRelations[] // For BOGO auto-role calculation
  onSave: (data: CreatePromotionItemData | UpdatePromotionItemData) => Promise<void>
  presetPromotionId?: string // When provided, preset and disable promotion selection
}

export function PromotionItemDialog({
  open,
  onOpenChange,
  item,
  promotions,
  menuItems,
  menuCategories = [],
  existingAssociations,
  existingItems = [],
  onSave,
  presetPromotionId,
}: PromotionItemDialogProps) {
  const { t } = useTranslation()
  const isEditing = !!item
  const promotion = promotions.find(p => p.id === (presetPromotionId || item?.promotion_id))
  const isBOGO = promotion?.type === 'bogo'
  
  const [promotionId, setPromotionId] = useState('')
  const [selectedMenuItemIds, setSelectedMenuItemIds] = useState<string[]>([])
  const [menuItemOpen, setMenuItemOpen] = useState(false)
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
  
  // Get selected menu item names for display
  const selectedMenuItems = menuItems.filter(item => selectedMenuItemIds.includes(item.id))

  // Reset form when dialog opens/closes or item changes
  useEffect(() => {
    if (open) {
      if (item) {
        setPromotionId(item.promotion_id)
        setSelectedMenuItemIds([item.menu_item_id])
        setRole(item.role)
        setRequiredQuantity(item.required_quantity ?? undefined)
        setGetQuantity(item.get_quantity ?? undefined)
      } else {
        setPromotionId(presetPromotionId || '')
        setSelectedMenuItemIds([])
        // Auto-set role for BOGO based on existing items
        if (isBOGO) {
          const buyItems = existingItems.filter(i => i.role === 'buy')
          const getItems = existingItems.filter(i => i.role === 'get')
          // If no buy items, first item is buy. Otherwise, alternate or set to get
          if (buyItems.length === 0) {
            setRole('buy')
        setRequiredQuantity(1)
            setGetQuantity(undefined)
          } else {
            setRole('get')
            setRequiredQuantity(undefined)
        setGetQuantity(1)
          }
        } else {
          setRole('target')
          setRequiredQuantity(undefined)
          setGetQuantity(undefined)
        }
      }
      setErrors({})
    }
  }, [open, item, presetPromotionId, isBOGO, existingItems])

  const validate = (): boolean => {
    const newErrors: typeof errors = {}

    if (!isEditing && !presetPromotionId && !promotionId) {
      newErrors.promotion_id = t('promotions.items.promotion') + ' ' + t('common.isRequired')
    }

    if (!isEditing && selectedMenuItemIds.length === 0) {
      newErrors.menu_item_id = t('promotions.items.menuItem') + ' ' + t('common.isRequired')
    }

    // Check for duplicates (only when creating)
    if (!isEditing && promotionId && selectedMenuItemIds.length > 0) {
      const duplicates = selectedMenuItemIds.filter(menuItemId => 
        existingAssociations.some(
          (assoc) => assoc.promotion_id === promotionId && assoc.menu_item_id === menuItemId
        )
      )
      if (duplicates.length > 0) {
        newErrors.menu_item_id = t('promotions.items.duplicateItems') || 'Some items are already linked to this promotion'
      }
    }

    // Validate quantities based on role (only for non-BOGO or when editing)
    if (!isBOGO || isEditing) {
    if (role === 'buy' && (!requiredQuantity || requiredQuantity < 1)) {
      newErrors.required_quantity = t('promotions.items.requiredQuantity') + ' ' + t('common.isRequired')
    }

    if (role === 'get' && (!getQuantity || getQuantity < 1)) {
      newErrors.get_quantity = t('promotions.items.getQuantity') + ' ' + t('common.isRequired')
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
      if (isEditing) {
        await onSave({
          role,
          required_quantity: role === 'buy' ? requiredQuantity : null,
          get_quantity: role === 'get' ? getQuantity : null,
        } as UpdatePromotionItemData)
      } else {
        // For BOGO, auto-assign roles: first items are "buy", rest are "get"
        if (isBOGO) {
          const buyItems = existingItems.filter(i => i.role === 'buy')
          const getItems = existingItems.filter(i => i.role === 'get')
          
          // Create items with auto-assigned roles
          // For BOGO, both required_quantity and get_quantity should be set to 1
          for (let i = 0; i < selectedMenuItemIds.length; i++) {
            const menuItemId = selectedMenuItemIds[i]
            const currentBuyCount = buyItems.length + i
            const itemRole = currentBuyCount === 0 ? 'buy' : 'get'
            
            await onSave({
              promotion_id: presetPromotionId || promotionId,
              menu_item_id: menuItemId,
              role: itemRole,
              required_quantity: 1, // Always 1 for BOGO
              get_quantity: 1, // Always 1 for BOGO
            } as CreatePromotionItemData)
          }
        } else {
          // For non-BOGO, create items with the selected role
          for (const menuItemId of selectedMenuItemIds) {
            await onSave({
              promotion_id: presetPromotionId || promotionId,
              menu_item_id: menuItemId,
              role,
              required_quantity: role === 'buy' ? requiredQuantity : null,
              get_quantity: role === 'get' ? getQuantity : null,
            } as CreatePromotionItemData)
          }
        }
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
          {!isEditing && !presetPromotionId && (
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
          )}
          {!isEditing && (
            <>

              <div className="grid gap-2.5">
                <div className="flex items-baseline gap-1.5">
                  <Label htmlFor="menuItem" className="text-sm font-medium">
                    {t('promotions.items.menuItem')}
                  </Label>
                  <span className="text-destructive text-sm">*</span>
                </div>
                <Popover open={menuItemOpen} onOpenChange={setMenuItemOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={menuItemOpen}
                      className={cn(
                        "w-full justify-between min-h-10 h-auto",
                        selectedMenuItemIds.length === 0 && "text-muted-foreground",
                        errors.menu_item_id && "border-destructive"
                      )}
                    >
                      <div className="flex flex-wrap gap-1 flex-1">
                        {selectedMenuItemIds.length === 0 ? (
                          <span>{t('common.selectMenuItem')}</span>
                        ) : selectedMenuItemIds.length === 1 ? (
                          <span>{menuItems.find((item) => item.id === selectedMenuItemIds[0])?.name}</span>
                        ) : (
                          <span>{t('promotions.items.selectedItems', { count: selectedMenuItemIds.length }) || `${selectedMenuItemIds.length} items selected`}</span>
                        )}
                      </div>
                      <IconChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder={t('common.search') || 'Search menu items...'} />
                      <CommandList>
                        <CommandEmpty>{t('common.noResults') || 'No menu items found.'}</CommandEmpty>
                        {menuCategories.map((category) => {
                          const categoryItems = menuItems.filter(
                            (item) => item.category_id === category.id && item.visible
                          )
                          if (categoryItems.length === 0) return null
                          return (
                            <CommandGroup key={category.id} heading={category.name}>
                              {categoryItems.map((item) => {
                                const isSelected = selectedMenuItemIds.includes(item.id)
                                return (
                                  <CommandItem
                                    key={item.id}
                                    value={item.name}
                                    onSelect={() => {
                                      if (isSelected) {
                                        setSelectedMenuItemIds(selectedMenuItemIds.filter(id => id !== item.id))
                                      } else {
                                        setSelectedMenuItemIds([...selectedMenuItemIds, item.id])
                                      }
                                      if (errors.menu_item_id) {
                                        setErrors({ ...errors, menu_item_id: undefined })
                                      }
                                    }}
                                  >
                                    <IconCheck
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        isSelected ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    {item.name}
                                  </CommandItem>
                                )
                              })}
                            </CommandGroup>
                          )
                        })}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {errors.menu_item_id && (
                  <p className="text-sm text-destructive mt-0.5">{errors.menu_item_id}</p>
                )}
                {selectedMenuItemIds.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedMenuItems.map((item) => (
                      <div
                        key={item.id}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-muted rounded-md text-sm"
                      >
                        <span>{item.name}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedMenuItemIds(selectedMenuItemIds.filter(id => id !== item.id))
                          }}
                          className="ml-1 hover:opacity-70"
                        >
                          <IconX className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {!isBOGO && (
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
          )}

          {!isBOGO && role === 'buy' && (
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

          {!isBOGO && role === 'get' && (
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

