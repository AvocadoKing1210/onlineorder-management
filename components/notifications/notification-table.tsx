'use client'

import * as React from 'react'
import {
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
  IconDotsVertical,
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
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import {
  type Notification,
  getNotificationStatus,
  type NotificationStatus,
} from '@/lib/api/notifications'
import { NotificationStatusBadge } from './notification-status-badge'
import { NotificationAudienceBadge } from './notification-audience-badge'
import { cn } from '@/lib/utils'

interface NotificationTableProps {
  data: Notification[]
  onEdit: (notification: Notification) => void
  onDelete: (notification: Notification) => void
  isLoading?: boolean
}

export function NotificationTable({
  data,
  onEdit,
  onDelete,
  isLoading = false,
}: NotificationTableProps) {
  const { t } = useTranslation()
  const [localData, setLocalData] = React.useState(data)
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({
    body: false,
    expiry_at: false,
    updated_at: false,
  })
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  })
  const [showFilters, setShowFilters] = React.useState(false)
  const [audienceFilter, setAudienceFilter] = React.useState<'all_customers' | 'recent_purchasers' | 'all'>('all')
  const [statusFilter, setStatusFilter] = React.useState<NotificationStatus | 'all'>('all')

  // Sync local data with props
  React.useEffect(() => {
    setLocalData(data)
  }, [data])

  // Filter data by audience and status
  const filteredData = React.useMemo(() => {
    let result = localData

    if (audienceFilter !== 'all') {
      result = result.filter((n) => n.audience === audienceFilter)
    }

    if (statusFilter !== 'all') {
      result = result.filter((n) => getNotificationStatus(n) === statusFilter)
    }

    return result
  }, [localData, audienceFilter, statusFilter])

  const hasActiveFilters = audienceFilter !== 'all' || statusFilter !== 'all'

  const clearFilters = () => {
    setAudienceFilter('all')
    setStatusFilter('all')
  }

  const columns: ColumnDef<Notification>[] = React.useMemo(
    () => [
      {
        accessorKey: 'title',
        header: t('notifications.table.title'),
        cell: ({ row }) => {
          const notification = row.original
          return (
            <div className="flex flex-col gap-1">
              <span className="font-medium">{notification.title}</span>
              {notification.body && (
                <span className="text-xs text-muted-foreground line-clamp-1">
                  {notification.body}
                </span>
              )}
            </div>
          )
        },
        enableHiding: false,
      },
      {
        accessorKey: 'body',
        header: t('notifications.table.body'),
        cell: ({ row }) => {
          const notification = row.original
          return (
            <span className="text-sm text-muted-foreground line-clamp-2">
              {notification.body}
            </span>
          )
        },
      },
      {
        accessorKey: 'audience',
        header: t('notifications.table.audience'),
        cell: ({ row }) => {
          const notification = row.original
          return <NotificationAudienceBadge audience={notification.audience} />
        },
      },
      {
        accessorKey: 'published_at',
        header: t('notifications.table.publishedAt'),
        cell: ({ row }) => {
          const date = new Date(row.original.published_at)
          return (
            <div className="text-muted-foreground text-sm">
              {date.toLocaleDateString()}{' '}
              {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          )
        },
      },
      {
        accessorKey: 'expiry_at',
        header: t('notifications.table.expiryAt'),
        cell: ({ row }) => {
          const notification = row.original
          if (!notification.expiry_at) {
            return <span className="text-sm text-muted-foreground">-</span>
          }
          const date = new Date(notification.expiry_at)
          const now = new Date()
          const isExpired = date < now
          return (
            <div className={cn(
              "text-sm",
              isExpired ? "text-destructive" : "text-muted-foreground"
            )}>
              {date.toLocaleDateString()}{' '}
              {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          )
        },
      },
      {
        accessorKey: 'status',
        header: t('notifications.table.status'),
        cell: ({ row }) => {
          const notification = row.original
          const status = getNotificationStatus(notification)
          return <NotificationStatusBadge status={status} />
        },
      },
      {
        accessorKey: 'updated_at',
        header: t('notifications.table.updatedAt'),
        cell: ({ row }) => {
          const date = new Date(row.original.updated_at)
          return (
            <div className="text-muted-foreground text-sm">
              {date.toLocaleDateString()}{' '}
              {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          )
        },
      },
      {
        id: 'actions',
        cell: ({ row }) => {
          const notification = row.original
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="data-[state=open]:bg-muted text-muted-foreground flex size-8"
                  size="icon"
                >
                  <IconDotsVertical />
                  <span className="sr-only">Open menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={() => onEdit(notification)}>
                  {t('notifications.edit')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onDelete(notification)}
                  className="text-destructive"
                >
                  {t('notifications.deleteNotification')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )
        },
        enableHiding: false,
        size: 50,
        meta: {
          sticky: 'right',
        },
      },
    ],
    [t, onEdit, onDelete]
  )

  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      sorting,
      columnVisibility,
      columnFilters,
      pagination,
    },
    getRowId: (row) => row.id,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between gap-4">
        <Input
          placeholder={t('notifications.filters.search')}
          value={(table.getColumn('title')?.getFilterValue() as string) ?? ''}
          onChange={(event) =>
            table.getColumn('title')?.setFilterValue(event.target.value)
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
            <span className="hidden lg:inline">{t('notifications.filters.title')}</span>
            {hasActiveFilters && (
              <Badge variant="secondary" className="ml-1 h-5 min-w-5 rounded-full px-1.5 shrink-0">
                {[audienceFilter !== 'all' ? 1 : 0, statusFilter !== 'all' ? 1 : 0].reduce(
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
            {/* Audience Filter */}
            <div className="space-y-2 min-w-[180px] flex-shrink-0">
              <Label className="text-xs">{t('notifications.fields.audience')}</Label>
              <Select
                value={audienceFilter}
                onValueChange={(value) =>
                  setAudienceFilter(value as 'all_customers' | 'recent_purchasers' | 'all')
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('notifications.fields.audience')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('notifications.filters.allAudiences')}</SelectItem>
                  <SelectItem value="all_customers">
                    {t('notifications.fields.audienceAllCustomers')}
                  </SelectItem>
                  <SelectItem value="recent_purchasers">
                    {t('notifications.fields.audienceRecentPurchasers')}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            <div className="space-y-2 min-w-[180px] flex-shrink-0">
              <Label className="text-xs">{t('notifications.status.title')}</Label>
              <Select
                value={statusFilter}
                onValueChange={(value) =>
                  setStatusFilter(value as NotificationStatus | 'all')
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('notifications.status.title')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('notifications.filters.allStatuses')}</SelectItem>
                  <SelectItem value="active">{t('notifications.status.active')}</SelectItem>
                  <SelectItem value="inactive">{t('notifications.status.inactive')}</SelectItem>
                  <SelectItem value="expired">{t('notifications.status.expired')}</SelectItem>
                  <SelectItem value="upcoming">{t('notifications.status.upcoming')}</SelectItem>
                </SelectContent>
              </Select>
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
                {t('notifications.filters.clearFilters')}
              </Button>
            )}
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader className="bg-muted sticky top-0 z-10">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const isActionsColumn = header.column.id === 'actions'
                  return (
                    <TableHead
                      key={header.id}
                      colSpan={header.colSpan}
                      style={{
                        width:
                          header.getSize() !== 150 ? header.getSize() : undefined,
                      }}
                      className={cn(
                        isActionsColumn &&
                          'sticky right-0 bg-background z-10 border-l border-border/50'
                      )}
                    >
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
              <TableRow className="border-b">
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  {t('notifications.loading')}
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => {
                return (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && 'selected'}
                  >
                    {row.getVisibleCells().map((cell, cellIndex) => {
                      const isLastCell =
                        cellIndex === row.getVisibleCells().length - 1
                      const isActions = cell.column.id === 'actions'
                      return (
                        <TableCell
                          key={cell.id}
                          className={cn(
                            'relative',
                            !isLastCell && 'pr-0',
                            isActions &&
                              'text-right sticky right-0 bg-background z-10 border-l border-border/50'
                          )}
                        >
                          <div
                            className={cn(
                              'flex items-center h-full',
                              isActions && 'justify-end'
                            )}
                          >
                            {isActions ? (
                              flexRender(
                                cell.column.columnDef.cell,
                                cell.getContext()
                              )
                            ) : (
                              <>
                                <div className="flex-1">
                                  {flexRender(
                                    cell.column.columnDef.cell,
                                    cell.getContext()
                                  )}
                                </div>
                                {!isLastCell && (
                                  <div className="h-6 w-[1px] bg-border/60 mx-3 shrink-0 my-2" />
                                )}
                              </>
                            )}
                          </div>
                        </TableCell>
                      )
                    })}
                  </TableRow>
                )
              })
            ) : (
              <TableRow className="border-b">
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  {t('common.noResults')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between px-4">
        <div className="flex w-full items-center gap-8 lg:w-fit lg:ml-auto">
          <div className="hidden items-center gap-2 lg:flex">
            <Label htmlFor="rows-per-page" className="text-sm font-medium">
              {t('common.rowsPerPage')}
            </Label>
            <Select
              value={`${table.getState().pagination.pageSize}`}
              onValueChange={(value) => {
                table.setPageSize(Number(value))
              }}
            >
              <SelectTrigger size="sm" className="w-20" id="rows-per-page">
                <SelectValue
                  placeholder={table.getState().pagination.pageSize}
                />
              </SelectTrigger>
              <SelectContent side="top">
                {[10, 20, 30, 40, 50].map((pageSize) => (
                  <SelectItem key={pageSize} value={`${pageSize}`}>
                    {pageSize}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex w-fit items-center justify-center text-sm font-medium">
            {t('common.page')} {table.getState().pagination.pageIndex + 1}{' '}
            {t('common.of')} {table.getPageCount()}
          </div>
          <div className="ml-auto flex items-center gap-2 lg:ml-0">
            <Button
              variant="outline"
              className="hidden size-8 p-0 lg:flex"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Go to first page</span>
              <IconChevronsLeft />
            </Button>
            <Button
              variant="outline"
              className="size-8"
              size="icon"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Go to previous page</span>
              <IconChevronLeft />
            </Button>
            <Button
              variant="outline"
              className="size-8"
              size="icon"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Go to next page</span>
              <IconChevronRight />
            </Button>
            <Button
              variant="outline"
              className="hidden size-8 lg:flex"
              size="icon"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Go to last page</span>
              <IconChevronsRight />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

