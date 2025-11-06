'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { IconPlus } from '@tabler/icons-react'
import { useTranslation } from '@/components/i18n-text'
import { toast } from 'sonner'
import { ModifierGroupDialog } from '@/components/menu/modifier-group-dialog'
import { ModifierGroupTable } from '@/components/menu/modifier-group-table'
import {
  getModifierGroups,
  createModifierGroup,
  updateModifierGroup,
  deleteModifierGroup,
  reorderModifierGroups,
  type ModifierGroup,
  type CreateModifierGroupData,
  type UpdateModifierGroupData,
} from '@/lib/api/menu-modifier-groups'
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

export default function ModifierGroupsPage() {
  const { t } = useTranslation()
  const [groups, setGroups] = useState<ModifierGroup[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingGroup, setEditingGroup] = useState<ModifierGroup | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [groupToDelete, setGroupToDelete] = useState<ModifierGroup | null>(null)

  const loadGroups = async () => {
    try {
      setIsLoading(true)
      const data = await getModifierGroups()
      setGroups(data)
    } catch (error) {
      console.error('Error loading modifier groups:', error)
      toast.error(t('menu.modifiers.groups.loadFailed'))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadGroups()
  }, [])

  const handleCreate = () => {
    setEditingGroup(null)
    setDialogOpen(true)
  }

  const handleEdit = (group: ModifierGroup) => {
    setEditingGroup(group)
    setDialogOpen(true)
  }

  const handleSave = async (data: CreateModifierGroupData | UpdateModifierGroupData) => {
    try {
      if (editingGroup) {
        await updateModifierGroup(editingGroup.id, data)
        toast.success(t('menu.modifiers.groups.updated'))
      } else {
        await createModifierGroup(data)
        toast.success(t('menu.modifiers.groups.created'))
      }
      await loadGroups()
    } catch (error: any) {
      console.error('Error saving modifier group:', error)
      toast.error(
        error.message || 
        (editingGroup 
          ? t('menu.modifiers.groups.updateFailed') 
          : t('menu.modifiers.groups.createFailed'))
      )
      throw error
    }
  }

  const handleDelete = (group: ModifierGroup) => {
    setGroupToDelete(group)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!groupToDelete) return

    try {
      await deleteModifierGroup(groupToDelete.id)
      toast.success(t('menu.modifiers.groups.deleted'))
      await loadGroups()
    } catch (error: any) {
      console.error('Error deleting modifier group:', error)
      toast.error(error.message || t('menu.modifiers.groups.deleteFailed'))
    } finally {
      setDeleteDialogOpen(false)
      setGroupToDelete(null)
    }
  }

  const handleToggleVisibility = async (group: ModifierGroup) => {
    try {
      await updateModifierGroup(group.id, { visible: !group.visible })
      toast.success(t('menu.modifiers.groups.updated'))
      await loadGroups()
    } catch (error: any) {
      console.error('Error toggling visibility:', error)
      toast.error(error.message || t('menu.modifiers.groups.updateFailed'))
    }
  }

  const handleReorder = async (reorderedGroups: ModifierGroup[]) => {
    try {
      const groupIds = reorderedGroups.map((g) => g.id)
      await reorderModifierGroups(groupIds)
      toast.success(t('menu.modifiers.groups.reordered'))
      await loadGroups()
    } catch (error: any) {
      console.error('Error reordering modifier groups:', error)
      toast.error(error.message || t('menu.modifiers.groups.reorderFailed'))
      // Reload to reset to correct order
      await loadGroups()
    }
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            {t('menu.modifiers.groups.title')}
          </h2>
          <p className="text-muted-foreground">
            {t('menu.modifiers.groups.description')}
          </p>
        </div>
        <Button onClick={handleCreate}>
          <IconPlus className="mr-2 h-4 w-4" />
          {t('menu.modifiers.groups.createGroup')}
        </Button>
      </div>

      <ModifierGroupTable
        data={groups}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onToggleVisibility={handleToggleVisibility}
        onReorder={handleReorder}
        isLoading={isLoading}
      />

      <ModifierGroupDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) {
            setEditingGroup(null)
          }
        }}
        group={editingGroup}
        onSave={handleSave}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('menu.modifiers.groups.deleteConfirm')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('menu.modifiers.groups.deleteConfirmDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t('menu.modifiers.groups.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

