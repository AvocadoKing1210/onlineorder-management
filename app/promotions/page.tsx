'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { IconPlus } from '@tabler/icons-react'
import { useTranslation } from '@/components/i18n-text'
import { toast } from 'sonner'
import { PromotionDialog } from '@/components/promotions/promotion-dialog'
import { PromotionTable } from '@/components/promotions/promotion-table'
import {
  getPromotions,
  createPromotion,
  updatePromotion,
  deletePromotion,
  getPromotionStatus,
  type Promotion,
  type CreatePromotionData,
  type UpdatePromotionData,
} from '@/lib/api/promotions'
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

export default function PromotionsPage() {
  const { t } = useTranslation()
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [promotionToDelete, setPromotionToDelete] = useState<Promotion | null>(null)

  const loadPromotions = async () => {
    try {
      setIsLoading(true)
      const data = await getPromotions()
      setPromotions(data)
    } catch (error) {
      console.error('Error loading promotions:', error)
      toast.error(t('promotions.loadFailed'))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadPromotions()
  }, [])

  const handleCreate = () => {
    setEditingPromotion(null)
    setDialogOpen(true)
  }

  const handleEdit = (promotion: Promotion) => {
    setEditingPromotion(promotion)
    setDialogOpen(true)
  }

  const handleSave = async (data: CreatePromotionData | UpdatePromotionData) => {
    try {
      if (editingPromotion) {
        await updatePromotion(editingPromotion.id, data as UpdatePromotionData)
        toast.success(t('promotions.updated'))
      } else {
        await createPromotion(data as CreatePromotionData)
        toast.success(t('promotions.created'))
      }
      await loadPromotions()
    } catch (error: any) {
      console.error('Error saving promotion:', error)
      toast.error(
        editingPromotion
          ? t('promotions.updateFailed')
          : t('promotions.createFailed')
      )
      throw error
    }
  }

  const handleDeleteClick = (promotion: Promotion) => {
    setPromotionToDelete(promotion)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!promotionToDelete) return

    try {
      await deletePromotion(promotionToDelete.id)
      toast.success(t('promotions.deleted'))
      await loadPromotions()
      setDeleteDialogOpen(false)
      setPromotionToDelete(null)
    } catch (error: any) {
      console.error('Error deleting promotion:', error)
      toast.error(t('promotions.deleteFailed'))
    }
  }

  const handleQuickEdit = async (
    promotion: Promotion,
    field: 'stackable' | 'status',
    value: boolean | string
  ) => {
    try {
      if (field === 'stackable') {
        await updatePromotion(promotion.id, { stackable: value as boolean })
        toast.success(t('promotions.updated'))
      } else if (field === 'status') {
        const now = new Date()
        const nowISO = now.toISOString()
        const status = getPromotionStatus(promotion)
        
        if (status === 'active') {
          // Make inactive by setting active_until to now
          await updatePromotion(promotion.id, { active_until: nowISO })
        } else {
          // Make active by ensuring active_from is in the past and active_until is in the future
          const from = new Date(promotion.active_from)
          const updateData: UpdatePromotionData = {}
          
          if (from > now) {
            // If upcoming, set active_from to now
            updateData.active_from = nowISO
          }
          
          // Set active_until to 30 days from now if it's expired or doesn't exist
          const until = promotion.active_until ? new Date(promotion.active_until) : null
          if (!until || until < now) {
            const futureDate = new Date()
            futureDate.setDate(futureDate.getDate() + 30)
            updateData.active_until = futureDate.toISOString()
          }
          
          await updatePromotion(promotion.id, updateData)
        }
        toast.success(t('promotions.updated'))
      }
      await loadPromotions()
    } catch (error: any) {
      console.error('Error updating promotion:', error)
      toast.error(t('promotions.updateFailed'))
    }
  }

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('promotions.title')}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {t('promotions.description')}
          </p>
        </div>
        <Button onClick={handleCreate}>
          <IconPlus className="mr-2 h-4 w-4" />
          {t('promotions.createPromotion')}
        </Button>
      </div>

      {promotions.length === 0 && !isLoading ? (
        <div className="flex flex-col items-center justify-center py-12 border rounded-lg">
          <p className="text-muted-foreground mb-2">
            {t('promotions.noPromotions')}
          </p>
          <p className="text-muted-foreground text-sm mb-4">
            {t('promotions.noPromotionsDescription')}
          </p>
          <Button onClick={handleCreate}>
            <IconPlus className="mr-2 h-4 w-4" />
            {t('promotions.createPromotion')}
          </Button>
        </div>
      ) : (
        <PromotionTable
          data={promotions}
          onEdit={handleEdit}
          onDelete={handleDeleteClick}
          onQuickEdit={handleQuickEdit}
          isLoading={isLoading}
        />
      )}

      <PromotionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        promotion={editingPromotion}
        onSave={handleSave}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('promotions.deleteConfirm')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('promotions.deleteConfirmDescription')}
              {promotionToDelete && (
                <span className="font-semibold block mt-2">
                  &quot;{promotionToDelete.name}&quot;
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
              {t('promotions.deletePromotion')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

