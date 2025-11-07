'use client'

import { useTranslation } from '@/components/i18n-text'
import { OrderTable } from '@/components/orders/order-table'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import {
  getOrders,
  type Order,
} from '@/lib/api/orders'

export default function IncomingOrdersPage() {
  const { t } = useTranslation()
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const loadOrders = async () => {
    try {
      setIsLoading(true)
      // Filter for incoming orders (submitted, accepted, in_progress)
      const allOrders = await getOrders()
      const incomingOrders = allOrders.filter(
        (order) =>
          order.status === 'submitted' ||
          order.status === 'accepted' ||
          order.status === 'in_progress'
      )
      setOrders(incomingOrders)
    } catch (error) {
      console.error('Error loading incoming orders:', error)
      toast.error(t('orders.loadFailed') || 'Failed to load orders')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadOrders()
  }, [])

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('navigation.incomingOrders')}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            View and handle incoming orders that need attention
          </p>
        </div>
      </div>

      {orders.length === 0 && !isLoading ? (
        <div className="flex flex-col items-center justify-center py-12 border rounded-lg">
          <p className="text-muted-foreground mb-2">
            No incoming orders
          </p>
          <p className="text-muted-foreground text-sm mb-4">
            All orders have been processed or there are no new orders.
          </p>
        </div>
      ) : (
        <OrderTable
          data={orders}
          isLoading={isLoading}
        />
      )}
    </div>
  )
}

