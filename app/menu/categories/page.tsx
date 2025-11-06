'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { IconPlus } from '@tabler/icons-react'
import { useTranslation } from '@/components/i18n-text'
import { toast } from 'sonner'
import {
  MenuCategoryDialog,
} from '@/components/menu/menu-category-dialog'
import { MenuCategoryTable } from '@/components/menu/menu-category-table'
import {
  getMenuCategories,
  createMenuCategory,
  updateMenuCategory,
  deleteMenuCategory,
  reorderCategories,
  type MenuCategory,
  type CreateMenuCategoryData,
  type UpdateMenuCategoryData,
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

export default function MenuCategoriesPage() {
  const { t } = useTranslation()
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<MenuCategory | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [categoryToDelete, setCategoryToDelete] = useState<MenuCategory | null>(null)
  const loadCategories = async () => {
    try {
      setIsLoading(true)
      const data = await getMenuCategories()
      setCategories(data)
    } catch (error) {
      console.error('Error loading categories:', error)
      toast.error(t('menu.categories.createFailed'))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadCategories()
  }, [])

  const handleCreate = () => {
    setEditingCategory(null)
    setDialogOpen(true)
  }

  const handleEdit = (category: MenuCategory) => {
    setEditingCategory(category)
    setDialogOpen(true)
  }

  const handleSave = async (data: CreateMenuCategoryData | UpdateMenuCategoryData) => {
    try {
      if (editingCategory) {
        await updateMenuCategory(editingCategory.id, data as UpdateMenuCategoryData)
        toast.success(t('menu.categories.updated'))
      } else {
        await createMenuCategory(data as CreateMenuCategoryData)
        toast.success(t('menu.categories.created'))
      }
      await loadCategories()
    } catch (error: any) {
      console.error('Error saving category:', error)
      toast.error(
        editingCategory
          ? t('menu.categories.updateFailed')
          : t('menu.categories.createFailed')
      )
      throw error
    }
  }

  const handleDeleteClick = (category: MenuCategory) => {
    setCategoryToDelete(category)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!categoryToDelete) return

    try {
      await deleteMenuCategory(categoryToDelete.id)
      toast.success(t('menu.categories.deleted'))
      await loadCategories()
      setDeleteDialogOpen(false)
      setCategoryToDelete(null)
    } catch (error: any) {
      console.error('Error deleting category:', error)
      toast.error(t('menu.categories.deleteFailed'))
    }
  }

  const handleToggleVisibility = async (category: MenuCategory) => {
    try {
      await updateMenuCategory(category.id, {
        visible: !category.visible,
      })
      toast.success(t('menu.categories.updated'))
      await loadCategories()
    } catch (error: any) {
      console.error('Error toggling visibility:', error)
      toast.error(t('menu.categories.updateFailed'))
    }
  }

  const handleReorder = async (reorderedCategories: MenuCategory[]) => {
    try {
      const categoryIds = reorderedCategories.map((c) => c.id)
      await reorderCategories(categoryIds)
      
      // Update local state with correct positions
      const updatedCategories = reorderedCategories.map((cat, index) => ({
        ...cat,
        position: index,
      }))
      setCategories(updatedCategories)
      
      toast.success(t('menu.categories.reordered'))
    } catch (error: any) {
      console.error('Error reordering categories:', error)
      toast.error(t('menu.categories.reorderFailed'))
      // Reload to reset to original order
      await loadCategories()
    }
  }

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('menu.categories.title')}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {t('menu.categories.description')}
          </p>
        </div>
        <Button onClick={handleCreate}>
          <IconPlus className="mr-2 h-4 w-4" />
          {t('menu.categories.createCategory')}
        </Button>
      </div>

      {categories.length === 0 && !isLoading ? (
        <div className="flex flex-col items-center justify-center py-12 border rounded-lg">
          <p className="text-muted-foreground mb-2">{t('menu.categories.noCategories')}</p>
          <p className="text-muted-foreground text-sm mb-4">
            {t('menu.categories.noCategoriesDescription')}
          </p>
          <Button onClick={handleCreate}>
            <IconPlus className="mr-2 h-4 w-4" />
            {t('menu.categories.createCategory')}
          </Button>
        </div>
      ) : (
        <MenuCategoryTable
          data={categories}
          onEdit={handleEdit}
          onDelete={handleDeleteClick}
          onToggleVisibility={handleToggleVisibility}
          onReorder={handleReorder}
          isLoading={isLoading}
        />
      )}

      <MenuCategoryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        category={editingCategory}
        onSave={handleSave}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('menu.categories.deleteConfirm')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('menu.categories.deleteConfirmDescription')}
              {categoryToDelete && (
                <span className="font-semibold block mt-2">
                  &quot;{categoryToDelete.name}&quot;
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('menu.categories.deleteCategory')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

