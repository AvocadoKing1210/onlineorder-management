'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { IconPlus, IconFolder, IconCircleDot } from '@tabler/icons-react'
import { useTranslation } from '@/components/i18n-text'
import { toast } from 'sonner'
import { ModifierOptionDialog } from '@/components/menu/modifier-option-dialog'
import { ModifierGroupDialog } from '@/components/menu/modifier-group-dialog'
import { ModifierOptionTable } from '@/components/menu/modifier-option-table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  getModifierOptions,
  createModifierOption,
  updateModifierOption,
  deleteModifierOption,
  reorderModifierOptions,
  type ModifierOption,
  type CreateModifierOptionData,
  type UpdateModifierOptionData,
} from '@/lib/api/menu-modifier-options'
import {
  getModifierGroups,
  createModifierGroup,
  updateModifierGroup,
  deleteModifierGroup,
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

export default function ModifiersPage() {
  const { t } = useTranslation()
  const searchParams = useSearchParams()
  const [groups, setGroups] = useState<ModifierGroup[]>([])
  const [options, setOptions] = useState<ModifierOption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingOption, setEditingOption] = useState<ModifierOption | null>(null)
  const [groupDialogOpen, setGroupDialogOpen] = useState(false)
  const [editingGroup, setEditingGroup] = useState<ModifierGroup | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [optionToDelete, setOptionToDelete] = useState<ModifierOption | null>(null)
  const [groupDeleteDialogOpen, setGroupDeleteDialogOpen] = useState(false)
  const [groupToDelete, setGroupToDelete] = useState<ModifierGroup | null>(null)
  const [selectedGroupId, setSelectedGroupId] = useState<string | undefined>(undefined)

  const loadData = async () => {
    try {
      setIsLoading(true)
      const [groupsData, optionsData] = await Promise.all([
        getModifierGroups(),
        getModifierOptions(),
      ])
      setGroups(groupsData)
      setOptions(optionsData)
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error(t('menu.modifiers.options.loadFailed'))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    // Get initial group from URL
    const groupParam = searchParams.get('group')
    if (groupParam) {
      setSelectedGroupId(groupParam)
    }
  }, [])

  // Update selectedGroupId when URL param changes
  useEffect(() => {
    const groupParam = searchParams.get('group')
    setSelectedGroupId(groupParam || undefined)
  }, [searchParams])

  const handleCreateOption = () => {
    setEditingOption(null)
    setDialogOpen(true)
  }

  const handleCreateGroup = () => {
    setEditingGroup(null)
    setGroupDialogOpen(true)
  }

  const handleEditGroup = (group: ModifierGroup) => {
    setEditingGroup(group)
    setGroupDialogOpen(true)
  }

  const handleDeleteGroup = (group: ModifierGroup) => {
    setGroupToDelete(group)
    setGroupDeleteDialogOpen(true)
  }

  const confirmDeleteGroup = async () => {
    if (!groupToDelete) return

    try {
      await deleteModifierGroup(groupToDelete.id)
      toast.success(t('menu.modifiers.groups.deleted'))
      await loadData()
    } catch (error: any) {
      console.error('Error deleting modifier group:', error)
      toast.error(error.message || t('menu.modifiers.groups.deleteFailed'))
    } finally {
      setGroupDeleteDialogOpen(false)
      setGroupToDelete(null)
    }
  }

  const handleEdit = (option: ModifierOption) => {
    setEditingOption(option)
    setDialogOpen(true)
  }

  const handleSave = async (data: CreateModifierOptionData | UpdateModifierOptionData) => {
    try {
      if (editingOption) {
        await updateModifierOption(editingOption.id, data)
        toast.success(t('menu.modifiers.options.updated'))
      } else {
        await createModifierOption(data as CreateModifierOptionData)
        toast.success(t('menu.modifiers.options.created'))
      }
      await loadData()
    } catch (error: any) {
      console.error('Error saving modifier option:', error)
      toast.error(
        error.message || 
        (editingOption 
          ? t('menu.modifiers.options.updateFailed') 
          : t('menu.modifiers.options.createFailed'))
      )
      throw error
    }
  }

  const handleDelete = (option: ModifierOption) => {
    setOptionToDelete(option)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!optionToDelete) return

    try {
      await deleteModifierOption(optionToDelete.id)
      toast.success(t('menu.modifiers.options.deleted'))
      await loadData()
    } catch (error: any) {
      console.error('Error deleting modifier option:', error)
      toast.error(error.message || t('menu.modifiers.options.deleteFailed'))
    } finally {
      setDeleteDialogOpen(false)
      setOptionToDelete(null)
    }
  }

  const handleToggleVisibility = async (option: ModifierOption) => {
    // Optimistically update local state
    const newVisible = !option.visible
    setOptions((prev) =>
      prev.map((opt) =>
        opt.id === option.id ? { ...opt, visible: newVisible } : opt
      )
    )

    try {
      await updateModifierOption(option.id, { visible: newVisible })
      toast.success(t('menu.modifiers.options.updated'))
    } catch (error: any) {
      // Revert on error
      setOptions((prev) =>
        prev.map((opt) =>
          opt.id === option.id ? { ...opt, visible: option.visible } : opt
        )
      )
      console.error('Error toggling visibility:', error)
      toast.error(error.message || t('menu.modifiers.options.updateFailed'))
    }
  }

  const handleToggleAvailable = async (option: ModifierOption) => {
    // Optimistically update local state
    const newAvailable = !option.available
    setOptions((prev) =>
      prev.map((opt) =>
        opt.id === option.id ? { ...opt, available: newAvailable } : opt
      )
    )

    try {
      await updateModifierOption(option.id, { available: newAvailable })
      toast.success(t('menu.modifiers.options.updated'))
    } catch (error: any) {
      // Revert on error
      setOptions((prev) =>
        prev.map((opt) =>
          opt.id === option.id ? { ...opt, available: option.available } : opt
        )
      )
      console.error('Error toggling available:', error)
      toast.error(error.message || t('menu.modifiers.options.updateFailed'))
    }
  }

  const handleSaveGroup = async (data: CreateModifierGroupData | UpdateModifierGroupData) => {
    try {
      if (editingGroup) {
        await updateModifierGroup(editingGroup.id, data as UpdateModifierGroupData)
        toast.success(t('menu.modifiers.groups.updated'))
      } else {
        await createModifierGroup(data as CreateModifierGroupData)
        toast.success(t('menu.modifiers.groups.created'))
      }
      await loadData()
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

  const handleReorder = async (groupId: string, reorderedOptions: ModifierOption[]) => {
    // Optimistically update local state immediately
    setOptions((prev) => {
      const otherOptions = prev.filter((opt) => opt.modifier_group_id !== groupId)
      // Update positions for reordered options
      const updatedGroupOptions = reorderedOptions.map((opt, index) => ({
        ...opt,
        position: index,
      }))
      return [...otherOptions, ...updatedGroupOptions]
    })

    try {
      const optionIds = reorderedOptions.map((o) => o.id)
      await reorderModifierOptions(groupId, optionIds)
      toast.success(t('menu.modifiers.options.reordered'))
      // Don't reload - keep the optimistic update for smooth UX
    } catch (error: any) {
      console.error('Error reordering modifier options:', error)
      toast.error(error.message || t('menu.modifiers.options.reorderFailed'))
      // Reload to reset to correct order on error
      await loadData()
    }
  }

  const handleGroupFilterChange = (groupId: string | undefined) => {
    setSelectedGroupId(groupId)
    // Update URL without reload
    const url = new URL(window.location.href)
    if (groupId) {
      url.searchParams.set('group', groupId)
    } else {
      url.searchParams.delete('group')
    }
    window.history.pushState({}, '', url.toString())
  }

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('menu.modifiers.options.title')}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {t('menu.modifiers.options.description')}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button>
              <IconPlus className="mr-2 h-4 w-4" />
              {t('menu.modifiers.options.create')}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleCreateGroup}>
              <IconFolder className="mr-2 h-4 w-4" />
              {t('menu.modifiers.groups.createGroup')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleCreateOption}>
              <IconCircleDot className="mr-2 h-4 w-4" />
              {t('menu.modifiers.options.createOption')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <ModifierOptionTable
        data={options}
        groups={groups}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onToggleVisibility={handleToggleVisibility}
        onToggleAvailable={handleToggleAvailable}
        onReorder={handleReorder}
        onEditGroup={handleEditGroup}
        onDeleteGroup={handleDeleteGroup}
        isLoading={isLoading}
        selectedGroupId={selectedGroupId}
        onGroupFilterChange={handleGroupFilterChange}
      />

      <ModifierOptionDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) {
            setEditingOption(null)
          }
        }}
        option={editingOption}
        groups={groups}
        onSave={handleSave}
      />

      <ModifierGroupDialog
        open={groupDialogOpen}
        onOpenChange={(open) => {
          setGroupDialogOpen(open)
          if (!open) {
            setEditingGroup(null)
          }
        }}
        group={editingGroup}
        onSave={handleSaveGroup}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('menu.modifiers.options.deleteConfirm')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('menu.modifiers.options.deleteConfirmDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t('menu.modifiers.options.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={groupDeleteDialogOpen} onOpenChange={setGroupDeleteDialogOpen}>
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
            <AlertDialogAction onClick={confirmDeleteGroup} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t('menu.modifiers.groups.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
