'use client'

import * as React from 'react'
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type UniqueIdentifier,
} from '@dnd-kit/core'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
  IconDotsVertical,
  IconGripVertical,
  IconLayoutColumns,
  IconEye,
  IconEyeOff,
} from '@tabler/icons-react'
import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  Row,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useTranslation } from '@/components/i18n-text'
import { type ModifierGroup } from '@/lib/api/menu-modifier-groups'
import { cn } from '@/lib/utils'

interface ModifierGroupTableProps {
  data: ModifierGroup[]
  onEdit: (group: ModifierGroup) => void
  onDelete: (group: ModifierGroup) => void
  onToggleVisibility: (group: ModifierGroup) => void
  onReorder: (groups: ModifierGroup[]) => void
  isLoading?: boolean
}

function DragHandle({ id }: { id: string }) {
  const { attributes, listeners } = useSortable({
    id,
  })

  return (
    <Button
      {...attributes}
      {...listeners}
      variant="ghost"
      size="icon"
      className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
    >
      <IconGripVertical className="h-4 w-4" />
      <span className="sr-only">Drag to reorder</span>
    </Button>
  )
}

function SelectionRulesDisplay({ group }: { group: ModifierGroup }) {
  const { t } = useTranslation()
  
  const minSelect = group.min_select
  const maxSelect = group.max_select
  const required = group.required
  
  let ruleText = ''
  if (minSelect === maxSelect) {
    ruleText = minSelect === 1 
      ? t('menu.modifiers.groups.selectExactlyOne')
      : t('menu.modifiers.groups.selectExactly', { count: minSelect })
  } else if (minSelect === 0) {
    ruleText = t('menu.modifiers.groups.selectUpTo', { count: maxSelect })
  } else {
    ruleText = t('menu.modifiers.groups.selectRange', { min: minSelect, max: maxSelect })
  }
  
  return (
    <div className="flex items-center gap-2">
      <Badge variant="secondary" className="text-xs font-normal">
        {ruleText}
      </Badge>
      {required && (
        <Badge variant="outline" className="text-xs">
          {t('menu.modifiers.groups.required')}
        </Badge>
      )}
    </div>
  )
}

export function ModifierGroupTable({
  data,
  onEdit,
  onDelete,
  onToggleVisibility,
  onReorder,
  isLoading = false,
}: ModifierGroupTableProps) {
  const { t } = useTranslation()
  const [localData, setLocalData] = React.useState(data)
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  })

  React.useEffect(() => {
    setLocalData(data)
  }, [data])

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 6,
      },
    }),
    useSensor(KeyboardSensor)
  )

  const dataIds = React.useMemo(() => localData.map((item) => item.id), [localData])

  const columns: ColumnDef<ModifierGroup>[] = React.useMemo(
    () => [
      {
        id: 'drag',
        header: () => null,
        cell: ({ row }) => <DragHandle id={row.original.id} />,
        enableHiding: false,
        size: 50,
      },
      {
        accessorKey: 'name',
        header: t('menu.modifiers.groups.name'),
        cell: ({ row }) => {
          const group = row.original
          return (
            <div className="flex items-center gap-2">
              <span className="font-medium">{group.name}</span>
            </div>
          )
        },
      },
      {
        id: 'selection_rules',
        header: t('menu.modifiers.groups.selectionRules'),
        cell: ({ row }) => {
          const group = row.original
          return <SelectionRulesDisplay group={group} />
        },
      },
      {
        id: 'option_count',
        header: t('menu.modifiers.groups.options'),
        cell: ({ row }) => {
          const count = row.original.option_count ?? 0
          return (
            <Badge variant="secondary" className="text-xs font-normal">
              {count === 1 
                ? t('menu.modifiers.groups.optionCount', { count })
                : t('menu.modifiers.groups.optionCountPlural', { count })
              }
            </Badge>
          )
        },
      },
      {
        accessorKey: 'visible',
        header: t('menu.modifiers.groups.visible'),
        cell: ({ row }) => {
          const group = row.original
          return (
            <Badge variant={group.visible ? 'default' : 'secondary'}>
              {group.visible ? (
                <>
                  <IconEye className="mr-1 h-3 w-3" />
                  {t('menu.modifiers.groups.visible')}
                </>
              ) : (
                <>
                  <IconEyeOff className="mr-1 h-3 w-3" />
                  {t('menu.modifiers.groups.hidden')}
                </>
              )}
            </Badge>
          )
        },
      },
      {
        accessorKey: 'updated_at',
        header: t('menu.modifiers.groups.updatedAt'),
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
          const group = row.original
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
                <DropdownMenuItem onClick={() => onEdit(group)}>
                  {t('menu.modifiers.groups.edit')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onToggleVisibility(group)}>
                  {t('menu.modifiers.groups.toggleVisibility')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onDelete(group)}
                  className="text-destructive"
                >
                  {t('menu.modifiers.groups.delete')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )
        },
        enableHiding: false,
        size: 50,
      },
    ],
    [t, onEdit, onDelete, onToggleVisibility]
  )

  const table = useReactTable({
    data: localData,
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

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (active && over && active.id !== over.id) {
      const oldIndex = dataIds.indexOf(active.id as string)
      const newIndex = dataIds.indexOf(over.id as string)
      const newData = arrayMove(localData, oldIndex, newIndex)
      setLocalData(newData)

      // Update positions and call onReorder
      const reordered = newData.map((group, index) => ({
        ...group,
        position: index,
      }))
      onReorder(reordered)
    }
  }

  function DraggableRow({ row, isLastRow }: { row: Row<ModifierGroup>; isLastRow: boolean }) {
    const { transform, transition, setNodeRef, isDragging } = useSortable({
      id: row.original.id,
    })

    return (
      <TableRow
        data-state={row.getIsSelected() && 'selected'}
        data-dragging={isDragging}
        ref={setNodeRef}
        className={cn(
          "relative z-0 data-[dragging=true]:z-10 data-[dragging=true]:opacity-80",
          !isLastRow && "border-b border-border/50"
        )}
        style={{
          transform: CSS.Transform.toString(transform),
          transition: transition,
        }}
      >
        {row.getVisibleCells().map((cell, cellIndex) => (
          <TableCell 
            key={cell.id} 
            className={cn(
              "relative",
              cellIndex < row.getVisibleCells().length - 1 && "pr-0"
            )}
          >
            <div className="flex items-center h-full">
              <div className="flex-1">
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </div>
              {cellIndex < row.getVisibleCells().length - 1 && (
                <div className="h-6 w-[1px] bg-border/60 mx-3 shrink-0 my-2" />
              )}
            </div>
          </TableCell>
        ))}
      </TableRow>
    )
  }

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between">
        <Input
          placeholder={t('common.search')}
          value={(table.getColumn('name')?.getFilterValue() as string) ?? ''}
          onChange={(event) => table.getColumn('name')?.setFilterValue(event.target.value)}
          className="max-w-sm"
        />
        <div className="flex items-center gap-2">
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

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        modifiers={[restrictToVerticalAxis]}
      >
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} className="h-12">
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    {t('menu.modifiers.groups.loading')}
                  </TableCell>
                </TableRow>
              ) : table.getRowModel().rows?.length ? (
                <SortableContext items={dataIds} strategy={verticalListSortingStrategy}>
                  {table.getRowModel().rows.map((row, index) => (
                    <DraggableRow
                      key={row.id}
                      row={row}
                      isLastRow={index === table.getRowModel().rows.length - 1}
                    />
                  ))}
                </SortableContext>
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center border-b border-border/50">
                    {t('menu.modifiers.groups.noGroups')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </DndContext>

      <div className="flex items-center justify-between px-2">
        <div className="flex-1 text-sm text-muted-foreground">
          {table.getFilteredRowModel().rows.length} {t('common.row')}
          {table.getFilteredRowModel().rows.length !== 1 ? 's' : ''}
        </div>
        <div className="flex items-center space-x-6 lg:space-x-8">
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium">{t('common.rowsPerPage')}</p>
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
          <div className="flex w-[100px] items-center justify-center text-sm font-medium">
            {t('common.page')} {table.getState().pagination.pageIndex + 1} {t('common.of')}{' '}
            {table.getPageCount()}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Go to first page</span>
              <IconChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Go to previous page</span>
              <IconChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Go to next page</span>
              <IconChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Go to last page</span>
              <IconChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

