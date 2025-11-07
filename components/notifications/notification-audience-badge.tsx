'use client'

import { Badge } from '@/components/ui/badge'
import { useTranslation } from '@/components/i18n-text'
import { cn } from '@/lib/utils'

interface NotificationAudienceBadgeProps {
  audience: 'all_customers' | 'recent_purchasers'
  className?: string
}

export function NotificationAudienceBadge({
  audience,
  className,
}: NotificationAudienceBadgeProps) {
  const { t } = useTranslation()
  
  const audienceLabels: Record<'all_customers' | 'recent_purchasers', string> = {
    all_customers: t('notifications.fields.audienceAllCustomers'),
    recent_purchasers: t('notifications.fields.audienceRecentPurchasers'),
  }

  const variant = audience === 'all_customers' ? 'default' : 'secondary'

  return (
    <Badge variant={variant} className={cn(className)}>
      {audienceLabels[audience]}
    </Badge>
  )
}

