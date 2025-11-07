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
  type PromotionCategoryWithRelations,
  type PromotionCategoryFilters,
} from '@/lib/api/promotion-categories'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface PromotionCategoryTableProps {
  data: PromotionCategoryWithRelations[]
  promotions: Array<{ id: string; name: string }>
  categories: Array<{ id: string; name: string; visible: boolean }>
  onDelete: (promotionId: string, categoryId: string) => void
  isLoading?: boolean
}

export function PromotionCategoryTable({
  data,
  promotions,
  categories,
  onDelete,
  isLoading = false,
}: PromotionCategoryTableProps) {
  const { t } = useTranslation()
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  })
  const [showFilters, setShowFilters] = React.useState(false)
  const [promotionFilter, setPromotionFilter] = React.useState<string>('all')
  const [categoryFilter, setCategoryFilter] = React.useState<string>('all')

  // Filter data
  const filteredData = React.useMemo(() => {
    let result = data

    if (promotionFilter !== 'all') {
      result = result.filter((item) => item.promotion_id === promotionFilter)
    }

    if (categoryFilter !== 'all') {
      result = result.filter((item) => item.category_id === categoryFilter)
    }

    return result
  }, [data, promotionFilter, categoryFilter])

  const hasActiveFilters = promotionFilter !== 'all' || categoryFilter !== 'all'

  const clearFilters = () => {
    setPromotionFilter('all')
    setCategoryFilter('all')
  }

  const columns: ColumnDef<PromotionCategoryWithRelations>[] = React.useMemo(
    () => [
      {
        accessorKey: 'promotion',
        header: t('promotions.categoryAssociations.promotion'),
        cell: ({ row }) => {
          const promotion = row.original.promotion
          if (!promotion) return <span className="text-muted-foreground">—</span>
          return (
            <div className="flex items-center gap-2">
              <Link
                href={`/promotions?promotion=${promotion.id}`}
                className="font-medium hover:underline flex items-center gap-1"
              >
                {promotion.name}
                <IconExternalLink className="h-3 w-3" />
              </Link>
              {promotion.type && (
                <Badge variant="outline" className="text-xs">
                  {promotion.type === 'bogo'
                    ? t('promotions.fields.typeBogo')
                    : promotion.type === 'percent_off'
                      ? t('promotions.fields.typePercentOff')
                      : t('promotions.fields.typeAmountOff')}
                </Badge>
              )}
            </div>
          )
        },
        enableHiding: false,
      },
      {
        accessorKey: 'category',
        header: t('promotions.categoryAssociations.category'),
        cell: ({ row }) => {
          const category = row.original.category
          if (!category) return <span className="text-muted-foreground">—</span>
          return (
            <div className="flex items-center gap-2">
              <Link
                href={`/menu/categories?category=${category.id}`}
                className="font-medium hover:underline flex items-center gap-1"
              >
                {category.name}
                <IconExternalLink className="h-3 w-3" />
              </Link>
              {!category.visible && (
                <Badge variant="secondary" className="text-xs">
                  {t('common.hidden')}
                </Badge>
              )}
            </div>
          )
        },
      },
      {
        accessorKey: 'created_at',
        header: t('common.createdAt'),
        cell: ({ row }) => {
          const date = new Date(row.original.created_at)
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
                  <DropdownMenuItem
                    onClick={() => onDelete(item.promotion_id, item.category_id)}
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
    [t, onDelete]
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
          value={(table.getColumn('promotion')?.getFilterValue() as string) ?? ''}
          onChange={(event) =>
            table.getColumn('promotion')?.setFilterValue(event.target.value)
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
                {[promotionFilter !== 'all' ? 1 : 0, categoryFilter !== 'all' ? 1 : 0].reduce(
                  (a, b) => a + b,
                  0
                )}
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
      </div>

      {showFilters && (
        <div className="rounded-lg border bg-muted/50 p-4">
          <div className="flex items-end gap-2 overflow-x-auto pb-2 -mx-4 px-4">
            {/* Promotion Filter */}
            <div className="space-y-2 min-w-[180px] flex-shrink-0">
              <Label className="text-xs">{t('promotions.categoryAssociations.promotion')}</Label>
              <Select
                value={promotionFilter}
                onValueChange={setPromotionFilter}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('common.all')}</SelectItem>
                  {promotions.map((promotion) => (
                    <SelectItem key={promotion.id} value={promotion.id}>
                      {promotion.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Category Filter */}
            <div className="space-y-2 min-w-[180px] flex-shrink-0">
              <Label className="text-xs">{t('promotions.categoryAssociations.category')}</Label>
              <Select
                value={categoryFilter}
                onValueChange={setCategoryFilter}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('common.all')}</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
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
                  className={cn(
                    row.original.promotion_id && 'hover:bg-muted/50'
                  )}
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
                  {t('promotions.categoryAssociations.noAssociations')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {t('common.showingResults', {
            from: table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1,
            to: Math.min(
              (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
              filteredData.length
            ),
            total: filteredData.length,
          })}
        </div>
        <div className="flex items-center gap-2">
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
          <div className="flex items-center gap-1 text-sm">
            <span>{t('common.page')}</span>
            <strong>
              {table.getState().pagination.pageIndex + 1} {t('common.of')}{' '}
              {table.getPageCount()}
            </strong>
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
          <Select
            value={`${table.getState().pagination.pageSize}`}
            onValueChange={(value) => {
              table.setPageSize(Number(value))
            }}
          >
            <SelectTrigger className="h-8 w-[70px]">
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

