'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Label } from '@/components/ui/label'
import { useTranslation } from '@/components/i18n-text'
import {
  type OrderWithDetails,
  getOrderById,
} from '@/lib/api/orders'
import { OrderStatusBadge } from './order-status-badge'
import { OrderModeBadge } from './order-mode-badge'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { IconInfoCircle, IconPackage, IconHistory } from '@tabler/icons-react'

interface OrderDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  orderId: string | null
}

type OrderDetailCategory = 'information' | 'items' | 'history'

interface CategoryConfig {
  id: OrderDetailCategory
  label: string
  icon: React.ComponentType<{ className?: string }>
}

export function OrderDetailDialog({
  open,
  onOpenChange,
  orderId,
}: OrderDetailDialogProps) {
  const { t } = useTranslation()
  const [selectedCategory, setSelectedCategory] = useState<OrderDetailCategory>('information')
  const [order, setOrder] = useState<OrderWithDetails | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const getCategories = (): CategoryConfig[] => [
    {
      id: 'information',
      label: t('orders.detail.orderInformation') || 'Order Information',
      icon: IconInfoCircle,
    },
    {
      id: 'items',
      label: t('orders.detail.items') || 'Items',
      icon: IconPackage,
    },
    {
      id: 'history',
      label: t('orders.detail.statusHistory') || 'Status History',
      icon: IconHistory,
    },
  ]

  useEffect(() => {
    if (open && orderId) {
      loadOrder()
    } else {
      setOrder(null)
    }
  }, [open, orderId])

  const loadOrder = async () => {
    if (!orderId) return
    
    try {
      setIsLoading(true)
      const data = await getOrderById(orderId)
      setOrder(data)
    } catch (error) {
      console.error('Error loading order:', error)
      toast.error(t('orders.loadFailed') || 'Failed to load order')
    } finally {
      setIsLoading(false)
    }
  }

  const formatCurrency = (amount: string | number): string => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(num)
  }

  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const formatRelativeTime = (dateString: string | null | undefined): string => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return t('common.justNow') || 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return formatDate(dateString)
  }

  const renderInformation = () => {
    if (!order) return null

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs text-muted-foreground mb-1">
              {t('orders.table.orderId')}
            </Label>
            <div className="font-mono text-sm">{order.id}</div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1">
              {t('orders.table.status')}
            </Label>
            <div>
              <OrderStatusBadge status={order.status} />
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1">
              {t('orders.table.mode')}
            </Label>
            <div>
              <OrderModeBadge mode={order.mode} />
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1">
              {t('orders.table.customer')}
            </Label>
            <div className="text-sm font-medium">
              {order.user_profile?.name || order.user_profile?.email || `User ${order.user_id.substring(0, 8)}...`}
            </div>
            {order.user_profile?.email && order.user_profile?.name && (
              <div className="text-xs text-muted-foreground mt-1">
                {order.user_profile.email}
              </div>
            )}
            {!order.user_profile?.name && order.user_profile?.email && (
              <div className="text-xs text-muted-foreground mt-1">
                {order.user_profile.email}
              </div>
            )}
            {!order.user_profile && (
              <div className="text-xs text-muted-foreground mt-1 font-mono">
                ID: {order.user_id}
              </div>
            )}
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1">
              {t('orders.fields.createdAt')}
            </Label>
            <div className="text-sm">{formatDate(order.created_at)}</div>
          </div>
          {order.submitted_at && (
            <div>
              <Label className="text-xs text-muted-foreground mb-1">
                {t('orders.fields.submittedAt')}
              </Label>
              <div className="text-sm">{formatDate(order.submitted_at)}</div>
            </div>
          )}
          {order.accepted_at && (
            <div>
              <Label className="text-xs text-muted-foreground mb-1">
                Accepted At
              </Label>
              <div className="text-sm">{formatDate(order.accepted_at)}</div>
            </div>
          )}
          {order.completed_at && (
            <div>
              <Label className="text-xs text-muted-foreground mb-1">
                Completed At
              </Label>
              <div className="text-sm">{formatDate(order.completed_at)}</div>
            </div>
          )}
        </div>

        {order.special_instructions && (
          <div>
            <Label className="text-xs text-muted-foreground mb-1">
              {t('orders.fields.specialInstructions')}
            </Label>
            <div className="text-sm p-3 bg-muted rounded-md">
              {order.special_instructions}
            </div>
          </div>
        )}

        {order.estimated_preparation_minutes && (
          <div>
            <Label className="text-xs text-muted-foreground mb-1">
              {t('orders.fields.estimatedPreparationTime')}
            </Label>
            <div className="text-sm">
              {order.estimated_preparation_minutes} minutes
            </div>
          </div>
        )}

        <Separator />

        <div className="space-y-2">
          <h3 className="font-semibold text-sm">{t('orders.detail.totals')}</h3>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('orders.detail.subtotal')}</span>
              <span>{formatCurrency(order.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('orders.detail.tax')}</span>
              <span>{formatCurrency(order.tax_amount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('orders.detail.fees')}</span>
              <span>{formatCurrency(order.fees_amount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('orders.detail.tip')}</span>
              <span>{formatCurrency(order.tip_amount)}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-semibold">
              <span>{t('orders.detail.total')}</span>
              <span>{formatCurrency(order.total_amount)}</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderItems = () => {
    if (!order) return null

    if (!order.items || order.items.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          {t('orders.detail.noItems')}
        </div>
      )
    }

    return (
      <div className="space-y-4">
        {order.items.map((item) => (
          <div key={item.id} className="border rounded-lg p-4 space-y-2">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="font-medium">{item.item_name}</div>
                {item.item_description && (
                  <div className="text-sm text-muted-foreground mt-1">
                    {item.item_description}
                  </div>
                )}
              </div>
              <div className="text-right">
                <div className="font-medium">
                  {formatCurrency(item.line_total)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatCurrency(item.unit_price)} × {item.quantity}
                </div>
              </div>
            </div>

            {item.modifiers && item.modifiers.length > 0 && (
              <div className="mt-2 pt-2 border-t">
                <div className="text-xs text-muted-foreground mb-1">Modifiers:</div>
                <div className="space-y-1">
                  {item.modifiers.map((modifier) => (
                    <div key={modifier.id} className="flex justify-between text-xs">
                      <span>
                        {modifier.modifier_group_name}: {modifier.modifier_option_name}
                      </span>
                      {parseFloat(modifier.price_delta) !== 0 && (
                        <span className={cn(
                          parseFloat(modifier.price_delta) > 0 ? 'text-green-600' : 'text-red-600'
                        )}>
                          {parseFloat(modifier.price_delta) > 0 ? '+' : ''}
                          {formatCurrency(modifier.price_delta)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {item.notes && (
              <div className="mt-2 pt-2 border-t">
                <div className="text-xs text-muted-foreground">Notes:</div>
                <div className="text-xs mt-1">{item.notes}</div>
              </div>
            )}
          </div>
        ))}
      </div>
    )
  }

  const renderHistory = () => {
    if (!order) return null

    if (!order.status_events || order.status_events.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          {t('orders.detail.noHistory')}
        </div>
      )
    }

    return (
      <div className="space-y-4">
        {order.status_events.map((event, index) => (
          <div key={event.id} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className={cn(
                "w-2 h-2 rounded-full",
                index === order.status_events!.length - 1 ? "bg-primary" : "bg-muted-foreground"
              )} />
              {index < order.status_events!.length - 1 && (
                <div className="w-px h-full bg-border mt-1" />
              )}
            </div>
            <div className="flex-1 pb-4">
              <div className="flex items-center gap-2 mb-1">
                <OrderStatusBadge status={event.status as any} />
                <span className="text-xs text-muted-foreground">
                  {formatRelativeTime(event.created_at)}
                </span>
              </div>
              <div className="text-xs text-muted-foreground mb-1">
                {event.actor_type === 'system' && 'System'}
                {event.actor_type === 'staff' && 'Staff'}
                {event.actor_type === 'user' && 'Customer'}
              </div>
              {event.message && (
                <div className="text-sm mt-1 p-2 bg-muted rounded">
                  {event.message}
                </div>
              )}
              <div className="text-xs text-muted-foreground mt-1">
                {formatDate(event.created_at)}
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  const renderContent = () => {
    switch (selectedCategory) {
      case 'information':
        return renderInformation()
      case 'items':
        return renderItems()
      case 'history':
        return renderHistory()
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
            {t('orders.detail.title')}
          </DialogTitle>
          <DialogDescription>
            {order && `Order ${order.id.substring(0, 8)}...`}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-muted-foreground">{t('common.loading')}</div>
          </div>
        ) : order ? (
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
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-muted-foreground">Order not found</div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

