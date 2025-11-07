'use client'

import { useTranslation } from '@/components/i18n-text'
import { OrderTable } from '@/components/orders/order-table'
import { CounterView } from '@/components/orders/counter-view'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import {
  getOrders,
  type Order,
} from '@/lib/api/orders'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { IconLayoutGrid } from '@tabler/icons-react'

export default function IncomingOrdersPage() {
  const { t } = useTranslation()
  const [unfinishedOrders, setUnfinishedOrders] = useState<Order[]>([])
  const [finishedOrders, setFinishedOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCounterView, setShowCounterView] = useState(false)

  const isToday = (dateString: string | null | undefined): boolean => {
    if (!dateString) return false
    const date = new Date(dateString)
    const today = new Date()
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    )
  }

  const loadOrders = async () => {
    try {
      setIsLoading(true)
      const allOrders = await getOrders()
      
      // Unfinished orders: submitted, accepted, in_progress, ready (not completed or cancelled)
      const unfinished = allOrders.filter(
        (order) =>
          order.status === 'submitted' ||
          order.status === 'accepted' ||
          order.status === 'in_progress' ||
          order.status === 'ready'
      )
      
      // Finished orders: completed today only
      const finished = allOrders.filter(
        (order) =>
          order.status === 'completed' &&
          isToday(order.completed_at)
      )
      
      setUnfinishedOrders(unfinished)
      setFinishedOrders(finished)
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
        <Button
          onClick={() => setShowCounterView(true)}
          className="gap-2"
        >
          <IconLayoutGrid className="h-4 w-4" />
          Counter View
        </Button>
      </div>

      <Tabs defaultValue="unfinished" className="w-full">
        <TabsList>
          <TabsTrigger value="unfinished">Unfinished</TabsTrigger>
        <TabsTrigger value="finished">Finished</TabsTrigger>
        </TabsList>

        <TabsContent value="unfinished" className="mt-6">
          {showCounterView ? (
            <CounterView
              orders={unfinishedOrders}
              onClose={() => setShowCounterView(false)}
            />
          ) : (
            <>
              {unfinishedOrders.length === 0 && !isLoading ? (
                <div className="flex flex-col items-center justify-center py-12 border rounded-lg">
                  <p className="text-muted-foreground mb-2">
                    No unfinished orders
                  </p>
                  <p className="text-muted-foreground text-sm">
                    All orders have been completed or cancelled.
                  </p>
                </div>
              ) : (
                <OrderTable
                  data={unfinishedOrders}
                  isLoading={isLoading}
                />
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="finished" className="mt-6">
          {finishedOrders.length === 0 && !isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 border rounded-lg">
              <p className="text-muted-foreground mb-2">
                No finished orders today
              </p>
              <p className="text-muted-foreground text-sm">
                No orders have been completed today yet.
              </p>
            </div>
          ) : (
            <OrderTable
              data={finishedOrders}
              isLoading={isLoading}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

