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
  IconEye,
  IconEyeOff,
  IconFilter,
  IconX,
  IconChevronUp,
  IconGripVertical,
} from '@tabler/icons-react'
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
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
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
import { type MenuItemWithCategory } from '@/lib/api/menu-items'
import { type MenuCategory } from '@/lib/api/menu-categories'
import { useIsMobile } from '@/hooks/use-mobile'
import { cn } from '@/lib/utils'

interface TagsDisplayProps {
  tags: string[]
}

function TagsDisplay({ tags }: TagsDisplayProps) {
  const [maxVisible, setMaxVisible] = React.useState(2) // Default to medium
  
  React.useEffect(() => {
    const updateMaxVisible = () => {
      const width = window.innerWidth
      if (width >= 1024) {
        setMaxVisible(3) // Large screens: 3 tags
      } else if (width >= 768) {
        setMaxVisible(2) // Medium screens: 2 tags
      } else {
        setMaxVisible(0) // Mobile: 0 tags (handled below)
      }
    }
    
    updateMaxVisible()
    window.addEventListener('resize', updateMaxVisible)
    return () => window.removeEventListener('resize', updateMaxVisible)
  }, [])
  
  const visibleTags = tags.slice(0, maxVisible)
  const hiddenTags = tags.slice(maxVisible)
  const hiddenCount = tags.length - maxVisible
  const { t } = useTranslation()
  const [open, setOpen] = React.useState(false)
  const isMobile = useIsMobile()

  // If there's only one tag, always show it directly
  if (tags.length === 1) {
    return (
      <div className="flex flex-wrap gap-1">
        <Badge key={tags[0]} variant="secondary" className="text-xs">
          {tags[0]}
        </Badge>
      </div>
    )
  }

  // On mobile (< 768px): if >=2 tags, show "+n more" (don't show any tags)
  // On medium/large screens: show visible tags with "+n more" if needed
  const shouldShowOnlyCount = isMobile && tags.length >= 2

  if (shouldShowOnlyCount) {
    // Mobile: just show "+n more" button with all tags in dropdown
    return (
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center rounded-md border border-input bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground transition-colors hover:bg-secondary/80 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer"
          >
            +{tags.length} {t('menu.items.more')}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64 p-3">
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground mb-2">
              {t('menu.items.allTags')}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  if (hiddenCount <= 0) {
    // No hidden tags, show all
    return (
      <div className="flex flex-wrap gap-1">
        {tags.map((tag) => (
          <Badge key={tag} variant="secondary" className="text-xs">
            {tag}
          </Badge>
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-1">
      {/* Visible tags */}
      {visibleTags.map((tag) => (
        <Badge key={tag} variant="secondary" className="text-xs">
          {tag}
        </Badge>
      ))}
      
      {/* "+n more" button */}
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center rounded-md border border-input bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground transition-colors hover:bg-secondary/80 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer"
          >
            +{hiddenCount} {t('menu.items.more')}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64 p-3">
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground mb-2">
              {t('menu.items.moreTags', { count: hiddenCount })}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {hiddenTags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

interface MenuItemTableProps {
  data: MenuItemWithCategory[]
  categories: MenuCategory[]
  onEdit: (item: MenuItemWithCategory) => void
  onDelete: (item: MenuItemWithCategory) => void
  onToggleVisibility: (item: MenuItemWithCategory) => void
  onReorder?: (categoryId: string, items: MenuItemWithCategory[]) => void
  isLoading?: boolean
  selectedCategoryId?: string
  onCategoryFilterChange?: (categoryId: string | undefined) => void
  selectedTags?: string[]
  onTagsFilterChange?: (tags: string[]) => void
  selectedVisibility?: 'all' | 'visible' | 'hidden'
  onVisibilityFilterChange?: (visibility: 'all' | 'visible' | 'hidden') => void
  availableTags?: string[]
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
      className="text-muted-foreground size-7 hover:bg-transparent cursor-grab active:cursor-grabbing"
    >
      <IconGripVertical className="text-muted-foreground size-3" />
      <span className="sr-only">Drag to reorder</span>
    </Button>
  )
}

export function MenuItemTable({
  data,
  categories,
  onEdit,
  onDelete,
  onToggleVisibility,
  onReorder,
  isLoading = false,
  selectedCategoryId,
  onCategoryFilterChange,
  selectedTags = [],
  onTagsFilterChange,
  selectedVisibility = 'all',
  onVisibilityFilterChange,
  availableTags = [],
}: MenuItemTableProps) {
  const { t } = useTranslation()
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  })
  const [showFilters, setShowFilters] = React.useState(false)
  const [expandedDescriptions, setExpandedDescriptions] = React.useState<Set<string>>(new Set())
  const [localData, setLocalData] = React.useState(data)

  React.useEffect(() => {
    setLocalData(data)
  }, [data])

  // Group items by category
  const groupedData = React.useMemo(() => {
    const groups: Record<string, MenuItemWithCategory[]> = {}
    localData.forEach((item) => {
      const categoryId = item.category_id
      if (!groups[categoryId]) {
        groups[categoryId] = []
      }
      groups[categoryId].push(item)
    })
    // Sort items within each category by position
    Object.keys(groups).forEach((categoryId) => {
      groups[categoryId].sort((a, b) => a.position - b.position)
    })
    return groups
  }, [localData])

  // Get sorted category IDs based on category order
  const sortedCategoryIds = React.useMemo(() => {
    const categoryMap = new Map(categories.map((c) => [c.id, c.position]))
    return Object.keys(groupedData).sort((a, b) => {
      const posA = categoryMap.get(a) ?? Infinity
      const posB = categoryMap.get(b) ?? Infinity
      return posA - posB
    })
  }, [groupedData, categories])

  const sortableId = React.useId()
  const sensors = useSensors(
    useSensor(MouseSensor, {}),
    useSensor(TouchSensor, {}),
    useSensor(KeyboardSensor, {})
  )

  const columns: ColumnDef<MenuItemWithCategory>[] = React.useMemo(
    () => [
      {
        id: 'drag',
        header: () => null,
        cell: ({ row }) => <DragHandle id={row.original.id} />,
        enableHiding: false,
        size: 40,
      },
      {
        accessorKey: 'name',
        header: t('menu.items.name'),
        cell: ({ row }) => {
          const item = row.original
          const isDescriptionOpen = expandedDescriptions.has(item.id)
          
          // Parse image_url - could be JSON array string or single URL string
          const getImageUrl = (imageUrl: string | null): string | null => {
            if (!imageUrl) return null
            try {
              const parsed = JSON.parse(imageUrl)
              // If it's an array, return the first image
              if (Array.isArray(parsed) && parsed.length > 0) {
                return parsed[0]
              }
              // If it's already a string URL, return it
              return typeof parsed === 'string' ? parsed : imageUrl
            } catch {
              // Not JSON, treat as single URL string
              return imageUrl
            }
          }
          
          const displayImageUrl = getImageUrl(item.image_url)
          
          return (
            <div className="flex items-center gap-3 min-w-0">
              {displayImageUrl && (
                <img
                  src={displayImageUrl}
                  alt={item.name}
                  className="h-10 w-10 rounded object-cover shrink-0"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
              )}
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="font-medium truncate">{item.name}</span>
                {item.description && (
                  <DropdownMenu
                    open={isDescriptionOpen}
                    onOpenChange={(open) => {
                      if (open) {
                        setExpandedDescriptions((prev) => new Set([...prev, item.id]))
                      } else {
                        setExpandedDescriptions((prev) => {
                          const next = new Set(prev)
                          next.delete(item.id)
                          return next
                        })
                      }
                    }}
                  >
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            className="inline-flex items-center justify-center size-5 rounded hover:bg-muted transition-colors shrink-0"
                            onClick={(e) => {
                              e.stopPropagation()
                            }}
                          >
                            <IconChevronDown 
                              className={cn(
                                "h-3.5 w-3.5 text-muted-foreground transition-transform",
                                isDescriptionOpen && "transform rotate-180"
                              )} 
                            />
                            <span className="sr-only">View description</span>
                          </button>
                        </DropdownMenuTrigger>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{t('menu.items.viewDescription')}</p>
                      </TooltipContent>
                    </Tooltip>
                    <DropdownMenuContent align="start" className="w-64 p-3">
                      <div className="space-y-2">
                        <div className="text-xs font-medium text-muted-foreground mb-2">
                          {t('menu.items.description')}
                        </div>
                        <p className="text-sm leading-relaxed">
                          {item.description}
                        </p>
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          )
        },
        enableHiding: false,
      },
      {
        accessorKey: 'price',
        header: t('menu.items.price'),
        cell: ({ row }) => {
          const price = parseFloat(row.original.price)
          return (
            <div className="font-medium">
              ${price.toFixed(2)}
            </div>
          )
        },
      },
      {
        accessorKey: 'dietary_tags',
        header: t('menu.items.dietaryTags'),
        cell: ({ row }) => {
          const tags = row.original.dietary_tags
          if (!tags || tags.length === 0) return '-'
          
          return (
            <TagsDisplay tags={tags} />
          )
        },
      },
      {
        accessorKey: 'visible',
        header: t('menu.items.visible'),
        cell: ({ row }) => {
          const item = row.original
          return (
            <Badge variant={item.visible ? 'default' : 'secondary'}>
              {item.visible ? (
                <>
                  <IconEye className="mr-1 h-3 w-3" />
                  {t('menu.items.visible')}
                </>
              ) : (
                <>
                  <IconEyeOff className="mr-1 h-3 w-3" />
                  {t('menu.items.hidden')}
                </>
              )}
            </Badge>
          )
        },
      },
      {
        accessorKey: 'updated_at',
        header: t('menu.items.updatedAt'),
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
          const item = row.original
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
                <DropdownMenuItem onClick={() => onEdit(item)}>
                  {t('menu.items.edit')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onToggleVisibility(item)}>
                  {t('menu.items.toggleVisibility')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onDelete(item)}
                  className="text-destructive"
                >
                  {t('menu.items.delete')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )
        },
        enableHiding: false,
        size: 50,
      },
    ],
    [t, onEdit, onDelete, onToggleVisibility, expandedDescriptions, setExpandedDescriptions]
  )

  // Flatten grouped data for table (for filtering/sorting)
  const flatData = React.useMemo(() => {
    return sortedCategoryIds.flatMap((categoryId) => groupedData[categoryId] || [])
  }, [sortedCategoryIds, groupedData])

  const table = useReactTable({
    data: flatData,
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

    // Find which category the dragged item belongs to
    const draggedItem = localData.find((item) => item.id === active.id)
    if (!draggedItem) return

    const categoryId = draggedItem.category_id
    const categoryItems = groupedData[categoryId] || []
    
    // Only allow reordering within the same category
    const overItem = localData.find((item) => item.id === over.id)
    if (!overItem || overItem.category_id !== categoryId) return

    const oldIndex = categoryItems.findIndex((item) => item.id === active.id)
    const newIndex = categoryItems.findIndex((item) => item.id === over.id)
    
    if (oldIndex === -1 || newIndex === -1) return

    const newCategoryItems = arrayMove(categoryItems, oldIndex, newIndex)
    
    // Update local data
    const updatedData = localData.map((item) => {
      if (item.category_id === categoryId) {
        const newIndexInCategory = newCategoryItems.findIndex((i) => i.id === item.id)
        return { ...item, position: newIndexInCategory }
      }
      return item
    })
    setLocalData(updatedData)
    
    // Call onReorder callback
    onReorder(categoryId, newCategoryItems)
  }

  function DraggableRow({ 
    row, 
    isLastRow, 
    categoryId 
  }: { 
    row: Row<MenuItemWithCategory>
    isLastRow: boolean
    categoryId: string
  }) {
    const { transform, transition, setNodeRef, isDragging } = useSortable({
      id: row.original.id,
      disabled: !onReorder,
    })

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
    }

    return (
      <TableRow
        ref={setNodeRef}
        style={style}
        data-state={row.getIsSelected() && 'selected'}
        data-dragging={isDragging}
        className={cn(
          "relative z-0 data-[dragging=true]:z-10 data-[dragging=true]:opacity-80",
          !isLastRow && "border-b border-border/50"
        )}
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

  const hasActiveFilters =
    selectedCategoryId ||
    selectedTags.length > 0 ||
    selectedVisibility !== 'all'

  const clearFilters = () => {
    if (onCategoryFilterChange) onCategoryFilterChange(undefined)
    if (onTagsFilterChange) onTagsFilterChange([])
    if (onVisibilityFilterChange) onVisibilityFilterChange('all')
  }

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between gap-4">
        <Input
          placeholder={t('common.search')}
          value={(table.getColumn('name')?.getFilterValue() as string) ?? ''}
          onChange={(event) => table.getColumn('name')?.setFilterValue(event.target.value)}
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
            <span className="hidden lg:inline">{t('menu.items.filters')}</span>
            {hasActiveFilters && (
              <Badge variant="secondary" className="ml-1 h-5 min-w-5 rounded-full px-1.5 shrink-0">
                {[
                  selectedCategoryId ? 1 : 0,
                  selectedTags.length,
                  selectedVisibility !== 'all' ? 1 : 0,
                ].reduce((a, b) => a + b, 0)}
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

      {showFilters && (
        <div className="rounded-lg border bg-muted/50 p-4">
          {hasActiveFilters && (
            <div className="flex justify-end mb-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-8 text-xs"
              >
                <IconX className="mr-1 h-3 w-3" />
                {t('menu.items.clearFilters')}
              </Button>
            </div>
          )}
          <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4">
            {/* Category Filter */}
            {onCategoryFilterChange && (
              <div className="space-y-2 min-w-[200px] flex-shrink-0">
                <Label className="text-xs">{t('menu.items.category')}</Label>
                <Select
                  value={selectedCategoryId || 'all'}
                  onValueChange={(value) =>
                    onCategoryFilterChange(value === 'all' ? undefined : value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('menu.items.filterByCategory')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('menu.items.allCategories')}</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Dietary Tags Filter */}
            {onTagsFilterChange && availableTags.length > 0 && (
              <div className="space-y-2 min-w-[200px] flex-shrink-0">
                <Label className="text-xs">{t('menu.items.dietaryTags')}</Label>
                <Select
                  value=""
                  onValueChange={(value) => {
                    if (value && !selectedTags.includes(value)) {
                      onTagsFilterChange([...selectedTags, value])
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('menu.items.selectTags')} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTags.map((tag) => (
                      <SelectItem key={tag} value={tag} disabled={selectedTags.includes(tag)}>
                        {tag}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedTags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {selectedTags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="cursor-pointer"
                        onClick={() => {
                          onTagsFilterChange(selectedTags.filter((t) => t !== tag))
                        }}
                      >
                        {tag}
                        <IconX className="ml-1 h-3 w-3" />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Visibility Filter */}
            {onVisibilityFilterChange && (
              <div className="space-y-2 min-w-[200px] flex-shrink-0">
                <Label className="text-xs">{t('menu.items.visibility')}</Label>
                <Select
                  value={selectedVisibility}
                  onValueChange={(value) =>
                    onVisibilityFilterChange(value as 'all' | 'visible' | 'hidden')
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('menu.items.allItems')}</SelectItem>
                    <SelectItem value="visible">{t('menu.items.visibleOnly')}</SelectItem>
                    <SelectItem value="hidden">{t('menu.items.hiddenOnly')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
          modifiers={[restrictToVerticalAxis]}
        >
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
                <TableRow className="border-b">
                  <TableCell colSpan={table.getVisibleLeafColumns().length} className="h-24 text-center">
                    {t('menu.items.loading')}
                  </TableCell>
                </TableRow>
              ) : sortedCategoryIds.length > 0 ? (
                <>
                  {sortedCategoryIds.map((categoryId) => {
                    const categoryItems = groupedData[categoryId] || []
                    const category = categories.find((c) => c.id === categoryId)
                    const categoryName = category?.name || t('menu.items.uncategorized')
                    
                    // Filter items based on table filters
                    const filteredItems = categoryItems.filter((item) => {
                      const row = table.getRowModel().rows.find((r) => r.original.id === item.id)
                      return row !== undefined
                    })

                    if (filteredItems.length === 0) return null

                    const itemIds = filteredItems.map((item) => item.id)
                    
                    return (
                      <React.Fragment key={categoryId}>
                        {/* Category Header */}
                        <TableRow className="bg-muted/30 hover:bg-muted/30">
                          <TableCell 
                            colSpan={table.getVisibleLeafColumns().length} 
                            className="font-semibold text-sm py-3"
                          >
                            <div className="flex items-center gap-2 pl-4">
                              {categoryName}
                              <Badge variant="secondary" className="text-xs font-normal">
                                {filteredItems.length}
                              </Badge>
                            </div>
                          </TableCell>
                        </TableRow>
                        {/* Category Items */}
                        <SortableContext
                          items={itemIds}
                          strategy={verticalListSortingStrategy}
                        >
                          {filteredItems.map((item, itemIndex) => {
                            const row = table.getRowModel().rows.find((r) => r.original.id === item.id)
                            if (!row) return null
                            const isLastRow = itemIndex === filteredItems.length - 1
                            return (
                              <DraggableRow
                                key={item.id}
                                row={row}
                                isLastRow={isLastRow}
                                categoryId={categoryId}
                              />
                            )
                          })}
                        </SortableContext>
                      </React.Fragment>
                    )
                  })}
                </>
              ) : (
                <TableRow className="border-b">
                  <TableCell colSpan={table.getVisibleLeafColumns().length} className="h-24 text-center">
                    {t('common.noResults')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </DndContext>
      </div>

      <div className="flex items-center justify-between px-4">
        <div className="flex w-full items-center gap-8 lg:w-fit lg:ml-auto">
          <div className="hidden items-center gap-2 lg:flex">
            <Label htmlFor="rows-per-page" className="text-sm font-medium">
              Rows per page
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
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
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

