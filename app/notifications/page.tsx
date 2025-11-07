'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { IconPlus } from '@tabler/icons-react'
import { useTranslation } from '@/components/i18n-text'
import { toast } from 'sonner'
import { NotificationDialog } from '@/components/notifications/notification-dialog'
import { NotificationTable } from '@/components/notifications/notification-table'
import {
  getNotifications,
  createNotification,
  updateNotification,
  deleteNotification,
  type Notification,
  type CreateNotificationData,
  type UpdateNotificationData,
} from '@/lib/api/notifications'
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

export default function NotificationsPage() {
  const { t } = useTranslation()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingNotification, setEditingNotification] = useState<Notification | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [notificationToDelete, setNotificationToDelete] = useState<Notification | null>(null)

  const loadNotifications = async () => {
    try {
      setIsLoading(true)
      const data = await getNotifications()
      setNotifications(data)
    } catch (error) {
      console.error('Error loading notifications:', error)
      toast.error(t('notifications.loadFailed'))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadNotifications()
  }, [])

  const handleCreate = () => {
    setEditingNotification(null)
    setDialogOpen(true)
  }

  const handleEdit = (notification: Notification) => {
    setEditingNotification(notification)
    setDialogOpen(true)
  }

  const handleSave = async (data: CreateNotificationData | UpdateNotificationData) => {
    try {
      if (editingNotification) {
        await updateNotification(editingNotification.id, data as UpdateNotificationData)
        toast.success(t('notifications.updated'))
      } else {
        await createNotification(data as CreateNotificationData)
        toast.success(t('notifications.created'))
      }
      await loadNotifications()
    } catch (error: any) {
      console.error('Error saving notification:', error)
      toast.error(
        editingNotification
          ? t('notifications.updateFailed')
          : t('notifications.createFailed')
      )
      throw error
    }
  }

  const handleDeleteClick = (notification: Notification) => {
    setNotificationToDelete(notification)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!notificationToDelete) return

    try {
      await deleteNotification(notificationToDelete.id)
      toast.success(t('notifications.deleted'))
      await loadNotifications()
      setDeleteDialogOpen(false)
      setNotificationToDelete(null)
    } catch (error: any) {
      console.error('Error deleting notification:', error)
      toast.error(t('notifications.deleteFailed'))
    }
  }

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('notifications.title')}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {t('notifications.description')}
          </p>
        </div>
        <Button onClick={handleCreate}>
          <IconPlus className="mr-2 h-4 w-4" />
          {t('notifications.createNotification')}
        </Button>
      </div>

      {notifications.length === 0 && !isLoading ? (
        <div className="flex flex-col items-center justify-center py-12 border rounded-lg">
          <p className="text-muted-foreground mb-2">
            {t('notifications.noNotifications')}
          </p>
          <p className="text-muted-foreground text-sm mb-4">
            {t('notifications.noNotificationsDescription')}
          </p>
          <Button onClick={handleCreate}>
            <IconPlus className="mr-2 h-4 w-4" />
            {t('notifications.createNotification')}
          </Button>
        </div>
      ) : (
        <NotificationTable
          data={notifications}
          onEdit={handleEdit}
          onDelete={handleDeleteClick}
          isLoading={isLoading}
        />
      )}

      <NotificationDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        notification={editingNotification}
        onSave={handleSave}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('notifications.deleteConfirm')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('notifications.deleteConfirmDescription')}
              {notificationToDelete && (
                <span className="font-semibold block mt-2">
                  &quot;{notificationToDelete.title}&quot;
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
              {t('notifications.deleteNotification')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

