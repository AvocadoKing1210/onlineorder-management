'use client'

import { useState, useEffect } from 'react'
import { useTranslation } from '@/components/i18n-text'
import { toast } from 'sonner'
import { OrderTable } from '@/components/orders/order-table'
import {
  getOrders,
  cancelOrder,
  type Order,
} from '@/lib/api/orders'
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

export default function OrderHistoryPage() {
  const { t } = useTranslation()
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [orderToCancel, setOrderToCancel] = useState<Order | null>(null)

  const loadOrders = async () => {
    try {
      setIsLoading(true)
      const data = await getOrders()
      setOrders(data)
    } catch (error) {
      console.error('Error loading orders:', error)
      toast.error(t('orders.loadFailed') || 'Failed to load orders')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadOrders()
  }, [])

  const handleUpdateStatus = (order: Order) => {
    // Navigate to order detail page for status update
    window.location.href = `/orders/${order.id}`
  }

  const handleCancelClick = (order: Order) => {
    setOrderToCancel(order)
    setCancelDialogOpen(true)
  }

  const handleCancelConfirm = async () => {
    if (!orderToCancel) return

    try {
      await cancelOrder(orderToCancel.id, 'Cancelled by store')
      toast.success(t('orders.orderCancelled'))
      await loadOrders()
      setCancelDialogOpen(false)
      setOrderToCancel(null)
    } catch (error: any) {
      console.error('Error cancelling order:', error)
      toast.error(t('orders.cancelFailed'))
    }
  }

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('orders.title')}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {t('orders.description')}
          </p>
        </div>
      </div>

      {orders.length === 0 && !isLoading ? (
        <div className="flex flex-col items-center justify-center py-12 border rounded-lg">
          <p className="text-muted-foreground mb-2">
            {t('orders.noOrders')}
          </p>
          <p className="text-muted-foreground text-sm mb-4">
            {t('orders.noOrdersDescription')}
          </p>
        </div>
      ) : (
        <OrderTable
          data={orders}
          onUpdateStatus={handleUpdateStatus}
          onCancel={handleCancelClick}
          isLoading={isLoading}
        />
      )}

      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('orders.cancelConfirm')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('orders.cancelConfirmDescription')}
              {orderToCancel && (
                <span className="font-semibold block mt-2">
                  Order #{orderToCancel.id.substring(0, 8)}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('orders.cancelOrder')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

