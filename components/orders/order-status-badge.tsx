'use client'

import { Badge } from '@/components/ui/badge'
import { type Order } from '@/lib/api/orders'
import { useTranslation } from '@/components/i18n-text'
import { cn } from '@/lib/utils'

interface OrderStatusBadgeProps {
  status: Order['status']
  className?: string
}

const statusBadgeVariants: Record<Order['status'], 'default' | 'secondary' | 'destructive' | 'outline'> = {
  created: 'secondary',
  submitted: 'default',
  accepted: 'outline',
  in_progress: 'outline',
  ready: 'default',
  completed: 'default',
  cancelled_by_user: 'destructive',
  cancelled_by_store: 'destructive',
}

const statusBadgeColors: Record<Order['status'], string> = {
  created: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  submitted: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  accepted: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  in_progress: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  ready: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  completed: 'bg-green-200 text-green-900 dark:bg-green-800 dark:text-green-100',
  cancelled_by_user: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  cancelled_by_store: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
}

export function OrderStatusBadge({
  status,
  className,
}: OrderStatusBadgeProps) {
  const { t } = useTranslation()
  
  const statusLabels: Record<Order['status'], string> = {
    created: t('orders.status.created'),
    submitted: t('orders.status.submitted'),
    accepted: t('orders.status.accepted'),
    in_progress: t('orders.status.in_progress'),
    ready: t('orders.status.ready'),
    completed: t('orders.status.completed'),
    cancelled_by_user: t('orders.status.cancelled_by_user'),
    cancelled_by_store: t('orders.status.cancelled_by_store'),
  }

  return (
    <Badge 
      variant={statusBadgeVariants[status]} 
      className={cn(statusBadgeColors[status], className)}
    >
      {statusLabels[status]}
    </Badge>
  )
}

