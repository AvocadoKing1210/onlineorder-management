'use client'

import * as React from 'react'
import {
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
  IconLayoutColumns,
  IconFilter,
  IconX,
} from '@tabler/icons-react'
import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  VisibilityState,
} from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useTranslation } from '@/components/i18n-text'
import { type Order } from '@/lib/api/orders'
import { OrderStatusBadge } from './order-status-badge'
import { OrderModeBadge } from './order-mode-badge'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { OrderDetailDialog } from './order-detail-dialog'
import { DateRangePicker } from '@/components/ui/date-range-picker'
import { IconCalendar } from '@tabler/icons-react'

interface OrderTableProps {
  data: Order[]
  onUpdateStatus?: (order: Order) => void
  onCancel?: (order: Order) => void
  isLoading?: boolean
}

export function OrderTable({
  data,
  onUpdateStatus,
  onCancel,
  isLoading = false,
}: OrderTableProps) {
  const { t } = useTranslation()
  const [localData, setLocalData] = React.useState(data)
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({
    user_id: false,
    special_instructions: false,
    updated_at: false,
  })
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  })
  const [showFilters, setShowFilters] = React.useState(false)
  const [statusFilter, setStatusFilter] = React.useState<Order['status'] | 'all'>('all')
  const [modeFilter, setModeFilter] = React.useState<Order['mode'] | 'all'>('all')
  const [copiedOrderId, setCopiedOrderId] = React.useState<string | null>(null)
  const [detailDialogOpen, setDetailDialogOpen] = React.useState(false)
  const [selectedOrderId, setSelectedOrderId] = React.useState<string | null>(null)
  const [dateFrom, setDateFrom] = React.useState<Date | undefined>(undefined)
  const [dateTo, setDateTo] = React.useState<Date | undefined>(undefined)

  // Sync local data with props
  React.useEffect(() => {
    setLocalData(data)
  }, [data])

  // Filter data by status, mode, and date range
  const filteredData = React.useMemo(() => {
    let result = localData

    if (statusFilter !== 'all') {
      result = result.filter((o) => o.status === statusFilter)
    }

    if (modeFilter !== 'all') {
      result = result.filter((o) => o.mode === modeFilter)
    }

    // Filter by date range (using submitted_at)
    if (dateFrom || dateTo) {
      result = result.filter((o) => {
        if (!o.submitted_at) return false
        const submittedDate = new Date(o.submitted_at)
        submittedDate.setHours(0, 0, 0, 0)
        
        if (dateFrom) {
          const fromDate = new Date(dateFrom)
          fromDate.setHours(0, 0, 0, 0)
          if (submittedDate < fromDate) return false
        }
        
        if (dateTo) {
          const toDate = new Date(dateTo)
          toDate.setHours(23, 59, 59, 999)
          if (submittedDate > toDate) return false
        }
        
        return true
      })
    }

    return result
  }, [localData, statusFilter, modeFilter, dateFrom, dateTo])

  const hasActiveFilters = statusFilter !== 'all' || modeFilter !== 'all' || dateFrom || dateTo

  const clearFilters = () => {
    setStatusFilter('all')
    setModeFilter('all')
    setDateFrom(undefined)
    setDateTo(undefined)
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

  const truncateId = (id: string): string => {
    return id.substring(0, 5)
  }

  const handleCopyOrderId = async (orderId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(orderId)
      setCopiedOrderId(orderId)
      setTimeout(() => {
        setCopiedOrderId(null)
      }, 2000)
    } catch (error) {
      console.error('Failed to copy order ID:', error)
    }
  }

  const columns: ColumnDef<Order>[] = React.useMemo(
    () => [
      {
        accessorKey: 'id',
        header: t('orders.table.orderId'),
        cell: ({ row }) => {
          const order = row.original
          const isCopied = copiedOrderId === order.id
          return (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={(e) => handleCopyOrderId(order.id, e)}
                  className="text-left"
                >
                  <code className="text-xs font-mono bg-muted px-2 py-1 rounded hover:bg-muted/80 transition-colors cursor-pointer">
                    {truncateId(order.id)}
                  </code>
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isCopied ? (t('common.copied') || 'Copied!') : (t('common.clickToCopy') || 'Click to copy')}</p>
              </TooltipContent>
            </Tooltip>
          )
        },
        enableHiding: false,
      },
      {
        accessorKey: 'customer',
        header: t('orders.table.customer'),
        cell: ({ row }) => {
          const order = row.original
          // Show only name: display_name > email > User {truncated_id}
          const displayName = order.user_profile?.name || order.user_profile?.email || `User ${truncateId(order.user_id)}`
          
          return (
            <span className="font-medium">{displayName}</span>
          )
        },
      },
      {
        accessorKey: 'mode',
        header: t('orders.table.mode'),
        cell: ({ row }) => {
          return <OrderModeBadge mode={row.original.mode} />
        },
      },
      {
        accessorKey: 'status',
        header: t('orders.table.status'),
        cell: ({ row }) => {
          return <OrderStatusBadge status={row.original.status} />
        },
      },
      {
        accessorKey: 'total_amount',
        header: t('orders.table.total'),
        cell: ({ row }) => {
          return (
            <span className="font-medium">
              {formatCurrency(row.original.total_amount)}
            </span>
          )
        },
      },
      {
        accessorKey: 'item_count',
        header: t('orders.table.items'),
        cell: ({ row }) => {
          return (
            <Badge variant="secondary">
              {row.original.item_count || 0}
            </Badge>
          )
        },
      },
      {
        accessorKey: 'updated_at',
        header: t('orders.table.updatedAt'),
        cell: ({ row }) => {
          return (
            <span className="text-sm text-muted-foreground">
              {formatRelativeTime(row.original.updated_at)}
            </span>
          )
        },
      },
    ],
    [t]
  )

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onColumnFiltersChange: setColumnFilters,
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    state: {
      columnVisibility,
      columnFilters,
      sorting,
      pagination,
    },
  })

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between gap-4">
        <Input
          placeholder={t('orders.filters.search')}
          value={(table.getColumn('id')?.getFilterValue() as string) ?? ''}
          onChange={(event) =>
            table.getColumn('id')?.setFilterValue(event.target.value)
          }
          className="w-80"
        />
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className={cn(hasActiveFilters && 'border-primary')}
          >
            <IconFilter className="h-4 w-4 shrink-0" />
            <span className="hidden lg:inline">{t('common.filter') || 'Filter'}</span>
            {hasActiveFilters && (
              <Badge variant="secondary" className="ml-1 h-5 min-w-5 rounded-full px-1.5 shrink-0">
                {[statusFilter !== 'all' ? 1 : 0, modeFilter !== 'all' ? 1 : 0, dateFrom || dateTo ? 1 : 0].reduce(
                  (a, b) => a + b,
                  0
                )}
              </Badge>
            )}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <IconLayoutColumns />
                <span className="hidden lg:inline">Columns</span>
                <IconChevronDown />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {table
                .getAllColumns()
                .filter(
                  (column) =>
                    typeof column.accessorFn !== 'undefined' && column.getCanHide()
                )
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) => column.toggleVisibility(!!value)}
                    >
                      {column.id}
                    </DropdownMenuCheckboxItem>
                  )
                })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {showFilters && (
        <div className="rounded-lg border bg-muted/50 p-4">
          <div className="flex items-end gap-2 overflow-x-auto pb-2 -mx-4 px-4">
            {/* Status Filter */}
            <div className="space-y-2 min-w-[180px] flex-shrink-0">
              <Label className="text-xs">{t('orders.filters.allStatuses')}</Label>
              <Select
                value={statusFilter}
                onValueChange={(value) =>
                  setStatusFilter(value as Order['status'] | 'all')
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('orders.filters.allStatuses')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('orders.filters.allStatuses')}</SelectItem>
                  <SelectItem value="created">{t('orders.status.created')}</SelectItem>
                  <SelectItem value="submitted">{t('orders.status.submitted')}</SelectItem>
                  <SelectItem value="accepted">{t('orders.status.accepted')}</SelectItem>
                  <SelectItem value="in_progress">{t('orders.status.in_progress')}</SelectItem>
                  <SelectItem value="ready">{t('orders.status.ready')}</SelectItem>
                  <SelectItem value="completed">{t('orders.status.completed')}</SelectItem>
                  <SelectItem value="cancelled_by_user">{t('orders.status.cancelled_by_user')}</SelectItem>
                  <SelectItem value="cancelled_by_store">{t('orders.status.cancelled_by_store')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Mode Filter */}
            <div className="space-y-2 min-w-[180px] flex-shrink-0">
              <Label className="text-xs">{t('orders.filters.allModes')}</Label>
              <Select
                value={modeFilter}
                onValueChange={(value) =>
                  setModeFilter(value as Order['mode'] | 'all')
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('orders.filters.allModes')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('orders.filters.allModes')}</SelectItem>
                  <SelectItem value="dine_in">{t('orders.mode.dine_in')}</SelectItem>
                  <SelectItem value="takeout">{t('orders.mode.takeout')}</SelectItem>
                  <SelectItem value="delivery">{t('orders.mode.delivery')}</SelectItem>
                  <SelectItem value="view_only">{t('orders.mode.view_only')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date Range Filter */}
            <div className="space-y-2 min-w-[280px] flex-shrink-0">
              <Label className="text-xs">{t('orders.filters.dateFrom')} - {t('orders.filters.dateTo')}</Label>
              <DateRangePicker
                initialDateFrom={dateFrom}
                initialDateTo={dateTo}
                onUpdate={(values) => {
                  setDateFrom(values.range.from)
                  setDateTo(values.range.to || undefined)
                }}
                align="start"
                showCompare={false}
              />
            </div>

            {/* Clear Filters Button */}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-9 text-xs shrink-0"
              >
                <IconX className="mr-1 h-3 w-3" />
                {t('common.clear') || 'Clear'}
              </Button>
            )}
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  {t('common.loading') || 'Loading...'}
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  className="cursor-pointer"
                  onClick={() => {
                    setSelectedOrderId(row.original.id)
                    setDetailDialogOpen(true)
                  }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  {t('orders.noOrders')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-4">
        <div className="hidden text-sm text-muted-foreground lg:flex">
          {t('common.showingResults', {
            from: table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1,
            to: Math.min(
              (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
              filteredData.length
            ),
            total: filteredData.length,
          })}
        </div>
        <div className="flex w-full items-center gap-4 lg:w-fit lg:ml-auto">
          {/* Mobile: Simple Previous/Next */}
          <div className="flex items-center gap-2 lg:hidden">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <IconChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-sm font-medium">
              {t('common.page')} {table.getState().pagination.pageIndex + 1} {t('common.of')}{' '}
              {table.getPageCount()}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <IconChevronRight className="h-4 w-4" />
            </Button>
          </div>
          {/* Desktop: Full pagination with first/last */}
          <div className="hidden items-center gap-2 lg:flex">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              <IconChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <IconChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-sm font-medium">
              {t('common.page')} {table.getState().pagination.pageIndex + 1} {t('common.of')}{' '}
              {table.getPageCount()}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <IconChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              <IconChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <OrderDetailDialog
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        orderId={selectedOrderId}
      />
    </div>
  )
}

