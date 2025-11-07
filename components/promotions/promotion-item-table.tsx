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
  IconExternalLink,
  IconTrash,
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
  type PromotionItemWithRelations,
} from '@/lib/api/promotion-items'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface PromotionItemTableProps {
  data: PromotionItemWithRelations[]
  promotions?: Array<{ id: string; name: string }> // Optional since we're in promotion context
  menuItems: Array<{ id: string; name: string; visible: boolean }>
  onEdit: (item: PromotionItemWithRelations) => void
  onDelete: (id: string) => void
  isLoading?: boolean
  promotionType?: string // 'bogo' | 'percent_off' | 'amount_off'
}

const roleBadgeVariants: Record<'buy' | 'get' | 'target', 'default' | 'secondary' | 'outline'> = {
  buy: 'default',
  get: 'secondary',
  target: 'outline',
}

export function PromotionItemTable({
  data,
  promotions,
  menuItems,
  onEdit,
  onDelete,
  isLoading = false,
  promotionType,
}: PromotionItemTableProps) {
  const { t } = useTranslation()
  const isBOGO = promotionType === 'bogo'
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>(() => {
    // For BOGO, hide all columns except menu_item by default
    if (isBOGO) {
      return {
        role: false,
        required_quantity: false,
        get_quantity: false,
        updated_at: false,
      } as VisibilityState
    }
    return {} as VisibilityState
  })
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  })
  const [showFilters, setShowFilters] = React.useState(false)
  const [roleFilter, setRoleFilter] = React.useState<'buy' | 'get' | 'target' | 'all'>('all')
  const [searchQuery, setSearchQuery] = React.useState('')

  // Filter data
  const filteredData = React.useMemo(() => {
    let result = data

    // Filter by role
    if (roleFilter !== 'all') {
      result = result.filter((item) => item.role === roleFilter)
    }

    // Filter by search query (menu item name)
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter((item) => 
        item.menu_item?.name?.toLowerCase().includes(query)
      )
    }

    return result
  }, [data, roleFilter, searchQuery])

  const hasActiveFilters = roleFilter !== 'all' || searchQuery !== ''

  const clearFilters = () => {
    setRoleFilter('all')
    setSearchQuery('')
  }

  const columns: ColumnDef<PromotionItemWithRelations>[] = React.useMemo(
    () => [
      {
        accessorKey: 'menu_item',
        header: t('promotions.items.menuItem'),
        cell: ({ row }) => {
          const menuItem = row.original.menu_item
          if (!menuItem) return <span className="text-muted-foreground">—</span>
          // For BOGO, show plain text without link
          if (isBOGO) {
            return (
              <div className="flex items-center gap-2">
                <span className="font-medium">{menuItem.name}</span>
                {!menuItem.visible && (
                  <Badge variant="secondary" className="text-xs">
                    {t('common.hidden')}
                  </Badge>
                )}
              </div>
            )
          }
          // For non-BOGO, show with link
          return (
            <div className="flex items-center gap-2">
              <Link
                href={`/menu/items?item=${menuItem.id}`}
                className="font-medium hover:underline flex items-center gap-1"
              >
                {menuItem.name}
                <IconExternalLink className="h-3 w-3" />
              </Link>
              {!menuItem.visible && (
                <Badge variant="secondary" className="text-xs">
                  {t('common.hidden')}
                </Badge>
              )}
            </div>
          )
        },
      },
      {
        accessorKey: 'role',
        header: t('promotions.items.role'),
        cell: ({ row }) => {
          const role = row.original.role
          const roleLabels: Record<string, string> = {
            buy: t('promotions.items.roleBuy'),
            get: t('promotions.items.roleGet'),
            target: t('promotions.items.roleTarget'),
          }
          return (
            <Badge variant={roleBadgeVariants[role]}>
              {roleLabels[role] || role}
            </Badge>
          )
        },
      },
      {
        accessorKey: 'required_quantity',
        header: t('promotions.items.requiredQuantity'),
        cell: ({ row }) => {
          const quantity = row.original.required_quantity
          return quantity ? (
            <span className="text-sm">{quantity}</span>
          ) : (
            <span className="text-muted-foreground">—</span>
          )
        },
      },
      {
        accessorKey: 'get_quantity',
        header: t('promotions.items.getQuantity'),
        cell: ({ row }) => {
          const quantity = row.original.get_quantity
          return quantity ? (
            <span className="text-sm">{quantity}</span>
          ) : (
            <span className="text-muted-foreground">—</span>
          )
        },
      },
      {
        accessorKey: 'updated_at',
        header: t('promotions.fields.updatedAt'),
        cell: ({ row }) => {
          const date = new Date(row.original.updated_at)
          return (
            <span className="text-sm text-muted-foreground">
              {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )
        },
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => {
          const item = row.original
          // For BOGO, show only delete button (trash icon)
          if (isBOGO) {
            return (
              <div className="flex items-center justify-end">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => onDelete(item.id)}
                >
                  <IconTrash className="h-4 w-4" />
                  <span className="sr-only">{t('common.delete')}</span>
                </Button>
              </div>
            )
          }
          // For non-BOGO, show dropdown menu with edit and delete
          return (
            <div className="flex items-center justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <IconDotsVertical className="h-4 w-4" />
                    <span className="sr-only">{t('common.openMenu')}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit(item)}>
                    {t('common.edit')}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onDelete(item.id)}
                    className="text-destructive"
                  >
                    {t('common.delete')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )
        },
        enableHiding: false,
        size: 50,
      },
    ],
    [t, onEdit, onDelete, isBOGO]
  )

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
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
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <Input
          placeholder={t('common.search')}
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          className="w-80"
        />
        {!isBOGO && (
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
                  {[roleFilter !== 'all' ? 1 : 0, searchQuery ? 1 : 0].reduce((a, b) => a + b, 0)}
                </Badge>
              )}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <IconLayoutColumns className="h-4 w-4" />
                  <span className="hidden lg:inline">{t('common.columns')}</span>
                  <IconChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {table
                  .getAllColumns()
                  .filter((column) => column.getCanHide())
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
        )}
      </div>

      {showFilters && !isBOGO && (
        <div className="rounded-lg border bg-muted/50 p-4">
          <div className="flex items-end gap-2 overflow-x-auto pb-2 -mx-4 px-4">
            {/* Role Filter */}
            <div className="space-y-2 min-w-[180px] flex-shrink-0">
              <Label className="text-xs">{t('promotions.items.role')}</Label>
              <Select
                value={roleFilter}
                onValueChange={(value) =>
                  setRoleFilter(value as 'buy' | 'get' | 'target' | 'all')
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('common.all')}</SelectItem>
                  <SelectItem value="buy">{t('promotions.items.roleBuy')}</SelectItem>
                  <SelectItem value="get">{t('promotions.items.roleGet')}</SelectItem>
                  <SelectItem value="target">{t('promotions.items.roleTarget')}</SelectItem>
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

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead
                      key={header.id}
                      style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                      className={cn(
                        header.id === 'actions' && 'sticky right-0 bg-background'
                      )}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  {t('promotions.loading')}
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                >
                  {row.getVisibleCells().map((cell) => {
                    return (
                      <TableCell
                        key={cell.id}
                        className={cn(
                          cell.column.id === 'actions' && 'sticky right-0 bg-background'
                        )}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    )
                  })}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  {t('promotions.items.noAssociations')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <div className="hidden text-sm text-muted-foreground lg:block">
          {t('common.showingResults', {
            from: table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1,
            to: Math.min(
              (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
              filteredData.length
            ),
            total: filteredData.length,
          })}
        </div>
        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          <Button
            variant="outline"
            className="hidden size-8 p-0 lg:flex"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            <span className="sr-only">Go to first page</span>
            <IconChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="size-8"
            size="icon"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <span className="sr-only">Go to previous page</span>
            <IconChevronLeft className="h-4 w-4" />
          </Button>
          <div className="hidden items-center gap-1 text-sm lg:flex">
            <span>{t('common.page')}</span>
            <strong>
              {table.getState().pagination.pageIndex + 1} {t('common.of')}{' '}
              {table.getPageCount()}
            </strong>
          </div>
          <Button
            variant="outline"
            className="size-8"
            size="icon"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <span className="sr-only">Go to next page</span>
            <IconChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="hidden size-8 lg:flex"
            size="icon"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
          >
            <span className="sr-only">Go to last page</span>
            <IconChevronsRight className="h-4 w-4" />
          </Button>
          <Select
            value={`${table.getState().pagination.pageSize}`}
            onValueChange={(value) => {
              table.setPageSize(Number(value))
            }}
          >
            <SelectTrigger className="hidden h-8 w-[70px] lg:flex">
              <SelectValue placeholder={table.getState().pagination.pageSize} />
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
      </div>
    </div>
  )
}

