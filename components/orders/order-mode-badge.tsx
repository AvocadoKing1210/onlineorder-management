'use client'

import { Badge } from '@/components/ui/badge'
import { type Order } from '@/lib/api/orders'
import { useTranslation } from '@/components/i18n-text'
import { cn } from '@/lib/utils'

interface OrderModeBadgeProps {
  mode: Order['mode']
  className?: string
}

const modeBadgeVariants: Record<Order['mode'], 'default' | 'secondary' | 'outline'> = {
  dine_in: 'default',
  takeout: 'secondary',
  delivery: 'outline',
  view_only: 'secondary',
}

export function OrderModeBadge({
  mode,
  className,
}: OrderModeBadgeProps) {
  const { t } = useTranslation()
  
  const modeLabels: Record<Order['mode'], string> = {
    dine_in: t('orders.mode.dine_in'),
    takeout: t('orders.mode.takeout'),
    delivery: t('orders.mode.delivery'),
    view_only: t('orders.mode.view_only'),
  }

  return (
    <Badge 
      variant={modeBadgeVariants[mode]} 
      className={className}
    >
      {modeLabels[mode]}
    </Badge>
  )
}

