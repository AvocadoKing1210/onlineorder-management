'use client'

import { useState, useEffect } from 'react'
import { useTranslation } from '@/components/i18n-text'
import { type Order, updateOrderStatus } from '@/lib/api/orders'
import { OrderStatusBadge } from './order-status-badge'
import { OrderModeBadge } from './order-mode-badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { IconX } from '@tabler/icons-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { OrderDetailDialog } from './order-detail-dialog'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TimeAdjustment } from './time-adjustment'
import { statusEdgeColors } from './order-status-badge'

interface CounterViewProps {
  orders: Order[]
  onClose: () => void
  onOrderUpdate?: () => void
}

export function CounterView({ orders, onClose, onOrderUpdate }: CounterViewProps) {
  const { t } = useTranslation()
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState<'all' | 'submitted' | 'accepted' | 'in_progress' | 'ready'>('all')
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null)
  const [currentOrders, setCurrentOrders] = useState<Order[]>(orders)
  const [currentTime, setCurrentTime] = useState(new Date())

  // Update current orders when props change
  useEffect(() => {
    setCurrentOrders(orders)
  }, [orders])

  // Update countdown every minute
  useEffect(() => {
    const interval = setInterval(() => {
      // Force re-render to update countdown by updating a dummy state
      setCurrentOrders(prev => [...prev])
    }, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [])

  // Update clock every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000) // Update every second

    return () => clearInterval(interval)
  }, [])


  const getCountdownMinutes = (order: Order): number | null => {
    // First, try to use estimated_arrival_at if available
    if (order.estimated_arrival_at) {
      const estimatedArrival = new Date(order.estimated_arrival_at)
      const now = new Date()
      const diffMs = estimatedArrival.getTime() - now.getTime()
      const diffMins = Math.ceil(diffMs / 60000)
      return diffMins > 0 ? diffMins : 0
    }
    
    // Fall back to estimated_preparation_minutes + submitted_at
    if (order.estimated_preparation_minutes && order.submitted_at) {
      const submittedTime = new Date(order.submitted_at)
      const estimatedCompletion = new Date(submittedTime.getTime() + order.estimated_preparation_minutes * 60000)
      const now = new Date()
      const diffMs = estimatedCompletion.getTime() - now.getTime()
      const diffMins = Math.ceil(diffMs / 60000)
      return diffMins > 0 ? diffMins : 0
    }
    
    // If no estimate available, calculate based on status and default prep times
    if (order.submitted_at) {
      const submittedTime = new Date(order.submitted_at)
      const now = new Date()
      
      // Default preparation times based on status (in minutes)
      const defaultPrepTimes: Record<Order['status'], number> = {
        submitted: 20,
        accepted: 15,
        in_progress: 10,
        ready: 0,
        completed: 0,
        cancelled_by_user: 0,
        cancelled_by_store: 0,
        created: 0,
      }
      
      const defaultPrepTime = defaultPrepTimes[order.status] || 15
      const estimatedCompletion = new Date(submittedTime.getTime() + defaultPrepTime * 60000)
      const diffMs = estimatedCompletion.getTime() - now.getTime()
      const diffMins = Math.ceil(diffMs / 60000)
      return diffMins > 0 ? diffMins : 0
    }
    
    return null
  }

  const getNextStatus = (currentStatus: Order['status']): Order['status'] | null => {
    const statusFlow: Record<Order['status'], Order['status']> = {
      submitted: 'accepted',
      accepted: 'ready',
      ready: 'completed',
      in_progress: 'ready',
      created: 'submitted',
      completed: 'completed',
      cancelled_by_user: 'cancelled_by_user',
      cancelled_by_store: 'cancelled_by_store',
    }
    return statusFlow[currentStatus] || null
  }

  const getStatusButtonLabel = (currentStatus: Order['status']): string => {
    const nextStatus = getNextStatus(currentStatus)
    if (nextStatus === 'accepted') return 'Accept'
    if (nextStatus === 'ready') return 'Ready'
    if (nextStatus === 'completed') return 'Finish'
    return 'Update'
  }

  const handleStatusUpdate = async (order: Order) => {
    const nextStatus = getNextStatus(order.status)
    if (!nextStatus || nextStatus === order.status) return

    try {
      setUpdatingOrderId(order.id)
      
      // When accepting an order, set default estimated_preparation_minutes to 20 if not already set
      const updateData: any = {
        status: nextStatus,
        message: `Status updated to ${nextStatus}`,
      }
      
      if (nextStatus === 'accepted' && !order.estimated_preparation_minutes) {
        updateData.estimated_preparation_minutes = 20
      }
      
      const updatedOrder = await updateOrderStatus(order.id, updateData)
      
      // Update local state immediately
      setCurrentOrders(prev => prev.map(o => o.id === order.id ? updatedOrder : o))
      
      toast.success(`Order status updated to ${nextStatus}`)
      onOrderUpdate?.()
    } catch (error) {
      console.error('Error updating order status:', error)
      toast.error('Failed to update order status')
    } finally {
      setUpdatingOrderId(null)
    }
  }

  const handleTimeUpdate = () => {
    // Refresh orders when time is updated
    onOrderUpdate?.()
  }

  const formatTime = (dateString: string | null | undefined): string => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    })
  }

  const getCustomerInitials = (name: string | undefined | null, email: string | undefined | null): string => {
    if (name) {
      const parts = name.split(' ')
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase()
      }
      return name.substring(0, 2).toUpperCase()
    }
    if (email) {
      return email.substring(0, 2).toUpperCase()
    }
    return 'CU'
  }

  const getStatusDescription = (status: Order['status']): string => {
    const descriptions: Record<Order['status'], string> = {
      submitted: '• Waiting for acceptance',
      accepted: '• Accepted',
      in_progress: '• Cooking Now',
      ready: '• Ready to serve',
      completed: '• Completed',
      cancelled_by_user: '• Cancelled by customer',
      cancelled_by_store: '• Cancelled by store',
      created: '• In cart',
    }
    return descriptions[status] || ''
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

  // Group orders by status categories
  const newOrders = currentOrders.filter(order => order.status === 'submitted')
  const inProgressOrders = currentOrders.filter(order => order.status === 'accepted' || order.status === 'in_progress')
  const readyOrders = currentOrders.filter(order => order.status === 'ready')

  // Sort each group by submitted_at (most recent first)
  const sortBySubmittedAt = (a: Order, b: Order) => {
    const aTime = a.submitted_at ? new Date(a.submitted_at).getTime() : 0
    const bTime = b.submitted_at ? new Date(b.submitted_at).getTime() : 0
    return bTime - aTime
  }

  const sortedNewOrders = [...newOrders].sort(sortBySubmittedAt)
  const sortedInProgressOrders = [...inProgressOrders].sort(sortBySubmittedAt)
  const sortedReadyOrders = [...readyOrders].sort(sortBySubmittedAt)

  // For filtered view (not 'all'), get filtered and sorted orders
  const filteredOrders = statusFilter === 'all' 
    ? [] 
    : currentOrders.filter(order => order.status === statusFilter)

  const sortedOrders = [...filteredOrders].sort((a, b) => {
    const priorityDiff = getStatusPriority(a.status) - getStatusPriority(b.status)
    if (priorityDiff !== 0) return priorityDiff
    // If same priority, sort by submitted_at (most recent first)
    const aTime = a.submitted_at ? new Date(a.submitted_at).getTime() : 0
    const bTime = b.submitted_at ? new Date(b.submitted_at).getTime() : 0
    return bTime - aTime
  })

  const renderOrderCard = (order: Order) => {
    const customerName = order.user_profile?.name || order.user_profile?.email || 'Customer'
    const countdownMins = getCountdownMinutes(order)
    const nextStatus = getNextStatus(order.status)
    const canUpdateStatus = nextStatus && nextStatus !== order.status && 
      (order.status === 'submitted' || order.status === 'accepted' || order.status === 'ready' || order.status === 'in_progress')

    const edgeColor = statusEdgeColors[order.status]

    return (
      <Card
        key={order.id}
        className={cn(
          "group relative overflow-hidden transition-all duration-200",
          "border border-border/60 hover:shadow-md",
          "bg-card"
        )}
        onClick={() => {
          setSelectedOrderId(order.id)
          setDetailDialogOpen(true)
        }}
      >
        <div className={cn("absolute left-0 top-0 bottom-0 w-[10px] rounded-l-lg", edgeColor)} />
        <CardContent 
          className="px-6 py-4 cursor-pointer relative"
        >
          {/* Main content row */}
          <div className="flex items-center justify-between gap-4">
            {/* Left: Countdown or spacer */}
            <div className="shrink-0 w-16">
              {countdownMins !== null && (
                <div className="flex flex-col items-center justify-center w-16 h-16 rounded-lg bg-muted/40 border border-border/50">
                  <span className="text-xl font-semibold tabular-nums leading-none">{countdownMins}</span>
                  <span className="text-[10px] text-muted-foreground mt-0.5">mins</span>
                </div>
              )}
            </div>
            
            {/* Center: Customer info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 mb-1.5">
                <span className="font-semibold text-base text-foreground truncate">
                  {customerName}
                </span>
                <span className="text-sm text-muted-foreground font-mono shrink-0">
                  #{order.id.substring(0, 8)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <OrderStatusBadge status={order.status} />
                <OrderModeBadge mode={order.mode} />
              </div>
            </div>
            
            {/* Right: Time adjustment and Action button */}
            <div className="shrink-0 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <TimeAdjustment
                orderId={order.id}
                currentMinutes={order.estimated_preparation_minutes}
                onUpdate={handleTimeUpdate}
              />
              {canUpdateStatus && (
                <Button
                  variant="default"
                  size="default"
                  className="h-10 px-6 font-medium shadow-sm hover:shadow transition-shadow"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleStatusUpdate(order)
                  }}
                  disabled={updatingOrderId === order.id}
                >
                  {updatingOrderId === order.id ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Updating...
                    </span>
                  ) : (
                    getStatusButtonLabel(order.status)
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <div className="pl-6 pt-6 pr-4 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-3xl font-bold">Counter View</h2>
          <div className="text-xl font-mono tabular-nums text-foreground bg-muted/40 border border-border/50 rounded-lg px-3 py-1.5 flex items-center">
            {currentTime.toLocaleTimeString('en-US', { 
              hour: '2-digit', 
              minute: '2-digit',
              hour12: false 
            })}
          </div>
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

      {/* Status Filters */}
      <div className="border-b px-4 py-3">
        <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="submitted">Submitted</TabsTrigger>
            <TabsTrigger value="accepted">Accepted</TabsTrigger>
            <TabsTrigger value="in_progress">In Progress</TabsTrigger>
            <TabsTrigger value="ready">Ready</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Orders Grid */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {statusFilter === 'all' ? (
          <div className="space-y-8">
            {/* New Orders */}
            {sortedNewOrders.length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <h3 className="text-lg font-semibold text-foreground">New</h3>
                  <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-2 text-xs font-medium rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    {sortedNewOrders.length}
                  </span>
                </div>
                <div className="space-y-3">
                  {sortedNewOrders.map((order) => renderOrderCard(order))}
                </div>
              </div>
            )}

            {/* In Progress Orders */}
            {sortedInProgressOrders.length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <h3 className="text-lg font-semibold text-foreground">In Progress</h3>
                  <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-2 text-xs font-medium rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                    {sortedInProgressOrders.length}
                  </span>
                </div>
                <div className="space-y-3">
                  {sortedInProgressOrders.map((order) => renderOrderCard(order))}
                </div>
              </div>
            )}

            {/* Ready Orders */}
            {sortedReadyOrders.length > 0 && (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <h3 className="text-lg font-semibold text-foreground">Ready</h3>
                  <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-2 text-xs font-medium rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                    {sortedReadyOrders.length}
                  </span>
                </div>
                <div className="space-y-3">
                  {sortedReadyOrders.map((order) => renderOrderCard(order))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {sortedNewOrders.length === 0 && sortedInProgressOrders.length === 0 && sortedReadyOrders.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full">
                <p className="text-muted-foreground text-lg">No orders</p>
                <p className="text-muted-foreground text-sm mt-2">No orders available.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {sortedOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-12">
                <p className="text-muted-foreground text-lg font-medium">No orders</p>
                <p className="text-muted-foreground text-sm mt-2">
                  {`No orders with status "${statusFilter}".`}
                </p>
              </div>
            ) : (
              sortedOrders.map((order) => renderOrderCard(order))
            )}
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

