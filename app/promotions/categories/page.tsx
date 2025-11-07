'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { IconPlus } from '@tabler/icons-react'
import { useTranslation } from '@/components/i18n-text'
import { toast } from 'sonner'
import { PromotionCategoryDialog } from '@/components/promotions/promotion-category-dialog'
import { PromotionCategoryTable } from '@/components/promotions/promotion-category-table'
import {
  getPromotionCategories,
  createPromotionCategory,
  deletePromotionCategory,
  type PromotionCategoryWithRelations,
  type CreatePromotionCategoryData,
} from '@/lib/api/promotion-categories'
import { getPromotions, type Promotion } from '@/lib/api/promotions'
import { getMenuCategories, type MenuCategory } from '@/lib/api/menu-categories'
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

export default function PromotionCategoriesPage() {
  const { t } = useTranslation()
  const [associations, setAssociations] = useState<PromotionCategoryWithRelations[]>([])
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [associationToDelete, setAssociationToDelete] = useState<{
    promotionId: string
    categoryId: string
  } | null>(null)

  const loadData = async () => {
    try {
      setIsLoading(true)
      const [associationsData, promotionsData, categoriesData] = await Promise.all([
        getPromotionCategories(),
        getPromotions(),
        getMenuCategories(),
      ])
      setAssociations(associationsData)
      setPromotions(promotionsData)
      setCategories(categoriesData)
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error(t('promotions.categoryAssociations.loadFailed') || 'Failed to load data')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleCreate = () => {
    setDialogOpen(true)
  }

  const handleSave = async (data: CreatePromotionCategoryData) => {
    try {
      await createPromotionCategory(data)
      toast.success(t('promotions.categoryAssociations.created'))
      await loadData()
    } catch (error: any) {
      console.error('Error saving promotion category:', error)
      toast.error(error.message || t('promotions.categoryAssociations.createFailed'))
      throw error
    }
  }

  const handleDeleteClick = (promotionId: string, categoryId: string) => {
    setAssociationToDelete({ promotionId, categoryId })
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!associationToDelete) return

    try {
      await deletePromotionCategory(
        associationToDelete.promotionId,
        associationToDelete.categoryId
      )
      toast.success(t('promotions.categoryAssociations.deleted'))
      await loadData()
      setDeleteDialogOpen(false)
      setAssociationToDelete(null)
    } catch (error: any) {
      console.error('Error deleting promotion category:', error)
      toast.error(t('promotions.categoryAssociations.deleteFailed'))
    }
  }

  const promotionName = associationToDelete
    ? promotions.find((p) => p.id === associationToDelete.promotionId)?.name
    : null
  const categoryName = associationToDelete
    ? categories.find((c) => c.id === associationToDelete.categoryId)?.name
    : null

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('promotions.categoryAssociations.title')}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {t('promotions.categoryAssociations.description')}
          </p>
        </div>
        <Button onClick={handleCreate}>
          <IconPlus className="mr-2 h-4 w-4" />
          {t('promotions.categoryAssociations.createAssociation')}
        </Button>
      </div>

      {associations.length === 0 && !isLoading ? (
        <div className="flex flex-col items-center justify-center py-12 border rounded-lg">
          <p className="text-muted-foreground mb-2">
            {t('promotions.categoryAssociations.noAssociations')}
          </p>
          <Button onClick={handleCreate} className="mt-4">
            <IconPlus className="mr-2 h-4 w-4" />
            {t('promotions.categoryAssociations.createAssociation')}
          </Button>
        </div>
      ) : (
        <PromotionCategoryTable
          data={associations}
          promotions={promotions.map((p) => ({ id: p.id, name: p.name }))}
          categories={categories.map((c) => ({ id: c.id, name: c.name, visible: c.visible }))}
          onDelete={handleDeleteClick}
          isLoading={isLoading}
        />
      )}

      <PromotionCategoryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        promotions={promotions.map((p) => ({ id: p.id, name: p.name, type: p.type }))}
        categories={categories.map((c) => ({ id: c.id, name: c.name, visible: c.visible }))}
        existingAssociations={associations.map((a) => ({
          promotion_id: a.promotion_id,
          category_id: a.category_id,
        }))}
        onSave={handleSave}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('promotions.categoryAssociations.deleteConfirm')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('promotions.categoryAssociations.deleteConfirmDescription')}
              {promotionName && categoryName && (
                <span className="font-semibold block mt-2">
                  &quot;{promotionName}&quot; - &quot;{categoryName}&quot;
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
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

