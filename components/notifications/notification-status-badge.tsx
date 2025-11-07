'use client'

import { Badge } from '@/components/ui/badge'
import { type NotificationStatus } from '@/lib/api/notifications'
import { useTranslation } from '@/components/i18n-text'
import { cn } from '@/lib/utils'

interface NotificationStatusBadgeProps {
  status: NotificationStatus
  className?: string
}

const statusBadgeVariants: Record<NotificationStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  active: 'default',
  inactive: 'secondary',
  expired: 'destructive',
  upcoming: 'outline',
}

export function NotificationStatusBadge({
  status,
  className,
}: NotificationStatusBadgeProps) {
  const { t } = useTranslation()
  
  const statusLabels: Record<NotificationStatus, string> = {
    active: t('notifications.status.active'),
    inactive: t('notifications.status.inactive'),
    expired: t('notifications.status.expired'),
    upcoming: t('notifications.status.upcoming'),
  }

  return (
    <Badge variant={statusBadgeVariants[status]} className={cn(className)}>
      {statusLabels[status]}
    </Badge>
  )
}

