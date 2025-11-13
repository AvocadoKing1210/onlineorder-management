'use client'

import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { IconPlus, IconUpload } from '@tabler/icons-react'
import { useTranslation } from '@/components/i18n-text'
import { toast } from 'sonner'
import { MenuItemDialog } from '@/components/menu/menu-item-dialog'
import { MenuBulkImportDialog } from '@/components/menu/menu-bulk-import-dialog'
import { MenuItemTable } from '@/components/menu/menu-item-table'
import {
  getMenuItems,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  reorderItems,
  type MenuItemWithCategory,
  type CreateMenuItemData,
  type UpdateMenuItemData,
} from '@/lib/api/menu-items'
import {
  getMenuCategories,
  type MenuCategory,
} from '@/lib/api/menu-categories'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

export default function MenuItemsPage() {
  const { t } = useTranslation()
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<MenuItemWithCategory | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<MenuItemWithCategory | null>(null)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>(undefined)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [selectedVisibility, setSelectedVisibility] = useState<'all' | 'visible' | 'hidden'>('all')
  const [allItems, setAllItems] = useState<MenuItemWithCategory[]>([])
  const [bulkImportOpen, setBulkImportOpen] = useState(false)

  const loadItems = async () => {
    try {
      setIsLoading(true)
      // If filtering by tags or visibility, load all items
      // Otherwise, respect category filter
      const filters: { category_id?: string } = {}
      if (selectedCategoryId && selectedTags.length === 0 && selectedVisibility === 'all') {
        filters.category_id = selectedCategoryId
      }
      const data = await getMenuItems(filters)
      setAllItems(data)
    } catch (error) {
      console.error('Error loading items:', error)
      toast.error(t('menu.items.loadFailed'))
    } finally {
      setIsLoading(false)
    }
  }

  // Extract unique dietary tags from all items
  const allTags = useMemo(() => {
    const tagSet = new Set<string>()
    allItems.forEach((item) => {
      if (item.dietary_tags) {
        item.dietary_tags.forEach((tag) => tagSet.add(tag))
      }
    })
    return Array.from(tagSet).sort()
  }, [allItems])

  // Apply client-side filters for category (when tags/visibility are active), tags, and visibility
  const filteredItems = useMemo(() => {
    let filtered = allItems

    // Filter by category if tags/visibility filters are active (since we loaded all items)
    if (selectedCategoryId && (selectedTags.length > 0 || selectedVisibility !== 'all')) {
      filtered = filtered.filter((item) => item.category_id === selectedCategoryId)
    }

    // Filter by tags
    if (selectedTags.length > 0) {
      filtered = filtered.filter((item) => {
        if (!item.dietary_tags || item.dietary_tags.length === 0) return false
        return selectedTags.some((tag) => item.dietary_tags?.includes(tag))
      })
    }

    // Filter by visibility
    if (selectedVisibility === 'visible') {
      filtered = filtered.filter((item) => item.visible)
    } else if (selectedVisibility === 'hidden') {
      filtered = filtered.filter((item) => !item.visible)
    }

    return filtered
  }, [allItems, selectedCategoryId, selectedTags, selectedVisibility])

  const loadCategories = async () => {
    try {
      const data = await getMenuCategories()
      setCategories(data)
    } catch (error) {
      console.error('Error loading categories:', error)
    }
  }

  useEffect(() => {
    loadCategories()
  }, [])

  useEffect(() => {
    loadItems()
  }, [selectedCategoryId, selectedTags.length, selectedVisibility])

  const handleCreate = () => {
    setEditingItem(null)
    setDialogOpen(true)
  }

  const handleEdit = (item: MenuItemWithCategory) => {
    setEditingItem(item)
    setDialogOpen(true)
  }

  const handleSave = async (data: CreateMenuItemData | UpdateMenuItemData) => {
    try {
      let savedItem: MenuItemWithCategory
      if (editingItem) {
        savedItem = await updateMenuItem(editingItem.id, data as UpdateMenuItemData)
        toast.success(t('menu.items.updated'))
      } else {
        savedItem = await createMenuItem(data as CreateMenuItemData)
        toast.success(t('menu.items.created'))
      }
      await loadItems()
      return savedItem
    } catch (error: any) {
      console.error('Error saving item:', error)
      toast.error(
        editingItem
          ? t('menu.items.updateFailed')
          : t('menu.items.createFailed')
      )
      throw error
    }
  }

  const handleDeleteClick = (item: MenuItemWithCategory) => {
    setItemToDelete(item)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return

    try {
      await deleteMenuItem(itemToDelete.id)
      toast.success(t('menu.items.deleted'))
      await loadItems()
      setDeleteDialogOpen(false)
      setItemToDelete(null)
    } catch (error: any) {
      console.error('Error deleting item:', error)
      toast.error(t('menu.items.deleteFailed'))
    }
  }

  const handleToggleVisibility = async (item: MenuItemWithCategory) => {
    try {
      await updateMenuItem(item.id, {
        visible: !item.visible,
      })
      toast.success(t('menu.items.updated'))
      await loadItems()
    } catch (error: any) {
      console.error('Error toggling visibility:', error)
      toast.error(t('menu.items.updateFailed'))
    }
  }

  const handleReorder = async (categoryId: string, items: MenuItemWithCategory[]) => {
    try {
      const itemIds = items.map((item) => item.id)
      await reorderItems(categoryId, itemIds)
      toast.success(t('menu.items.reordered'))
      await loadItems()
    } catch (error: any) {
      console.error('Error reordering items:', error)
      toast.error(t('menu.items.reorderFailed'))
    }
  }

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('menu.items.title')}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {t('menu.items.pageDescription')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setBulkImportOpen(true)}>
            <IconUpload className="mr-2 h-4 w-4" />
            {t('menu.bulkImport.importFromImages')}
          </Button>
        <Button onClick={handleCreate}>
          <IconPlus className="mr-2 h-4 w-4" />
          {t('menu.items.createItem')}
        </Button>
        </div>
      </div>

      {filteredItems.length === 0 && !isLoading && allItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 border rounded-lg">
          <p className="text-muted-foreground mb-2">{t('menu.items.noItems')}</p>
          <p className="text-muted-foreground text-sm mb-4">
            {t('menu.items.noItemsDescription')}
          </p>
          <Button onClick={handleCreate}>
            <IconPlus className="mr-2 h-4 w-4" />
            {t('menu.items.createItem')}
          </Button>
        </div>
      ) : (
        <MenuItemTable
          data={filteredItems}
          categories={categories}
          onEdit={handleEdit}
          onDelete={handleDeleteClick}
          onToggleVisibility={handleToggleVisibility}
          onReorder={handleReorder}
          isLoading={isLoading}
          selectedCategoryId={selectedCategoryId}
          onCategoryFilterChange={setSelectedCategoryId}
          selectedTags={selectedTags}
          onTagsFilterChange={setSelectedTags}
          selectedVisibility={selectedVisibility}
          onVisibilityFilterChange={setSelectedVisibility}
          availableTags={allTags}
        />
      )}

      <MenuItemDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        item={editingItem}
        onSave={handleSave}
      />

      <MenuBulkImportDialog
        open={bulkImportOpen}
        onOpenChange={setBulkImportOpen}
        onImportComplete={loadItems}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">{t('menu.items.deleteConfirm')}</AlertDialogTitle>
            <AlertDialogDescription className="text-foreground">
              {t('menu.items.deleteConfirmDescription')}
              {itemToDelete && (
                <span className="text-foreground font-semibold block mt-2">
                  &quot;{itemToDelete.name}&quot;
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {t('menu.items.deleteItem')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

