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
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { DateRangePicker } from '@/components/ui/date-range-picker'
import { IconClock, IconSettings, IconCalendar } from '@tabler/icons-react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useTranslation } from '@/components/i18n-text'
import {
  type Notification,
  type CreateNotificationData,
  type UpdateNotificationData,
} from '@/lib/api/notifications'
import { cn } from '@/lib/utils'

interface NotificationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  notification?: Notification | null
  onSave: (data: CreateNotificationData | UpdateNotificationData) => Promise<void>
}

type NotificationCategory = 'general' | 'schedule'

interface CategoryConfig {
  id: NotificationCategory
  label: string
  icon: React.ComponentType<{ className?: string }>
}

export function NotificationDialog({
  open,
  onOpenChange,
  notification,
  onSave,
}: NotificationDialogProps) {
  const { t } = useTranslation()
  const isEditing = !!notification
  const [selectedCategory, setSelectedCategory] = useState<NotificationCategory>('general')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [audience, setAudience] = useState<'all_customers' | 'recent_purchasers'>('all_customers')
  const [publishedAtDate, setPublishedAtDate] = useState<Date>(new Date())
  const [publishedAtTime, setPublishedAtTime] = useState<string>('00:00')
  const [expiryAtDate, setExpiryAtDate] = useState<Date | undefined>(undefined)
  const [expiryAtTime, setExpiryAtTime] = useState<string>('23:59')
  const [isSaving, setIsSaving] = useState(false)
  const [errors, setErrors] = useState<{
    title?: string
    body?: string
    publishedAt?: string
    expiryAt?: string
  }>({})

  // Category configuration
  const getCategories = (): CategoryConfig[] => [
    {
      id: 'general',
      label: t('notifications.categories.general') || 'General',
      icon: IconSettings,
    },
    {
      id: 'schedule',
      label: t('notifications.categories.schedule') || 'Schedule',
      icon: IconCalendar,
    },
  ]

  // Reset form when dialog opens/closes or notification changes
  useEffect(() => {
    if (open) {
      // Reset to general category when dialog opens
      setSelectedCategory('general')

      if (notification) {
        setTitle(notification.title)
        setBody(notification.body)
        setAudience(notification.audience)
        const publishedDate = new Date(notification.published_at)
        setPublishedAtDate(publishedDate)
        setPublishedAtTime(
          `${String(publishedDate.getHours()).padStart(2, '0')}:${String(publishedDate.getMinutes()).padStart(2, '0')}`
        )
        if (notification.expiry_at) {
          const expiryDate = new Date(notification.expiry_at)
          setExpiryAtDate(expiryDate)
          setExpiryAtTime(
            `${String(expiryDate.getHours()).padStart(2, '0')}:${String(expiryDate.getMinutes()).padStart(2, '0')}`
          )
        } else {
          setExpiryAtDate(undefined)
          setExpiryAtTime('23:59')
        }
      } else {
        setTitle('')
        setBody('')
        setAudience('all_customers')
        const now = new Date()
        setPublishedAtDate(now)
        setPublishedAtTime('00:00')
        setExpiryAtDate(undefined)
        setExpiryAtTime('23:59')
      }
      setErrors({})
    }
  }, [open, notification])

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

    if (!title.trim()) {
      newErrors.title = t('notifications.fields.titleRequired') || 'Title is required'
    }

    if (!body.trim()) {
      newErrors.body = t('notifications.fields.bodyRequired') || 'Body is required'
    }

    if (!publishedAtDate) {
      newErrors.publishedAt =
        t('notifications.fields.publishedAtRequired') || 'Published at is required'
    }

    if (expiryAtDate) {
      const publishedDateTime = new Date(publishedAtDate)
      const [publishedHours, publishedMinutes] = publishedAtTime.split(':').map(Number)
      publishedDateTime.setHours(publishedHours, publishedMinutes, 0, 0)

      const expiryDateTime = new Date(expiryAtDate)
      const [expiryHours, expiryMinutes] = expiryAtTime.split(':').map(Number)
      expiryDateTime.setHours(expiryHours, expiryMinutes, 0, 0)

      if (expiryDateTime <= publishedDateTime) {
        newErrors.expiryAt =
          t('notifications.fields.expiryAtAfterPublished') ||
          'Expiry date must be after published date'
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
      // Combine date and time for publishedAt
      const publishedDateTime = new Date(publishedAtDate)
      const [publishedHours, publishedMinutes] = publishedAtTime.split(':').map(Number)
      publishedDateTime.setHours(publishedHours, publishedMinutes, 0, 0)

      // Combine date and time for expiryAt if provided
      let expiryDateTime: Date | null = null
      if (expiryAtDate) {
        expiryDateTime = new Date(expiryAtDate)
        const [expiryHours, expiryMinutes] = expiryAtTime.split(':').map(Number)
        expiryDateTime.setHours(expiryHours, expiryMinutes, 0, 0)
      }

      const data: CreateNotificationData | UpdateNotificationData = {
        title: title.trim(),
        body: body.trim(),
        audience,
        published_at: publishedDateTime.toISOString(),
        expiry_at: expiryDateTime ? expiryDateTime.toISOString() : null,
      }

      await onSave(data)
      onOpenChange(false)
    } catch (error) {
      console.error('Error saving notification:', error)
      // Error is handled by parent component
    } finally {
      setIsSaving(false)
    }
  }

  // Render functions for each category
  const renderGeneral = () => (
    <div className="space-y-6">
      {/* Title */}
      <div className="grid gap-2.5">
        <div className="flex items-baseline gap-1.5">
          <Label htmlFor="title" className="text-sm font-medium">
            {t('notifications.fields.title')}
          </Label>
          <span className="text-destructive text-sm">*</span>
        </div>
        <Input
          id="title"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value)
            if (errors.title) {
              setErrors({ ...errors, title: undefined })
            }
          }}
          placeholder={t('notifications.fields.titlePlaceholder')}
          className={errors.title ? 'border-destructive' : ''}
        />
        {errors.title && (
          <p className="text-sm text-destructive mt-0.5">{errors.title}</p>
        )}
      </div>

      <Separator />

      {/* Body */}
      <div className="grid gap-2.5">
        <div className="flex items-baseline gap-1.5">
          <Label htmlFor="body" className="text-sm font-medium">
            {t('notifications.fields.body')}
          </Label>
          <span className="text-destructive text-sm">*</span>
        </div>
        <Textarea
          id="body"
          value={body}
          onChange={(e) => {
            setBody(e.target.value)
            if (errors.body) {
              setErrors({ ...errors, body: undefined })
            }
          }}
          placeholder={t('notifications.fields.bodyPlaceholder')}
          rows={6}
          className={errors.body ? 'border-destructive' : ''}
        />
        {errors.body && (
          <p className="text-sm text-destructive mt-0.5">{errors.body}</p>
        )}
      </div>

      <Separator />

      {/* Audience */}
      <div className="grid gap-2.5">
        <div className="flex items-baseline gap-1.5">
          <Label htmlFor="audience" className="text-sm font-medium">
            {t('notifications.fields.audience')}
          </Label>
          <span className="text-destructive text-sm">*</span>
        </div>
        <Select
          value={audience}
          onValueChange={(value: any) => setAudience(value)}
        >
          <SelectTrigger id="audience">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all_customers">
              {t('notifications.fields.audienceAllCustomers')}
            </SelectItem>
            <SelectItem value="recent_purchasers">
              {t('notifications.fields.audienceRecentPurchasers')}
            </SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          {audience === 'all_customers'
            ? t('notifications.fields.audienceAllCustomersDescription')
            : t('notifications.fields.audienceRecentPurchasersDescription')}
        </p>
      </div>
    </div>
  )

  const renderSchedule = () => (
    <div className="space-y-6">
      {/* Date Range Picker */}
      <div className="grid gap-2.5">
        <div className="flex items-baseline gap-1.5">
          <Label className="text-sm font-medium">
            {t('notifications.fields.dateRange') || 'Date Range'}
          </Label>
        </div>
        <DateRangePicker
          initialDateFrom={publishedAtDate}
          initialDateTo={expiryAtDate}
          onUpdate={({ range }) => {
            setPublishedAtDate(range.from)
            setExpiryAtDate(range.to)
            if (errors.publishedAt || errors.expiryAt) {
              setErrors({ ...errors, publishedAt: undefined, expiryAt: undefined })
            }
          }}
          showCompare={false}
          align="start"
        />
        {errors.publishedAt && (
          <p className="text-sm text-destructive mt-0.5">
            {errors.publishedAt}
          </p>
        )}
      </div>

      <Separator />

      {/* Time Inputs */}
      <div className="grid grid-cols-2 gap-4 items-start">
        {/* Published At Time */}
        <div className="grid gap-2.5">
          <div className="flex items-baseline gap-1.5 h-5">
            <Label htmlFor="publishedAtTime" className="text-sm font-medium">
              {t('notifications.fields.startTime') || 'Start Time'}
            </Label>
            <span className="text-destructive text-sm">*</span>
          </div>
          <div className={cn(
            "flex rounded-md border shadow-xs overflow-hidden focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]",
            errors.publishedAt ? "border-destructive" : "border-input"
          )}>
            <div className="flex items-center px-3 bg-muted border-r border-input">
              <IconClock className="h-4 w-4 text-muted-foreground" />
            </div>
            <Input
              id="publishedAtTime"
              type="text"
              value={publishedAtTime}
              placeholder="HH:MM (e.g., 09:00)"
              onChange={(e) => {
                const formatted = formatTimeInput(e.target.value)
                setPublishedAtTime(formatted)
                if (errors.publishedAt) {
                  setErrors({ ...errors, publishedAt: undefined })
                }
              }}
              onBlur={(e) => {
                const formatted = formatTimeOnBlur(e.target.value)
                setPublishedAtTime(formatted)
              }}
              className={cn(
                'border-0 rounded-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0',
                errors.publishedAt && 'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40'
              )}
              aria-invalid={errors.publishedAt ? 'true' : undefined}
            />
          </div>
          <div className="min-h-[1.25rem]">
            {errors.publishedAt && (
              <p className="text-sm text-destructive">
                {errors.publishedAt}
              </p>
            )}
          </div>
        </div>

        {/* Expiry At Time */}
        <div className="grid gap-2.5">
          <div className="flex items-baseline gap-1.5 h-5">
            <Label htmlFor="expiryAtTime" className="text-sm font-medium">
              {t('notifications.fields.endTime') || 'End Time'}
            </Label>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className={cn(
                "flex rounded-md border shadow-xs overflow-hidden focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]",
                errors.expiryAt ? "border-destructive" : "border-input",
                !expiryAtDate && "opacity-50"
              )}>
                <div className="flex items-center px-3 bg-muted border-r border-input">
                  <IconClock className="h-4 w-4 text-muted-foreground" />
                </div>
                <Input
                  id="expiryAtTime"
                  type="text"
                  value={expiryAtTime}
                  placeholder="HH:MM (e.g., 23:59)"
                  onChange={(e) => {
                    const formatted = formatTimeInput(e.target.value)
                    setExpiryAtTime(formatted)
                    if (errors.expiryAt) {
                      setErrors({ ...errors, expiryAt: undefined })
                    }
                  }}
                  onBlur={(e) => {
                    const formatted = formatTimeOnBlur(e.target.value)
                    setExpiryAtTime(formatted)
                  }}
                  className={cn(
                    'border-0 rounded-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0',
                    errors.expiryAt && 'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40'
                  )}
                  aria-invalid={errors.expiryAt ? 'true' : undefined}
                  disabled={!expiryAtDate}
                />
              </div>
            </TooltipTrigger>
            {!expiryAtDate && (
              <TooltipContent>
                <p>{t('notifications.fields.selectEndDate') || 'Select an end date first'}</p>
              </TooltipContent>
            )}
          </Tooltip>
          <div className="min-h-[1.25rem]">
            {errors.expiryAt && (
              <p className="text-sm text-destructive">
                {errors.expiryAt}
              </p>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center mt-1">
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {t('notifications.fields.expiryAtDescription')}
        </span>
      </div>
    </div>
  )

  const renderContent = () => {
    switch (selectedCategory) {
      case 'general':
        return renderGeneral()
      case 'schedule':
        return renderSchedule()
      default:
        return renderGeneral()
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
              ? t('notifications.editNotification')
              : t('notifications.createNotification')}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? t('notifications.editNotificationDescription')
              : t('notifications.createNotificationDescription')}
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
    </Dialog>
  )
}
