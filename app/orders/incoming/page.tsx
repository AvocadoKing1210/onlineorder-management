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
import { getSupabaseClient } from '@/lib/auth'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { IconLayoutGrid } from '@tabler/icons-react'
import { cn } from '@/lib/utils'

const COUNTER_VIEW_STORAGE_KEY = 'counter-view-open'

export default function IncomingOrdersPage() {
  const { t } = useTranslation()
  const [unfinishedOrders, setUnfinishedOrders] = useState<Order[]>([])
  const [finishedOrders, setFinishedOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCounterView, setShowCounterView] = useState(() => {
    // Initialize from localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(COUNTER_VIEW_STORAGE_KEY)
      return saved === 'true'
    }
    return false
  })

  // Persist counter view state to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(COUNTER_VIEW_STORAGE_KEY, String(showCounterView))
    }
  }, [showCounterView])

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
    } catch (error: any) {
      console.error('Error loading incoming orders:', error)
      
      // Check if it's a session expiration error
      if (error?.message?.includes('session has expired') || 
          error?.message?.includes('Please log in again')) {
        // Don't show toast - redirect is already happening
        return
      }
      
      toast.error(t('orders.loadFailed') || 'Failed to load orders')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadOrders()
  }, [])

  // Set up Realtime subscription for order updates
  useEffect(() => {
    let channel: any = null

    const setupRealtime = async () => {
      try {
        const supabase = await getSupabaseClient()
        
        // Subscribe to order table changes
        channel = supabase
          .channel('incoming-orders-updates')
          .on(
            'postgres_changes',
            {
              event: '*', // Listen to INSERT, UPDATE, DELETE
              schema: 'public',
              table: 'order',
              // RLS will automatically filter - Business Owners/Admins see all orders
            },
            async (payload) => {
              console.log('🔔 Realtime order update:', payload.eventType, payload.new)
              
              // Reload orders when changes occur
              // This ensures we get the latest data with all joins and filters
              await loadOrders()
              
              // Show toast notification for new orders
              if (payload.eventType === 'INSERT') {
                const newOrder = payload.new as Order
                toast.success(`New order received: ${newOrder.reference_number || newOrder.id.slice(0, 8)}`)
              } else if (payload.eventType === 'UPDATE') {
                const updatedOrder = payload.new as Order
                const oldOrder = payload.old as Order
                if (updatedOrder.status !== oldOrder.status) {
                  toast.info(`Order ${updatedOrder.reference_number || updatedOrder.id.slice(0, 8)} status: ${oldOrder.status} → ${updatedOrder.status}`)
                }
              }
            }
          )
          .subscribe((status) => {
            console.log('📡 Realtime subscription status:', status)
            if (status === 'SUBSCRIBED') {
              console.log('✅ Subscribed to order updates')
            } else if (status === 'CHANNEL_ERROR') {
              console.error('❌ Realtime subscription error')
              toast.error('Failed to connect to real-time updates')
            }
          })
      } catch (error) {
        console.error('Error setting up Realtime subscription:', error)
        toast.error('Failed to set up real-time updates')
      }
    }

    setupRealtime()

    // Cleanup: unsubscribe when component unmounts
    return () => {
      if (channel) {
        const cleanup = async () => {
          const supabase = await getSupabaseClient()
          await supabase.removeChannel(channel)
        }
        cleanup().catch(console.error)
      }
    }
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
          onClick={() => setShowCounterView(!showCounterView)}
          className="gap-2 bg-gray-900 text-white hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
        >
          <IconLayoutGrid className="h-4 w-4" />
          {showCounterView ? 'Table View' : 'Counter View'}
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
              onOrderUpdate={loadOrders}
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

