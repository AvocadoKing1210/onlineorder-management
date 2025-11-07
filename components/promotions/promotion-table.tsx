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
  IconCheck,
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useTranslation } from '@/components/i18n-text'
import {
  type Promotion,
  getPromotionStatus,
  formatPromotionDiscount,
  type PromotionStatus,
} from '@/lib/api/promotions'
import { cn } from '@/lib/utils'

interface PromotionTableProps {
  data: Promotion[]
  onEdit: (promotion: Promotion) => void
  onDelete: (promotion: Promotion) => void
  onQuickEdit?: (promotion: Promotion, field: 'stackable' | 'status', value: boolean | PromotionStatus) => Promise<void>
  isLoading?: boolean
}

const statusBadgeVariants: Record<PromotionStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  active: 'default',
  inactive: 'secondary',
  expired: 'destructive',
  upcoming: 'outline',
}

export function PromotionTable({
  data,
  onEdit,
  onDelete,
  onQuickEdit,
  isLoading = false,
}: PromotionTableProps) {
  const { t } = useTranslation()
  const [localData, setLocalData] = React.useState(data)
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({
    limits: false,
    updated_at: false,
  })
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  })
  const [showFilters, setShowFilters] = React.useState(false)
  const [typeFilter, setTypeFilter] = React.useState<'bogo' | 'percent_off' | 'amount_off' | 'all'>('all')
  const [statusFilter, setStatusFilter] = React.useState<PromotionStatus | 'all'>('all')

  // Sync local data with props
  React.useEffect(() => {
    setLocalData(data)
  }, [data])

  // Filter data by type and status
  const filteredData = React.useMemo(() => {
    let result = localData

    if (typeFilter !== 'all') {
      result = result.filter((p) => p.type === typeFilter)
    }

    if (statusFilter !== 'all') {
      result = result.filter((p) => getPromotionStatus(p) === statusFilter)
    }

    return result
  }, [localData, typeFilter, statusFilter])

  const hasActiveFilters = typeFilter !== 'all' || statusFilter !== 'all'

  const clearFilters = () => {
    setTypeFilter('all')
    setStatusFilter('all')
  }

  const columns: ColumnDef<Promotion>[] = React.useMemo(
    () => [
      {
        accessorKey: 'name',
        header: t('promotions.fields.name'),
        cell: ({ row }) => {
          const promotion = row.original
          return (
            <div className="flex flex-col gap-1">
              <span className="font-medium">{promotion.name}</span>
              {promotion.description && (
                <span className="text-xs text-muted-foreground line-clamp-1">
                  {promotion.description}
                </span>
              )}
            </div>
          )
        },
        enableHiding: false,
      },
      {
        accessorKey: 'type',
        header: t('promotions.fields.type'),
        cell: ({ row }) => {
          const promotion = row.original
          const typeLabels: Record<string, string> = {
            bogo: t('promotions.fields.typeBogo'),
            percent_off: t('promotions.fields.typePercentOff'),
            amount_off: t('promotions.fields.typeAmountOff'),
          }
          return (
            <Badge variant="outline">{typeLabels[promotion.type] || promotion.type}</Badge>
          )
        },
      },
      {
        accessorKey: 'discount',
        header: t('promotions.fields.discount'),
        cell: ({ row }) => {
          const promotion = row.original
          const discount = formatPromotionDiscount(promotion)
          return <span className="font-medium">{discount || '-'}</span>
        },
      },
      {
        accessorKey: 'status',
        header: t('promotions.status.title'),
        cell: ({ row }) => {
          const promotion = row.original
          const status = getPromotionStatus(promotion)
          const statusLabels: Record<PromotionStatus, string> = {
            active: t('promotions.status.active'),
            inactive: t('promotions.status.inactive'),
            expired: t('promotions.status.expired'),
            upcoming: t('promotions.status.upcoming'),
          }
          const handleClick = async () => {
            if (!onQuickEdit) return
            // Toggle between active and inactive
            const newStatus = status === 'active' ? 'inactive' : 'active'
            
            // Optimistically update local state
            const updatedPromotion = { ...promotion }
            if (newStatus === 'inactive') {
              updatedPromotion.active_until = new Date().toISOString()
            } else {
              const now = new Date()
              if (new Date(promotion.active_from) > now) {
                updatedPromotion.active_from = now.toISOString()
              }
              const futureDate = new Date()
              futureDate.setDate(futureDate.getDate() + 30)
              updatedPromotion.active_until = futureDate.toISOString()
            }
            
            setLocalData((prev) =>
              prev.map((p) => (p.id === promotion.id ? updatedPromotion : p))
            )
            
            try {
              await onQuickEdit(promotion, 'status', newStatus)
            } catch (error) {
              // Revert on error
              setLocalData((prev) =>
                prev.map((p) => (p.id === promotion.id ? promotion : p))
              )
            }
          }
          return (
            <Badge 
              variant={statusBadgeVariants[status]}
              className={cn(onQuickEdit && "cursor-pointer hover:opacity-80 transition-opacity")}
              onClick={onQuickEdit ? handleClick : undefined}
            >
              {statusLabels[status]}
            </Badge>
          )
        },
      },
      {
        accessorKey: 'active_period',
        header: t('promotions.fields.expireIn') || 'Expire In',
        cell: ({ row }) => {
          const promotion = row.original
          const now = new Date()
          const until = promotion.active_until ? new Date(promotion.active_until) : null
          
          if (!until) {
            return <span className="text-sm text-muted-foreground">Never</span>
          }
          
          const diffMs = until.getTime() - now.getTime()
          const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
          const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
          const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
          
          let expireText = ''
          if (diffMs < 0) {
            expireText = 'Expired'
          } else if (diffDays > 0) {
            expireText = `${diffDays} day${diffDays !== 1 ? 's' : ''}`
          } else if (diffHours > 0) {
            expireText = `${diffHours} hour${diffHours !== 1 ? 's' : ''}`
          } else if (diffMinutes > 0) {
            expireText = `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''}`
          } else {
            expireText = 'Less than a minute'
          }
          
          return (
            <span className={cn(
              "text-sm",
              diffMs < 0 ? "text-destructive" : diffDays < 1 ? "text-orange-600" : "text-muted-foreground"
            )}>
              {expireText}
            </span>
          )
        },
      },
      {
        accessorKey: 'stackable',
        header: () => (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="cursor-help">{t('promotions.fields.stackable')}</span>
            </TooltipTrigger>
            <TooltipContent>
              <p className="font-medium">{t('promotions.fields.stackable')}</p>
              <p className="text-xs opacity-80">{t('promotions.fields.stackableDescription')}</p>
            </TooltipContent>
          </Tooltip>
        ),
        cell: ({ row }) => {
          const promotion = row.original
          const handleClick = async () => {
            if (!onQuickEdit) return
            const newStackable = !promotion.stackable
            
            // Optimistically update local state
            setLocalData((prev) =>
              prev.map((p) =>
                p.id === promotion.id ? { ...p, stackable: newStackable } : p
              )
            )
            
            try {
              await onQuickEdit(promotion, 'stackable', newStackable)
            } catch (error) {
              // Revert on error
              setLocalData((prev) =>
                prev.map((p) => (p.id === promotion.id ? promotion : p))
              )
            }
          }
          return (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={onQuickEdit ? handleClick : undefined}
                  disabled={!onQuickEdit}
                  className={cn(
                    "flex items-center justify-center p-1 rounded transition-colors",
                    onQuickEdit 
                      ? "hover:bg-muted cursor-pointer" 
                      : "cursor-default opacity-50"
                  )}
                  aria-label={promotion.stackable ? t('promotions.fields.stackable') : t('promotions.fields.notStackable')}
                >
                  {promotion.stackable ? (
                    <IconCheck className="h-4 w-4 text-green-600 dark:text-green-400" />
                  ) : (
                    <IconX className="h-4 w-4 text-red-600 dark:text-red-400" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{promotion.stackable ? t('promotions.fields.stackable') : t('promotions.fields.notStackable')}</p>
                <p className="text-xs opacity-80">{t('promotions.fields.stackableDescription')}</p>
              </TooltipContent>
            </Tooltip>
          )
        },
      },
      {
        accessorKey: 'limits',
        header: t('promotions.fields.limits'),
        cell: ({ row }) => {
          const promotion = row.original
          const limits: string[] = []
          if (promotion.limit_per_user) {
            limits.push(`${t('promotions.fields.limitPerUser')}: ${promotion.limit_per_user}`)
          }
          if (promotion.limit_total) {
            limits.push(`${t('promotions.fields.limitTotal')}: ${promotion.limit_total}`)
          }
          return (
            <div className="text-xs text-muted-foreground">
              {limits.length > 0 ? limits.join(', ') : t('promotions.fields.unlimited')}
            </div>
          )
        },
      },
      {
        accessorKey: 'updated_at',
        header: t('promotions.fields.updatedAt'),
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
          const promotion = row.original
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
                <DropdownMenuItem onClick={() => onEdit(promotion)}>
                  {t('promotions.edit')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onDelete(promotion)}
                  className="text-destructive"
                >
                  {t('promotions.deletePromotion')}
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
    [t, onEdit, onDelete, onQuickEdit]
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
          placeholder={t('common.search')}
          value={(table.getColumn('name')?.getFilterValue() as string) ?? ''}
          onChange={(event) =>
            table.getColumn('name')?.setFilterValue(event.target.value)
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
            <span className="hidden lg:inline">{t('promotions.filters.title')}</span>
            {hasActiveFilters && (
              <Badge variant="secondary" className="ml-1 h-5 min-w-5 rounded-full px-1.5 shrink-0">
                {[typeFilter !== 'all' ? 1 : 0, statusFilter !== 'all' ? 1 : 0].reduce(
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
            {/* Type Filter */}
            <div className="space-y-2 min-w-[180px] flex-shrink-0">
              <Label className="text-xs">{t('promotions.fields.type')}</Label>
              <Select
                value={typeFilter}
                onValueChange={(value) =>
                  setTypeFilter(value as 'bogo' | 'percent_off' | 'amount_off' | 'all')
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('promotions.fields.type')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('promotions.filters.allTypes')}</SelectItem>
                  <SelectItem value="bogo">{t('promotions.fields.typeBogo')}</SelectItem>
                  <SelectItem value="percent_off">
                    {t('promotions.fields.typePercentOff')}
                  </SelectItem>
                  <SelectItem value="amount_off">
                    {t('promotions.fields.typeAmountOff')}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            <div className="space-y-2 min-w-[180px] flex-shrink-0">
              <Label className="text-xs">{t('promotions.status.title')}</Label>
              <Select
                value={statusFilter}
                onValueChange={(value) =>
                  setStatusFilter(value as PromotionStatus | 'all')
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('promotions.status.title')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('promotions.filters.allStatuses')}</SelectItem>
                  <SelectItem value="active">{t('promotions.status.active')}</SelectItem>
                  <SelectItem value="inactive">{t('promotions.status.inactive')}</SelectItem>
                  <SelectItem value="expired">{t('promotions.status.expired')}</SelectItem>
                  <SelectItem value="upcoming">{t('promotions.status.upcoming')}</SelectItem>
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
                {t('promotions.filters.clearFilters')}
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
                  {t('promotions.loading')}
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

