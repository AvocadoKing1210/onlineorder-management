'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { IconPlus } from '@tabler/icons-react'
import { useTranslation } from '@/components/i18n-text'
import { toast } from 'sonner'
import { PromotionItemDialog } from '@/components/promotions/promotion-item-dialog'
import { PromotionItemTable } from '@/components/promotions/promotion-item-table'
import {
  getPromotionItems,
  createPromotionItem,
  updatePromotionItem,
  deletePromotionItem,
  type PromotionItemWithRelations,
  type CreatePromotionItemData,
  type UpdatePromotionItemData,
} from '@/lib/api/promotion-items'
import { getPromotions, type Promotion } from '@/lib/api/promotions'
import { getMenuItems, type MenuItem } from '@/lib/api/menu-items'
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

export default function PromotionItemsPage() {
  const { t } = useTranslation()
  const [items, setItems] = useState<PromotionItemWithRelations[]>([])
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<PromotionItemWithRelations | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<PromotionItemWithRelations | null>(null)

  const loadData = async () => {
    try {
      setIsLoading(true)
      const [itemsData, promotionsData, menuItemsData] = await Promise.all([
        getPromotionItems(),
        getPromotions(),
        getMenuItems(),
      ])
      setItems(itemsData)
      setPromotions(promotionsData)
      setMenuItems(menuItemsData)
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error(t('promotions.items.loadFailed') || 'Failed to load data')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleCreate = () => {
    setEditingItem(null)
    setDialogOpen(true)
  }

  const handleEdit = (item: PromotionItemWithRelations) => {
    setEditingItem(item)
    setDialogOpen(true)
  }

  const handleSave = async (data: CreatePromotionItemData | UpdatePromotionItemData) => {
    try {
      if (editingItem) {
        await updatePromotionItem(editingItem.id, data as UpdatePromotionItemData)
        toast.success(t('promotions.items.updated'))
      } else {
        await createPromotionItem(data as CreatePromotionItemData)
        toast.success(t('promotions.items.created'))
      }
      await loadData()
    } catch (error: any) {
      console.error('Error saving promotion item:', error)
      toast.error(error.message || (editingItem ? t('promotions.items.updateFailed') : t('promotions.items.createFailed')))
      throw error
    }
  }

  const handleDeleteClick = (id: string) => {
    const item = items.find((i) => i.id === id)
    if (item) {
      setItemToDelete(item)
      setDeleteDialogOpen(true)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return

    try {
      await deletePromotionItem(itemToDelete.id)
      toast.success(t('promotions.items.deleted'))
      await loadData()
      setDeleteDialogOpen(false)
      setItemToDelete(null)
    } catch (error: any) {
      console.error('Error deleting promotion item:', error)
      toast.error(t('promotions.items.deleteFailed'))
    }
  }

  const promotionName = itemToDelete?.promotion?.name
  const menuItemName = itemToDelete?.menu_item?.name

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('promotions.items.title')}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {t('promotions.items.description')}
          </p>
        </div>
        <Button onClick={handleCreate}>
          <IconPlus className="mr-2 h-4 w-4" />
          {t('promotions.items.createAssociation')}
        </Button>
      </div>

      {items.length === 0 && !isLoading ? (
        <div className="flex flex-col items-center justify-center py-12 border rounded-lg">
          <p className="text-muted-foreground mb-2">
            {t('promotions.items.noAssociations')}
          </p>
          <Button onClick={handleCreate} className="mt-4">
            <IconPlus className="mr-2 h-4 w-4" />
            {t('promotions.items.createAssociation')}
          </Button>
        </div>
      ) : (
        <PromotionItemTable
          data={items}
          promotions={promotions.map((p) => ({ id: p.id, name: p.name }))}
          menuItems={menuItems.map((m) => ({ id: m.id, name: m.name, visible: m.visible }))}
          onEdit={handleEdit}
          onDelete={handleDeleteClick}
          isLoading={isLoading}
        />
      )}

      <PromotionItemDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        item={editingItem}
        promotions={promotions.map((p) => ({ id: p.id, name: p.name, type: p.type }))}
        menuItems={menuItems.map((m) => ({ id: m.id, name: m.name, visible: m.visible }))}
        existingAssociations={items.map((i) => ({
          promotion_id: i.promotion_id,
          menu_item_id: i.menu_item_id,
        }))}
        onSave={handleSave}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('promotions.items.deleteConfirm')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('promotions.items.deleteConfirmDescription')}
              {promotionName && menuItemName && (
                <span className="font-semibold block mt-2">
                  &quot;{promotionName}&quot; - &quot;{menuItemName}&quot;
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

