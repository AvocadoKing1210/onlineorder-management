'use client'

import { useState } from 'react'
import { useTranslation } from '@/components/i18n-text'
import { type Order } from '@/lib/api/orders'
import { OrderStatusBadge } from './order-status-badge'
import { OrderModeBadge } from './order-mode-badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { IconX, IconClock, IconUser, IconShoppingCart } from '@tabler/icons-react'
import { cn } from '@/lib/utils'
import { OrderDetailDialog } from './order-detail-dialog'

interface CounterViewProps {
  orders: Order[]
  onClose: () => void
}

export function CounterView({ orders, onClose }: CounterViewProps) {
  const { t } = useTranslation()
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)

  const formatCurrency = (amount: string | number): string => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(num)
  }

  const formatRelativeTime = (dateString: string | null | undefined): string => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)

    if (diffMins < 1) return t('common.justNow') || 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const getStatusPriority = (status: Order['status']): number => {
    const priorities: Record<Order['status'], number> = {
      submitted: 1,
      accepted: 2,
      in_progress: 3,
      ready: 4,
      completed: 5,
      cancelled_by_user: 6,
      cancelled_by_store: 6,
      created: 7,
    }
    return priorities[status] || 0
  }

  const sortedOrders = [...orders].sort((a, b) => {
    const priorityDiff = getStatusPriority(a.status) - getStatusPriority(b.status)
    if (priorityDiff !== 0) return priorityDiff
    // If same priority, sort by submitted_at (most recent first)
    const aTime = a.submitted_at ? new Date(a.submitted_at).getTime() : 0
    const bTime = b.submitted_at ? new Date(b.submitted_at).getTime() : 0
    return bTime - aTime
  })

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <div className="border-b bg-muted/50 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold">Counter View</h2>
          <Badge variant="secondary">{orders.length} orders</Badge>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-9 w-9"
        >
          <IconX className="h-5 w-5" />
          <span className="sr-only">Close</span>
        </Button>
      </div>

      {/* Orders Grid */}
      <div className="flex-1 overflow-y-auto p-4 lg:p-6">
        {sortedOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <p className="text-muted-foreground text-lg">No unfinished orders</p>
            <p className="text-muted-foreground text-sm mt-2">
              All orders have been completed or cancelled.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {sortedOrders.map((order) => (
              <Card
                key={order.id}
                className={cn(
                  "cursor-pointer hover:shadow-lg transition-shadow",
                  order.status === 'ready' && "border-primary border-2",
                  order.status === 'submitted' && "border-orange-500 border-2"
                )}
                onClick={() => {
                  setSelectedOrderId(order.id)
                  setDetailDialogOpen(true)
                }}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base font-mono truncate">
                        {order.id.substring(0, 8)}
                      </CardTitle>
                      <div className="flex items-center gap-2 mt-2">
                        <OrderStatusBadge status={order.status} />
                        <OrderModeBadge mode={order.mode} />
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <IconUser className="h-4 w-4 text-muted-foreground" />
                    <span className="truncate">
                      {order.user_profile?.name || order.user_profile?.email || 'Customer'}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm">
                    <IconShoppingCart className="h-4 w-4 text-muted-foreground" />
                    <span>{order.item_count || 0} items</span>
                  </div>

                  {order.submitted_at && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <IconClock className="h-4 w-4" />
                      <span>{formatRelativeTime(order.submitted_at)}</span>
                    </div>
                  )}

                  <div className="pt-2 border-t">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Total</span>
                      <span className="text-lg font-semibold">
                        {formatCurrency(order.total_amount)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <OrderDetailDialog
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        orderId={selectedOrderId}
      />
    </div>
  )
}

