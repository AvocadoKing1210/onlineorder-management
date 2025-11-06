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
  IconX,
  IconCheck,
  IconFilter,
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
import { type ModifierOption } from '@/lib/api/menu-modifier-options'
import { type ModifierGroup } from '@/lib/api/menu-modifier-groups'
import { useIsMobile } from '@/hooks/use-mobile'
import { cn } from '@/lib/utils'

interface ModifierOptionTableProps {
  data: ModifierOption[]
  groups: ModifierGroup[]
  onEdit: (option: ModifierOption) => void
  onDelete: (option: ModifierOption) => void
  onToggleVisibility: (option: ModifierOption) => void
  onToggleAvailable: (option: ModifierOption) => void
  onReorder?: (groupId: string, options: ModifierOption[]) => void
  onEditGroup?: (group: ModifierGroup) => void
  onDeleteGroup?: (group: ModifierGroup) => void
  isLoading?: boolean
  selectedGroupId?: string
  onGroupFilterChange?: (groupId: string | undefined) => void
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

function PriceDeltaDisplay({ priceDelta }: { priceDelta: number }) {
  const { t } = useTranslation()
  
  if (priceDelta === 0) {
    return (
      <Badge variant="secondary" className="text-xs font-normal">
        $0.00
      </Badge>
    )
  }
  
  const isPositive = priceDelta > 0
  const formatted = `$${Math.abs(priceDelta).toFixed(2)}`
  
  return (
    <Badge 
      variant={isPositive ? "default" : "destructive"} 
      className="text-xs font-normal"
    >
      {isPositive ? '+' : '-'}{formatted}
    </Badge>
  )
}

export function ModifierOptionTable({
  data,
  groups,
  onEdit,
  onDelete,
  onToggleVisibility,
  onToggleAvailable,
  onReorder,
  onEditGroup,
  onDeleteGroup,
  isLoading = false,
  selectedGroupId,
  onGroupFilterChange,
}: ModifierOptionTableProps) {
  const { t } = useTranslation()
  const isMobile = useIsMobile()
  const [localData, setLocalData] = React.useState(data)
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  })
  const [showFilters, setShowFilters] = React.useState(false)

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

  // Group data by modifier_group_id
  const groupedData = React.useMemo(() => {
    const grouped: Record<string, ModifierOption[]> = {}
    localData.forEach((option) => {
      const groupId = option.modifier_group_id
      if (!grouped[groupId]) {
        grouped[groupId] = []
      }
      grouped[groupId].push(option)
    })
    return grouped
  }, [localData])

  // Get sorted group IDs - include all groups, even those without options
  const sortedGroupIds = React.useMemo(() => {
    // Get all group IDs from the groups array, not just from groupedData
    const allGroupIds = groups.map((g) => g.id)
    return allGroupIds.sort((a, b) => {
      const groupA = groups.find((g) => g.id === a)
      const groupB = groups.find((g) => g.id === b)
      return (groupA?.position ?? 0) - (groupB?.position ?? 0)
    })
  }, [groups])

  // Filter data by selected group if filter is active
  const filteredData = React.useMemo(() => {
    if (selectedGroupId) {
      return groupedData[selectedGroupId] || []
    }
    return localData
  }, [localData, selectedGroupId, groupedData])

  const columns: ColumnDef<ModifierOption>[] = React.useMemo(
    () => [
      {
        id: 'drag',
        header: () => null,
        cell: ({ row }) => onReorder ? <DragHandle id={row.original.id} /> : null,
        enableHiding: false,
        size: 50,
      },
      {
        accessorKey: 'name',
        header: t('menu.modifiers.options.name'),
        cell: ({ row }) => {
          const option = row.original
          return (
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="font-medium truncate">{option.name}</span>
              </div>
            </div>
          )
        },
        enableHiding: false,
      },
      {
        id: 'modifier_group',
        header: t('menu.modifiers.options.groupHeader'),
        cell: ({ row }) => {
          const group = row.original.modifier_group
          return group ? (
            <Badge variant="secondary" className="text-xs font-normal">
              {group.name}
            </Badge>
          ) : (
            <span className="text-muted-foreground text-sm">-</span>
          )
        },
        // Hide group column when filtering by a specific group
        ...(selectedGroupId ? { enableHiding: true } : {}),
      },
      {
        accessorKey: 'price_delta',
        header: t('menu.modifiers.options.adjustmentHeader'),
        cell: ({ row }) => {
          const option = row.original
          return <PriceDeltaDisplay priceDelta={option.price_delta} />
        },
      },
      {
        accessorKey: 'visible',
        header: t('menu.modifiers.options.visible'),
        cell: ({ row }) => {
          const option = row.original
          return (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => onToggleVisibility(option)}
                  className="flex items-center justify-center p-1 rounded hover:bg-muted transition-colors"
                  aria-label={option.visible ? t('menu.modifiers.options.visible') : t('menu.modifiers.options.hidden')}
                >
                  {option.visible ? (
                    <IconEye className="h-4 w-4 text-foreground" />
                  ) : (
                    <IconEyeOff className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{option.visible ? t('menu.modifiers.options.visible') : t('menu.modifiers.options.hidden')}</p>
                <p className="text-xs opacity-80">{t('menu.modifiers.options.visibleDescription')}</p>
              </TooltipContent>
            </Tooltip>
          )
        },
      },
      {
        accessorKey: 'available',
        header: t('menu.modifiers.options.available'),
        cell: ({ row }) => {
          const option = row.original
          return (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => onToggleAvailable(option)}
                  className="flex items-center justify-center p-1 rounded hover:bg-muted transition-colors"
                  aria-label={option.available ? t('menu.modifiers.options.available') : t('menu.modifiers.options.unavailable')}
                >
                  {option.available ? (
                    <IconCheck className="h-4 w-4 text-green-600 dark:text-green-400" />
                  ) : (
                    <IconX className="h-4 w-4 text-red-600 dark:text-red-400" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{option.available ? t('menu.modifiers.options.available') : t('menu.modifiers.options.unavailable')}</p>
                <p className="text-xs opacity-80">{t('menu.modifiers.options.availableDescription')}</p>
              </TooltipContent>
            </Tooltip>
          )
        },
      },
      {
        accessorKey: 'updated_at',
        header: t('menu.modifiers.options.updatedAt'),
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
        header: () => null,
        cell: ({ row }) => {
          const option = row.original
          return (
            <div className="flex justify-end">
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
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => onEdit(option)}>
                    {t('menu.modifiers.options.edit')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onToggleVisibility(option)}>
                    {t('menu.modifiers.options.toggleVisibility')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onToggleAvailable(option)}>
                    {t('menu.modifiers.options.toggleAvailable')}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onDelete(option)}
                    className="text-destructive"
                  >
                    {t('menu.modifiers.options.delete')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )
        },
        enableHiding: false,
        enableSorting: false,
        enableColumnFilter: false,
        size: 50,
        minSize: 50,
        maxSize: 50,
      },
    ],
    [t, onEdit, onDelete, onToggleVisibility, onToggleAvailable]
  )

  // Flatten grouped data for table (for filtering/sorting)
  const flatData = React.useMemo(() => {
    return sortedGroupIds.flatMap((groupId) => groupedData[groupId] || [])
  }, [sortedGroupIds, groupedData])

  // Hide group column when filtering by a specific group
  React.useEffect(() => {
    if (selectedGroupId) {
      setColumnVisibility((prev) => ({ ...prev, modifier_group: false }))
    } else {
      setColumnVisibility((prev) => {
        const { modifier_group, ...rest } = prev
        return rest
      })
    }
  }, [selectedGroupId])

  const table = useReactTable({
    data: selectedGroupId ? filteredData : flatData,
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
    if (!active || !over || active.id === over.id || !onReorder) return

    // Find which group the dragged option belongs to
    const draggedOption = localData.find((option) => option.id === active.id)
    if (!draggedOption) return

    const groupId = draggedOption.modifier_group_id
    const groupOptions = groupedData[groupId] || []
    
    // Only allow reordering within the same group
    const overOption = localData.find((option) => option.id === over.id)
    if (!overOption || overOption.modifier_group_id !== groupId) return

    const oldIndex = groupOptions.findIndex((option) => option.id === active.id)
    const newIndex = groupOptions.findIndex((option) => option.id === over.id)
    
    if (oldIndex === -1 || newIndex === -1) return

    const newGroupOptions = arrayMove(groupOptions, oldIndex, newIndex)
    
    // Update local data
    const updatedData = localData.map((option) => {
      if (option.modifier_group_id === groupId) {
        const newIndexInGroup = newGroupOptions.findIndex((o) => o.id === option.id)
        return { ...option, position: newIndexInGroup }
      }
      return option
    })
    setLocalData(updatedData)
    
    // Call onReorder callback
    onReorder(groupId, newGroupOptions)
  }

  function DraggableRow({ 
    row, 
    isLastRow, 
    groupId 
  }: { 
    row: Row<ModifierOption>
    isLastRow: boolean
    groupId: string
  }) {
    const { transform, transition, setNodeRef, isDragging } = useSortable({
      id: row.original.id,
      disabled: !onReorder,
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
        {row.getVisibleCells().map((cell, cellIndex) => {
          const isActionsColumn = cell.column.id === 'actions'
          const isLastCell = cellIndex === row.getVisibleCells().length - 1
          return (
            <TableCell 
              key={cell.id} 
              className={cn(
                "relative",
                !isLastCell && "pr-0",
                isActionsColumn && "text-right sticky right-0 bg-background z-10 border-l border-border/50"
              )}
            >
              <div className={cn(
                "flex items-center h-full",
                isActionsColumn && "justify-end"
              )}>
                {isActionsColumn ? (
                  flexRender(cell.column.columnDef.cell, cell.getContext())
                ) : (
                  <>
                    <div className="flex-1">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
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
  }

  // Get options for rendering (grouped if no filter, or filtered group)
  const renderData = React.useMemo(() => {
    if (selectedGroupId) {
      return groupedData[selectedGroupId] || []
    }
    return flatData
  }, [selectedGroupId, groupedData, flatData])

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between">
        <Input
          placeholder={t('common.search')}
          value={(table.getColumn('name')?.getFilterValue() as string) ?? ''}
          onChange={(event) => table.getColumn('name')?.setFilterValue(event.target.value)}
          className="w-48"
        />
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <IconFilter className="h-4 w-4 shrink-0" />
            <span className="hidden lg:inline">{t('menu.modifiers.options.filters')}</span>
            {selectedGroupId && (
              <Badge variant="secondary" className="ml-1 h-5 min-w-5 rounded-full px-1.5 shrink-0">
                1
              </Badge>
            )}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <IconLayoutColumns className="h-4 w-4 shrink-0" />
                <span className="hidden lg:inline">Columns</span>
                <IconChevronDown className="h-4 w-4 shrink-0 opacity-50" />
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

      {showFilters && onGroupFilterChange && (
        <div className="rounded-lg border bg-muted/50 p-4">
          <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4">
            {/* Group Filter */}
            <div className="space-y-2 min-w-[200px] flex-shrink-0">
              <Label className="text-xs">{t('menu.modifiers.options.group')}</Label>
              <Select
                value={selectedGroupId || 'all'}
                onValueChange={(value) =>
                  onGroupFilterChange(value === 'all' ? undefined : value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('menu.modifiers.options.filterByGroup')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('menu.modifiers.options.allGroups')}</SelectItem>
                  {groups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        modifiers={[restrictToVerticalAxis]}
      >
        <div className="overflow-x-auto rounded-lg border">
          <Table className="w-full min-w-full">
            <TableHeader className="bg-muted sticky top-0 z-10">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const isActionsColumn = header.column.id === 'actions'
                    return (
                      <TableHead
                        key={header.id}
                        colSpan={header.colSpan}
                        style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                        className={cn(
                          isActionsColumn && "sticky right-0 bg-background z-10 border-l border-border/50"
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
                  <TableCell colSpan={table.getVisibleLeafColumns().length} className="h-24 text-center border-b border-border/50">
                    {t('menu.modifiers.options.loading')}
                  </TableCell>
                </TableRow>
              ) : selectedGroupId ? (
                // Render filtered group (no grouping headers)
                renderData.length > 0 ? (
                  <SortableContext items={renderData.map((o) => o.id)} strategy={verticalListSortingStrategy}>
                    {renderData.map((option, index) => {
                      const row = table.getRowModel().rows.find((r) => r.original.id === option.id)
                      if (!row) return null
                      return (
                        <DraggableRow
                          key={option.id}
                          row={row}
                          isLastRow={index === renderData.length - 1}
                          groupId={selectedGroupId}
                        />
                      )
                    })}
                  </SortableContext>
                ) : (
                  <TableRow>
                    <TableCell colSpan={table.getVisibleLeafColumns().length} className="h-24 text-center border-b border-border/50">
                      {t('menu.modifiers.options.noOptions')}
                    </TableCell>
                  </TableRow>
                )
              ) : (
                // Render grouped by modifier group
                sortedGroupIds.length > 0 ? (
                  sortedGroupIds.map((groupId) => {
                    const groupOptions = groupedData[groupId] || []
                    const group = groups.find((g) => g.id === groupId)
                    const groupName = group?.name || t('menu.modifiers.options.uncategorized')
                    const filteredGroupOptions = groupOptions.filter((option) => {
                      const nameFilter = table.getColumn('name')?.getFilterValue() as string
                      if (!nameFilter) return true
                      return option.name.toLowerCase().includes(nameFilter.toLowerCase())
                    })

                    // Show group even if it has no options (after filtering)
                    // Only hide if there's a search filter and no options match
                    const nameFilter = table.getColumn('name')?.getFilterValue() as string
                    if (nameFilter && filteredGroupOptions.length === 0) return null

                    return (
                      <React.Fragment key={groupId}>
                        {/* Group Header */}
                        <TableRow className="bg-muted/30 hover:bg-muted/30">
                          <TableCell 
                            colSpan={table.getVisibleLeafColumns().length - 1} 
                            className="font-semibold text-sm py-3"
                          >
                            <div className="flex items-center gap-2 pl-4">
                              {groupName}
                              <Badge variant="secondary" className="text-xs font-normal">
                                {filteredGroupOptions.length}
                              </Badge>
                            </div>
                          </TableCell>
                          {group && (onEditGroup || onDeleteGroup) && (
                            <TableCell 
                              className="sticky right-0 bg-muted/30 z-10 border-l border-border/50 text-right"
                            >
                              <div className="flex justify-end">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      className="data-[state=open]:bg-muted text-muted-foreground flex size-8"
                                      size="icon"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <IconDotsVertical className="h-4 w-4" />
                                      <span className="sr-only">Open menu</span>
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-48">
                                    {onEditGroup && (
                                      <DropdownMenuItem onClick={() => onEditGroup(group)}>
                                        {t('menu.modifiers.groups.edit')}
                                      </DropdownMenuItem>
                                    )}
                                    {onDeleteGroup && (
                                      <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                          onClick={() => onDeleteGroup(group)}
                                          className="text-destructive"
                                        >
                                          {t('menu.modifiers.groups.delete')}
                                        </DropdownMenuItem>
                                      </>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                        {/* Group Options */}
                        {filteredGroupOptions.length > 0 ? (
                          <SortableContext 
                            items={filteredGroupOptions.map((o) => o.id)} 
                            strategy={verticalListSortingStrategy}
                          >
                            {filteredGroupOptions.map((option, index) => {
                              const row = table.getRowModel().rows.find((r) => r.original.id === option.id)
                              if (!row) return null
                              return (
                                <DraggableRow
                                  key={option.id}
                                  row={row}
                                  isLastRow={index === filteredGroupOptions.length - 1}
                                  groupId={groupId}
                                />
                              )
                            })}
                          </SortableContext>
                        ) : (
                          // Show empty state for groups without options
                          <TableRow>
                            <TableCell colSpan={table.getVisibleLeafColumns().length} className="h-24 text-center border-b border-border/50">
                              <p className="text-sm text-muted-foreground">
                                {t('menu.modifiers.groups.noOptions')}
                              </p>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    )
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={table.getVisibleLeafColumns().length} className="h-24 text-center border-b border-border/50">
                      {t('menu.modifiers.options.noOptions')}
                    </TableCell>
                  </TableRow>
                )
              )}
            </TableBody>
          </Table>
        </div>
      </DndContext>

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
          <div className="flex w-fit items-center justify-center text-sm font-medium">
            {t('common.page')} {table.getState().pagination.pageIndex + 1} {t('common.of')}{' '}
            {table.getPageCount()}
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
              className={cn("size-8", isMobile && "hidden")}
              size="icon"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Go to previous page</span>
              <IconChevronLeft className="h-4 w-4" />
            </Button>
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
          </div>
        </div>
      </div>
    </div>
  )
}

