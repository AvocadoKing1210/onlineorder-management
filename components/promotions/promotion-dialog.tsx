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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { DateRangePicker } from '@/components/ui/date-range-picker'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useTranslation } from '@/components/i18n-text'
import {
  type Promotion,
  type CreatePromotionData,
  type UpdatePromotionData,
} from '@/lib/api/promotions'
import { cn } from '@/lib/utils'
import { IconSettings, IconCalendar, IconTag, IconClock, IconShoppingBag, IconPlus } from '@tabler/icons-react'
import { PromotionItemTable } from '@/components/promotions/promotion-item-table'
import { PromotionItemDialog } from '@/components/promotions/promotion-item-dialog'
import {
  getPromotionItems,
  createPromotionItem,
  updatePromotionItem,
  deletePromotionItem,
  type PromotionItemWithRelations,
  type CreatePromotionItemData,
  type UpdatePromotionItemData,
} from '@/lib/api/promotion-items'
import { getMenuItems, type MenuItemWithCategory } from '@/lib/api/menu-items'
import { getMenuCategories, type MenuCategory } from '@/lib/api/menu-categories'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface PromotionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  promotion?: Promotion | null
  onSave: (data: CreatePromotionData | UpdatePromotionData) => Promise<void>
}

type PromotionCategory = 'general' | 'discount' | 'schedule' | 'items'

interface CategoryConfig {
  id: PromotionCategory
  label: string
  icon: React.ComponentType<{ className?: string }>
}

export function PromotionDialog({
  open,
  onOpenChange,
  promotion,
  onSave,
}: PromotionDialogProps) {
  const { t } = useTranslation()
  const isEditing = !!promotion
  const [selectedCategory, setSelectedCategory] = useState<PromotionCategory>('general')

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<'bogo' | 'percent_off' | 'amount_off'>('percent_off')
  const [percentOff, setPercentOff] = useState<number | undefined>(undefined)
  const [amountOffCents, setAmountOffCents] = useState<number | undefined>(undefined)
  const [amountOffInput, setAmountOffInput] = useState<string>('')
  const [activeFromDate, setActiveFromDate] = useState<Date>(new Date())
  const [activeUntilDate, setActiveUntilDate] = useState<Date | undefined>(undefined)
  const [activeFromTime, setActiveFromTime] = useState<string>('00:00')
  const [activeUntilTime, setActiveUntilTime] = useState<string>('23:59')
  const [stackable, setStackable] = useState(false)
  const [limitPerUser, setLimitPerUser] = useState<number | undefined>(undefined)
  const [limitTotal, setLimitTotal] = useState<number | undefined>(undefined)
  const [isSaving, setIsSaving] = useState(false)
  const [errors, setErrors] = useState<{
    name?: string
    percentOff?: string
    amountOffCents?: string
    activeFrom?: string
    activeUntil?: string
  }>({})

  // Promotion items state
  const [promotionItems, setPromotionItems] = useState<PromotionItemWithRelations[]>([])
  const [menuItems, setMenuItems] = useState<MenuItemWithCategory[]>([])
  const [menuCategories, setMenuCategories] = useState<MenuCategory[]>([])
  const [isLoadingItems, setIsLoadingItems] = useState(false)
  const [itemDialogOpen, setItemDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<PromotionItemWithRelations | null>(null)
  const [deleteItemDialogOpen, setDeleteItemDialogOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<PromotionItemWithRelations | null>(null)

  // Category configuration
  const getCategories = (): CategoryConfig[] => [
    {
      id: 'general',
      label: t('promotions.categories.general'),
      icon: IconSettings,
    },
    {
      id: 'discount',
      label: t('promotions.categories.discount'),
      icon: IconTag,
    },
    {
      id: 'schedule',
      label: t('promotions.categories.schedule'),
      icon: IconCalendar,
    },
    {
      id: 'items',
      label: t('promotions.categories.items') || 'Items',
      icon: IconShoppingBag,
    },
  ]

  // Load promotion items and menu items
  const loadPromotionItems = async () => {
    if (!promotion?.id) {
      setPromotionItems([])
      return
    }
    
    try {
      setIsLoadingItems(true)
      const [itemsData, menuItemsData, categoriesData] = await Promise.all([
        getPromotionItems({ promotion_id: promotion.id }),
        getMenuItems(),
        getMenuCategories(),
      ])
      setPromotionItems(itemsData)
      setMenuItems(menuItemsData)
      setMenuCategories(categoriesData)
    } catch (error) {
      console.error('Error loading promotion items:', error)
      toast.error(t('promotions.items.loadFailed') || 'Failed to load items')
    } finally {
      setIsLoadingItems(false)
    }
  }

  // Promotion item handlers
  const handleCreateItem = () => {
    setEditingItem(null)
    setItemDialogOpen(true)
  }

  const handleEditItem = (item: PromotionItemWithRelations) => {
    setEditingItem(item)
    setItemDialogOpen(true)
  }

  const handleSaveItem = async (data: CreatePromotionItemData | UpdatePromotionItemData) => {
    try {
      if (editingItem) {
        await updatePromotionItem(editingItem.id, data as UpdatePromotionItemData)
        toast.success(t('promotions.items.updated'))
      } else {
        await createPromotionItem(data as CreatePromotionItemData)
        toast.success(t('promotions.items.created'))
      }
      await loadPromotionItems()
      setItemDialogOpen(false)
      setEditingItem(null)
    } catch (error: any) {
      console.error('Error saving promotion item:', error)
      toast.error(error.message || (editingItem ? t('promotions.items.updateFailed') : t('promotions.items.createFailed')))
      throw error
    }
  }

  const handleDeleteItemClick = (id: string) => {
    const item = promotionItems.find((i) => i.id === id)
    if (item) {
      setItemToDelete(item)
      setDeleteItemDialogOpen(true)
    }
  }

  const handleDeleteItemConfirm = async () => {
    if (!itemToDelete) return

    try {
      await deletePromotionItem(itemToDelete.id)
      toast.success(t('promotions.items.deleted'))
      await loadPromotionItems()
      setDeleteItemDialogOpen(false)
      setItemToDelete(null)
    } catch (error: any) {
      console.error('Error deleting promotion item:', error)
      toast.error(t('promotions.items.deleteFailed'))
    }
  }

  // Reset form when dialog opens/closes or promotion changes
  useEffect(() => {
    if (open) {
      // Reset to general category when dialog opens
      setSelectedCategory('general')

      if (promotion) {
        setName(promotion.name)
        setDescription(promotion.description || '')
        setType(promotion.type)
        setPercentOff(promotion.percent_off)
        setAmountOffCents(promotion.amount_off_cents)
        setAmountOffInput(
          promotion.amount_off_cents !== undefined && promotion.amount_off_cents !== null
            ? (promotion.amount_off_cents / 100).toString()
            : ''
        )
        const fromDate = new Date(promotion.active_from)
        setActiveFromDate(fromDate)
        setActiveFromTime(
          `${String(fromDate.getHours()).padStart(2, '0')}:${String(fromDate.getMinutes()).padStart(2, '0')}`
        )
        if (promotion.active_until) {
          const untilDate = new Date(promotion.active_until)
          setActiveUntilDate(untilDate)
          setActiveUntilTime(
            `${String(untilDate.getHours()).padStart(2, '0')}:${String(untilDate.getMinutes()).padStart(2, '0')}`
          )
        } else {
          setActiveUntilDate(undefined)
          setActiveUntilTime('23:59')
        }
        setStackable(promotion.stackable)
        setLimitPerUser(promotion.limit_per_user)
        setLimitTotal(promotion.limit_total)
        loadPromotionItems()
      } else {
        setName('')
        setDescription('')
        setType('percent_off')
        setPercentOff(undefined)
        setAmountOffCents(undefined)
        setAmountOffInput('')
        const now = new Date()
        setActiveFromDate(now)
        setActiveFromTime('00:00')
        setActiveUntilDate(undefined)
        setActiveUntilTime('23:59')
        setStackable(false)
        setLimitPerUser(undefined)
        setLimitTotal(undefined)
      }
      setErrors({})
    }
  }, [open, promotion])

  // Helper function to format time input as user types
  const formatTimeInput = (value: string): string => {
    // Remove all non-digit characters
    const digits = value.replace(/\D/g, '')
    
    // Limit to 4 digits (HHMM)
    const limited = digits.slice(0, 4)
    
    // Add colon after 2 digits if we have more than 2
    if (limited.length > 2) {
      return `${limited.slice(0, 2)}:${limited.slice(2)}`
    }
    
    return limited
  }

  // Helper function to format time on blur (complete partial times)
  const formatTimeOnBlur = (value: string): string => {
    // Remove all non-digit characters
    const digits = value.replace(/\D/g, '')
    
    if (digits.length === 0) {
      return ''
    }
    
    // If we have 1-2 digits, treat as hours and add :00
    if (digits.length <= 2) {
      const hours = digits.padStart(2, '0')
      // Validate hours (0-23)
      const hoursNum = parseInt(hours, 10)
      if (hoursNum > 23) {
        return '23:00'
      }
      return `${hours}:00`
    }
    
    // If we have 3-4 digits, format as HH:MM
    if (digits.length <= 4) {
      const hours = digits.slice(0, 2).padStart(2, '0')
      const minutes = digits.slice(2).padStart(2, '0')
      
      // Validate hours (0-23) and minutes (0-59)
      const hoursNum = parseInt(hours, 10)
      const minutesNum = parseInt(minutes, 10)
      
      const validHours = hoursNum > 23 ? 23 : hoursNum
      const validMinutes = minutesNum > 59 ? 59 : minutesNum
      
      return `${String(validHours).padStart(2, '0')}:${String(validMinutes).padStart(2, '0')}`
    }
    
    // If already formatted (has colon), validate and return
    if (value.includes(':')) {
      const [hours, minutes] = value.split(':')
      const hoursNum = parseInt(hours || '0', 10)
      const minutesNum = parseInt(minutes || '0', 10)
      
      const validHours = hoursNum > 23 ? 23 : hoursNum < 0 ? 0 : hoursNum
      const validMinutes = minutesNum > 59 ? 59 : minutesNum < 0 ? 0 : minutesNum
      
      return `${String(validHours).padStart(2, '0')}:${String(validMinutes).padStart(2, '0')}`
    }
    
    return value
  }

  const validate = (): boolean => {
    const newErrors: typeof errors = {}

    if (!name.trim()) {
      newErrors.name = t('promotions.fields.nameRequired') || 'Name is required'
    }

    if (type === 'percent_off') {
      if (percentOff === undefined || percentOff === null) {
        newErrors.percentOff =
          t('promotions.fields.percentOffRequired') || 'Percent off is required'
      } else if (percentOff < 0 || percentOff > 100) {
        newErrors.percentOff =
          t('promotions.fields.percentOffRange') || 'Must be between 0 and 100'
      }
    }

    if (type === 'amount_off') {
      if (amountOffCents === undefined || amountOffCents === null) {
        newErrors.amountOffCents =
          t('promotions.fields.amountOffRequired') || 'Amount off is required'
      } else if (amountOffCents <= 0) {
        newErrors.amountOffCents =
          t('promotions.fields.amountOffPositive') || 'Must be greater than 0'
      }
    }

    // Start time is optional - if not provided, will default to current time

    if (activeUntilDate) {
      // Use provided start date/time or current time for comparison
      let fromDateTime: Date
      if (activeFromDate) {
        fromDateTime = new Date(activeFromDate)
        const [fromHours, fromMinutes] = activeFromTime.split(':').map(Number)
        fromDateTime.setHours(fromHours, fromMinutes, 0, 0)
      } else {
        fromDateTime = new Date()
        fromDateTime.setSeconds(0, 0)
      }

      const untilDateTime = new Date(activeUntilDate)
      const [untilHours, untilMinutes] = activeUntilTime.split(':').map(Number)
      untilDateTime.setHours(untilHours, untilMinutes, 0, 0)

      if (untilDateTime <= fromDateTime) {
        newErrors.activeUntil =
          t('promotions.fields.activeUntilAfterFrom') ||
          'Active until must be after active from'
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
      // Combine date and time for activeFrom, or use current time if not provided
      let fromDateTime: Date
      if (activeFromDate) {
        fromDateTime = new Date(activeFromDate)
        const [fromHours, fromMinutes] = activeFromTime.split(':').map(Number)
        fromDateTime.setHours(fromHours, fromMinutes, 0, 0)
      } else {
        // Default to current time if start date/time not provided
        fromDateTime = new Date()
        fromDateTime.setSeconds(0, 0) // Round to nearest minute
      }

      // Combine date and time for activeUntil if provided
      let untilDateTime: Date | undefined = undefined
      if (activeUntilDate) {
        untilDateTime = new Date(activeUntilDate)
        const [untilHours, untilMinutes] = activeUntilTime.split(':').map(Number)
        untilDateTime.setHours(untilHours, untilMinutes, 0, 0)
      }

      const data: CreatePromotionData | UpdatePromotionData = {
        name: name.trim(),
        description: description.trim() || undefined,
        type,
        active_from: fromDateTime.toISOString(),
        active_until: untilDateTime ? untilDateTime.toISOString() : undefined,
        stackable,
        limit_per_user: limitPerUser || undefined,
        limit_total: limitTotal || undefined,
      }

      if (type === 'percent_off') {
        data.percent_off = percentOff
      } else if (type === 'amount_off') {
        data.amount_off_cents = amountOffCents
      }

      await onSave(data)
      onOpenChange(false)
    } catch (error) {
      // Error handling is done in parent component
      console.error('Error saving promotion:', error)
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
            {t('promotions.fields.name')}
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
          placeholder={t('promotions.fields.namePlaceholder')}
          className={errors.name ? 'border-destructive' : ''}
        />
        {errors.name && (
          <p className="text-sm text-destructive mt-0.5">{errors.name}</p>
        )}
      </div>

      <Separator />

      {/* Description */}
      <div className="grid gap-2.5">
        <Label htmlFor="description" className="text-sm font-medium">
          {t('promotions.fields.description')}
        </Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t('promotions.fields.descriptionPlaceholder')}
          rows={3}
        />
      </div>

      <Separator />

      {/* Stackable */}
      <div className="flex items-start gap-3">
        <div className="pt-0.5">
          <Checkbox
            id="stackable"
            checked={stackable}
            onCheckedChange={(checked) => setStackable(checked === true)}
          />
        </div>
        <div className="grid gap-1 flex-1">
          <Label
            htmlFor="stackable"
            className="text-sm font-medium leading-normal cursor-pointer"
          >
            {t('promotions.fields.stackable')}
          </Label>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {t('promotions.fields.stackableDescription')}
          </p>
        </div>
      </div>
    </div>
  )

  const renderDiscount = () => (
    <div className="space-y-6">
      {/* Type */}
      <div className="grid gap-2.5">
        <div className="flex items-baseline gap-1.5">
          <Label htmlFor="type" className="text-sm font-medium">
            {t('promotions.fields.type')}
          </Label>
          <span className="text-destructive text-sm">*</span>
        </div>
        <Select
          value={type}
          onValueChange={(value) => {
            setType(value as 'bogo' | 'percent_off' | 'amount_off')
            // Clear discount values when type changes
            setPercentOff(undefined)
            setAmountOffCents(undefined)
            setErrors({})
          }}
        >
          <SelectTrigger id="type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="bogo">
              {t('promotions.fields.typeBogo')}
            </SelectItem>
            <SelectItem value="percent_off">
              {t('promotions.fields.typePercentOff')}
            </SelectItem>
            <SelectItem value="amount_off">
              {t('promotions.fields.typeAmountOff')}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Separator />

      {type === 'percent_off' && (
        <div className="grid gap-2.5">
          <div className="flex items-baseline gap-1.5">
            <Label htmlFor="percentOff" className="text-sm font-medium">
              {t('promotions.fields.percentOff')}
            </Label>
            <span className="text-destructive text-sm">*</span>
          </div>
          <div className="flex rounded-md border border-input shadow-xs overflow-hidden focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]">
            <div className="flex items-center px-3 bg-muted border-r border-input">
              <span className="text-muted-foreground text-sm font-medium">%</span>
            </div>
            <Input
              id="percentOff"
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={percentOff ?? ''}
              onChange={(e) => {
                const value = e.target.value
                setPercentOff(value ? parseFloat(value) : undefined)
                if (errors.percentOff) {
                  setErrors({ ...errors, percentOff: undefined })
                }
              }}
              placeholder="20.00"
              className={cn(
                'border-0 rounded-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0',
                errors.percentOff && 'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40'
              )}
              aria-invalid={errors.percentOff ? 'true' : undefined}
            />
          </div>
          {errors.percentOff && (
            <p className="text-sm text-destructive mt-0.5">
              {errors.percentOff}
            </p>
          )}
        </div>
      )}

      {type === 'amount_off' && (
        <div className="grid gap-2.5">
          <div className="flex items-baseline gap-1.5">
            <Label htmlFor="amountOffCents" className="text-sm font-medium">
              {t('promotions.fields.amountOff')}
            </Label>
            <span className="text-destructive text-sm">*</span>
          </div>
          <div className={cn(
            "flex rounded-md border shadow-xs overflow-hidden focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]",
            errors.amountOffCents ? "border-destructive" : "border-input"
          )}>
            <div className="flex items-center px-3 bg-muted border-r border-input">
              <span className="text-muted-foreground text-sm font-medium">$</span>
            </div>
            <Input
              id="amountOffCents"
              type="text"
              inputMode="decimal"
              min="0"
              value={amountOffInput}
              onChange={(e) => {
                const value = e.target.value
                // Allow empty, numbers, and one decimal point
                if (value === '' || /^\d*\.?\d*$/.test(value)) {
                  setAmountOffInput(value)
                  // Convert to cents only if it's a valid number
                  if (value && !isNaN(parseFloat(value))) {
                    setAmountOffCents(Math.round(parseFloat(value) * 100))
                  } else {
                    setAmountOffCents(undefined)
                  }
                  if (errors.amountOffCents) {
                    setErrors({ ...errors, amountOffCents: undefined })
                  }
                }
              }}
              onBlur={(e) => {
                // Format to 2 decimal places on blur if there's a value
                const value = e.target.value
                if (value && !isNaN(parseFloat(value))) {
                  const numValue = parseFloat(value)
                  setAmountOffInput(numValue.toFixed(2))
                  setAmountOffCents(Math.round(numValue * 100))
                }
              }}
              placeholder="5.00"
              className={cn(
                'border-0 rounded-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0',
                errors.amountOffCents && 'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40'
              )}
              aria-invalid={errors.amountOffCents ? 'true' : undefined}
            />
          </div>
          {errors.amountOffCents && (
            <p className="text-sm text-destructive mt-0.5">
              {errors.amountOffCents}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            {t('promotions.fields.amountOffHint')}
          </p>
        </div>
      )}

      {type === 'bogo' && (
        <div className="p-4 rounded-md border bg-muted/30">
          <p className="text-sm text-muted-foreground">
            {t('promotions.fields.bogoHint') ||
              'BOGO promotions are configured by linking menu items with "buy" and "get" roles in the Promotion Items section.'}
          </p>
        </div>
      )}
    </div>
  )

  const renderSchedule = () => (
    <div className="space-y-6">
      {/* Date Range Picker */}
      <div className="grid gap-2.5">
        <div className="flex items-baseline gap-1.5">
          <Label className="text-sm font-medium">
            {t('promotions.fields.dateRange')}
          </Label>
        </div>
        <DateRangePicker
          initialDateFrom={activeFromDate}
          initialDateTo={activeUntilDate}
          onUpdate={({ range }) => {
            setActiveFromDate(range.from)
            setActiveUntilDate(range.to)
            if (errors.activeFrom || errors.activeUntil) {
              setErrors({ ...errors, activeFrom: undefined, activeUntil: undefined })
            }
          }}
          showCompare={false}
          align="start"
        />
        {errors.activeFrom && (
          <p className="text-sm text-destructive mt-0.5">
            {errors.activeFrom}
          </p>
        )}
      </div>

      <Separator />

      {/* Time Inputs */}
      <div className="grid grid-cols-2 gap-4 items-start">
        {/* Active From Time */}
        <div className="grid gap-2.5">
          <div className="flex items-baseline gap-1.5 h-5">
            <Label htmlFor="activeFromTime" className="text-sm font-medium">
              {t('promotions.fields.startTime')}
            </Label>
          </div>
          <div className={cn(
            "flex rounded-md border shadow-xs overflow-hidden focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]",
            errors.activeFrom ? "border-destructive" : "border-input"
          )}>
            <div className="flex items-center px-3 bg-muted border-r border-input">
              <IconClock className="h-4 w-4 text-muted-foreground" />
            </div>
            <Input
              id="activeFromTime"
              type="text"
              value={activeFromTime}
              placeholder="HH:MM (e.g., 09:00)"
              onChange={(e) => {
                const formatted = formatTimeInput(e.target.value)
                setActiveFromTime(formatted)
                if (errors.activeFrom) {
                  setErrors({ ...errors, activeFrom: undefined })
                }
              }}
              onBlur={(e) => {
                const formatted = formatTimeOnBlur(e.target.value)
                setActiveFromTime(formatted)
              }}
              className={cn(
                'border-0 rounded-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0',
                errors.activeFrom && 'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40'
              )}
              aria-invalid={errors.activeFrom ? 'true' : undefined}
            />
          </div>
          <div className="min-h-[1.25rem]">
            {errors.activeFrom && (
              <p className="text-sm text-destructive">
                {errors.activeFrom}
              </p>
            )}
          </div>
        </div>

        {/* Active Until Time */}
      <div className="grid gap-2.5">
          <div className="flex items-baseline gap-1.5 h-5">
            <Label htmlFor="activeUntilTime" className="text-sm font-medium">
              {t('promotions.fields.endTime')}
        </Label>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className={cn(
                "flex rounded-md border shadow-xs overflow-hidden focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]",
                errors.activeUntil ? "border-destructive" : "border-input",
                !activeUntilDate && "opacity-50"
              )}>
                <div className="flex items-center px-3 bg-muted border-r border-input">
                  <IconClock className="h-4 w-4 text-muted-foreground" />
                </div>
        <Input
                  id="activeUntilTime"
                  type="text"
                  value={activeUntilTime}
                  placeholder="HH:MM (e.g., 23:59)"
          onChange={(e) => {
                    const formatted = formatTimeInput(e.target.value)
                    setActiveUntilTime(formatted)
            if (errors.activeUntil) {
              setErrors({ ...errors, activeUntil: undefined })
            }
          }}
                  onBlur={(e) => {
                    const formatted = formatTimeOnBlur(e.target.value)
                    setActiveUntilTime(formatted)
                  }}
                  className={cn(
                    'border-0 rounded-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0',
                    errors.activeUntil && 'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40'
                  )}
                  aria-invalid={errors.activeUntil ? 'true' : undefined}
                  disabled={!activeUntilDate}
                />
              </div>
            </TooltipTrigger>
            {!activeUntilDate && (
              <TooltipContent>
                <p>{t('promotions.fields.selectEndDate')}</p>
              </TooltipContent>
            )}
          </Tooltip>
          <div className="min-h-[1.25rem]">
        {errors.activeUntil && (
              <p className="text-sm text-destructive">
            {errors.activeUntil}
          </p>
        )}
          </div>
        </div>
      </div>
      <div className="flex items-center mt-1">
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {t('promotions.fields.activeUntilHint')}
        </span>
      </div>

      <Separator />

      {/* Usage Limits */}
      <div className="grid gap-4">
        <div>
          <Label className="text-sm font-medium mb-3 block">
            {t('promotions.fields.limits')}
          </Label>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2.5">
              <Label htmlFor="limitPerUser" className="text-xs text-muted-foreground">
                {t('promotions.fields.limitPerUser')}
              </Label>
              <Input
                id="limitPerUser"
                type="number"
                min="1"
                value={limitPerUser ?? ''}
                onChange={(e) => {
                  const value = e.target.value
                  setLimitPerUser(value ? parseInt(value) : undefined)
                }}
                placeholder={t('promotions.fields.unlimited')}
              />
            </div>

            <div className="grid gap-2.5">
              <Label htmlFor="limitTotal" className="text-xs text-muted-foreground">
                {t('promotions.fields.limitTotal')}
              </Label>
              <Input
                id="limitTotal"
                type="number"
                min="1"
                value={limitTotal ?? ''}
                onChange={(e) => {
                  const value = e.target.value
                  setLimitTotal(value ? parseInt(value) : undefined)
                }}
                placeholder={t('promotions.fields.unlimited')}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const renderItems = () => {
    if (!isEditing) {
      return (
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground text-sm">
            {t('promotions.items.saveFirst') || 'Please save the promotion first to manage items'}
          </p>
        </div>
      )
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium">
              {t('promotions.items.title') || 'Promotion Items'}
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              {t('promotions.items.description') || 'Link menu items to this promotion'}
            </p>
          </div>
          <Button onClick={handleCreateItem} size="sm">
            <IconPlus className="mr-2 h-4 w-4" />
            {t('promotions.items.addItem') || 'Add Item'}
          </Button>
        </div>

        {promotionItems.length === 0 && !isLoadingItems ? (
          <div className="flex flex-col items-center justify-center py-12 border rounded-lg">
            <p className="text-muted-foreground text-sm mb-4">
              {t('promotions.items.noAssociations') || 'No items linked to this promotion'}
            </p>
            <Button onClick={handleCreateItem} size="sm">
              <IconPlus className="mr-2 h-4 w-4" />
              {t('promotions.items.addItem') || 'Add Item'}
            </Button>
          </div>
        ) : (
          <PromotionItemTable
            data={promotionItems}
            promotions={promotion ? [{ id: promotion.id, name: promotion.name }] : []}
            menuItems={menuItems.map((m) => ({ id: m.id, name: m.name, visible: m.visible }))}
            onEdit={handleEditItem}
            onDelete={handleDeleteItemClick}
            isLoading={isLoadingItems}
            promotionType={promotion?.type}
          />
        )}
      </div>
    )
  }

  const renderContent = () => {
    switch (selectedCategory) {
      case 'general':
        return renderGeneral()
      case 'discount':
        return renderDiscount()
      case 'schedule':
        return renderSchedule()
      case 'items':
        return renderItems()
      default:
        return null
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-5xl h-[80vh] p-0 flex flex-col overflow-hidden sm:max-w-5xl max-w-[calc(100%-3rem)] sm:h-[72vh]"
      >
        <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-4 border-b">
          <DialogTitle className="text-lg sm:text-xl">
            {isEditing
              ? t('promotions.editPromotion')
              : t('promotions.createPromotion')}
          </DialogTitle>
          <DialogDescription>
            {t('promotions.description')}
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
                      'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap',
                      isActive
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:bg-background/50 hover:text-foreground'
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
            <div className="p-4 sm:p-6">{renderContent()}</div>
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

      {/* Promotion Item Dialog */}
      {isEditing && (
        <>
          <PromotionItemDialog
            open={itemDialogOpen}
            onOpenChange={setItemDialogOpen}
            item={editingItem}
            promotions={promotion ? [{ id: promotion.id, name: promotion.name, type: promotion.type }] : []}
            menuItems={menuItems}
            menuCategories={menuCategories}
            existingAssociations={promotionItems.map((i) => ({
              promotion_id: i.promotion_id,
              menu_item_id: i.menu_item_id,
            }))}
            existingItems={promotionItems}
            onSave={handleSaveItem}
            presetPromotionId={promotion?.id}
          />

          <AlertDialog open={deleteItemDialogOpen} onOpenChange={setDeleteItemDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('promotions.items.deleteConfirm')}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t('promotions.items.deleteConfirmDescription')}
                  {itemToDelete?.menu_item?.name && (
                    <span className="font-semibold block mt-2">
                      &quot;{itemToDelete.menu_item.name}&quot;
                    </span>
                  )}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteItemConfirm}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {t('common.delete')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </Dialog>
  )
}
