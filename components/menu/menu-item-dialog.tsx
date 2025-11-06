'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Kbd } from '@/components/ui/kbd'
import { useTranslation } from '@/components/i18n-text'
import {
  type MenuItem,
  type CreateMenuItemData,
  type UpdateMenuItemData,
} from '@/lib/api/menu-items'
import { type MenuCategory, getMenuCategories } from '@/lib/api/menu-categories'
import { cn } from '@/lib/utils'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { IconGripVertical, IconX, IconPlus } from '@tabler/icons-react'

interface MenuItemDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item?: MenuItem | null
  onSave: (data: CreateMenuItemData | UpdateMenuItemData) => Promise<void>
}

interface SortableTagProps {
  tag: string
  onRemove: (tag: string) => void
}

function SortableTag({ tag, onRemove }: SortableTagProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: tag })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-secondary text-secondary-foreground text-sm border",
        isDragging && "cursor-grabbing"
      )}
    >
      <button
        {...attributes}
        {...listeners}
        type="button"
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
        aria-label="Drag to reorder"
      >
        <IconGripVertical className="h-3.5 w-3.5" />
      </button>
      <span>{tag}</span>
      <button
        type="button"
        onClick={() => onRemove(tag)}
        className="ml-0.5 hover:bg-destructive/20 rounded p-0.5 transition-colors"
        aria-label={`Remove ${tag}`}
      >
        <IconX className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
      </button>
    </div>
  )
}

export function MenuItemDialog({
  open,
  onOpenChange,
  item,
  onSave,
}: MenuItemDialogProps) {
  const { t } = useTranslation()
  const isEditing = !!item

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [categoryId, setCategoryId] = useState<string>('')
  const [imageUrl, setImageUrl] = useState('')
  const [videoRef, setVideoRef] = useState('')
  const [dietaryTags, setDietaryTags] = useState<string[]>([])
  const [newTagInput, setNewTagInput] = useState('')
  const [availabilityNotes, setAvailabilityNotes] = useState('')
  const [visible, setVisible] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [errors, setErrors] = useState<{
    name?: string
    price?: string
    category_id?: string
  }>({})
  const [categories, setCategories] = useState<MenuCategory[]>([])

  // Drag and drop sensors for tags
  const tagSensors = useSensors(
    useSensor(MouseSensor, {}),
    useSensor(TouchSensor, {}),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Handle tag drag end
  const handleTagDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (active && over && active.id !== over.id) {
      setDietaryTags((items) => {
        const oldIndex = items.indexOf(active.id as string)
        const newIndex = items.indexOf(over.id as string)
        return arrayMove(items, oldIndex, newIndex)
      })
    }
  }

  // Add a new tag
  const handleAddTag = () => {
    const trimmed = newTagInput.trim()
    if (trimmed && !dietaryTags.includes(trimmed)) {
      setDietaryTags([...dietaryTags, trimmed])
      setNewTagInput('')
    }
  }

  // Remove a tag
  const handleRemoveTag = (tag: string) => {
    setDietaryTags(dietaryTags.filter((t) => t !== tag))
  }

  // Handle Enter key in tag input
  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddTag()
    }
  }

  // Load categories
  useEffect(() => {
    if (open) {
      getMenuCategories()
        .then(setCategories)
        .catch((error) => {
          console.error('Error loading categories:', error)
        })
    }
  }, [open])

  // Reset form when dialog opens/closes or item changes
  useEffect(() => {
    if (open) {
      if (item) {
        setName(item.name)
        setDescription(item.description || '')
        setPrice(item.price || '')
        setCategoryId(item.category_id)
        setImageUrl(item.image_url || '')
        setVideoRef(item.video_ref || '')
        setDietaryTags(item.dietary_tags || [])
        setAvailabilityNotes(item.availability_notes || '')
        setVisible(item.visible)
      } else {
        setName('')
        setDescription('')
        setPrice('')
        setCategoryId('')
        setImageUrl('')
        setVideoRef('')
        setDietaryTags([])
        setNewTagInput('')
        setAvailabilityNotes('')
        setVisible(true)
      }
      setErrors({})
    }
  }, [open, item])

  const validate = (): boolean => {
    const newErrors: {
      name?: string
      price?: string
      category_id?: string
    } = {}

    if (!name.trim()) {
      newErrors.name = t('menu.items.nameRequired')
    }

    const priceNum = parseFloat(price)
    if (!price || isNaN(priceNum) || priceNum < 0) {
      newErrors.price = t('menu.items.priceRequired')
    }

    if (!categoryId) {
      newErrors.category_id = t('menu.items.categoryRequired')
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = async () => {
    if (!validate()) {
      return
    }

    setIsSaving(true)
    try {
      const data: CreateMenuItemData | UpdateMenuItemData = {
        name: name.trim(),
        description: description.trim() || null,
        price: parseFloat(price),
        category_id: categoryId,
        image_url: imageUrl.trim() || null,
        video_ref: videoRef.trim() || null,
        dietary_tags: dietaryTags.length > 0 ? dietaryTags : null,
        availability_notes: availabilityNotes.trim() || null,
        visible,
      }

      await onSave(data)
      onOpenChange(false)
    } catch (error) {
      // Error handling is done in parent component
      console.error('Error saving item:', error)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? t('menu.items.editItem') : t('menu.items.createItem')}
          </DialogTitle>
          <DialogDescription>
            {isEditing ? t('menu.items.editItemDescription') : t('menu.items.createItemDescription')}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 px-4">
          {/* Category Selection */}
          <div className="grid gap-2.5">
            <div className="flex items-baseline gap-1.5">
              <Label htmlFor="category" className="text-sm font-medium">
                {t('menu.items.category')}
              </Label>
              <span className="text-destructive text-sm">*</span>
            </div>
            <Select
              value={categoryId}
              onValueChange={(value) => {
                setCategoryId(value)
                if (errors.category_id) {
                  setErrors({ ...errors, category_id: undefined })
                }
              }}
            >
              <SelectTrigger
                className={cn(errors.category_id && 'border-destructive')}
              >
                <SelectValue placeholder={t('menu.items.selectCategory')} />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.category_id && (
              <p className="text-sm text-destructive mt-0.5">{errors.category_id}</p>
            )}
          </div>

          {/* Name */}
          <div className="grid gap-2.5">
            <div className="flex items-baseline gap-1.5">
              <Label htmlFor="name" className="text-sm font-medium">
                {t('menu.items.name')}
              </Label>
              <span className="text-destructive text-sm">*</span>
            </div>
            <Input
              id="name"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                if (errors.name) {
                  setErrors({ ...errors, name: undefined })
                }
              }}
              placeholder={t('menu.items.namePlaceholder')}
              className={errors.name ? 'border-destructive' : ''}
            />
            {errors.name && (
              <p className="text-sm text-destructive mt-0.5">{errors.name}</p>
            )}
          </div>

          {/* Description */}
          <div className="grid gap-2.5">
            <Label htmlFor="description" className="text-sm font-medium">
              {t('menu.items.description')}
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('menu.items.descriptionPlaceholder')}
              rows={3}
            />
          </div>

          {/* Price */}
          <div className="grid gap-2.5">
            <div className="flex items-baseline gap-1.5">
              <Label htmlFor="price" className="text-sm font-medium">
                {t('menu.items.price')}
              </Label>
              <span className="text-destructive text-sm">*</span>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                $
              </span>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => {
                  setPrice(e.target.value)
                  if (errors.price) {
                    setErrors({ ...errors, price: undefined })
                  }
                }}
                placeholder="0.00"
                className={cn('pl-7', errors.price && 'border-destructive')}
              />
            </div>
            {errors.price && (
              <p className="text-sm text-destructive mt-0.5">{errors.price}</p>
            )}
          </div>

          {/* Image URL */}
          <div className="grid gap-2.5">
            <Label htmlFor="imageUrl" className="text-sm font-medium">
              {t('menu.items.imageUrl')}
            </Label>
            <Input
              id="imageUrl"
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder={t('menu.items.imageUrlPlaceholder')}
            />
            {imageUrl && (
              <div className="mt-2">
                <img
                  src={imageUrl}
                  alt="Preview"
                  className="h-24 w-24 rounded border object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
              </div>
            )}
          </div>

          {/* Video Reference */}
          <div className="grid gap-2.5">
            <Label htmlFor="videoRef" className="text-sm font-medium">
              {t('menu.items.videoRef')}
            </Label>
            <Input
              id="videoRef"
              value={videoRef}
              onChange={(e) => setVideoRef(e.target.value)}
              placeholder={t('menu.items.videoRefPlaceholder')}
            />
          </div>

          {/* Dietary Tags */}
          <div className="grid gap-2.5">
            <Label htmlFor="newTagInput" className="text-sm font-medium">
              {t('menu.items.dietaryTags')}
            </Label>
            
            {/* Display existing tags */}
            {dietaryTags.length > 0 && (
              <DndContext
                sensors={tagSensors}
                collisionDetection={closestCenter}
                onDragEnd={handleTagDragEnd}
              >
                <SortableContext
                  items={dietaryTags}
                  strategy={rectSortingStrategy}
                >
                  <div className="flex flex-wrap gap-2 p-3 rounded-md border bg-muted/30 min-h-[60px]">
                    {dietaryTags.map((tag) => (
                      <SortableTag key={tag} tag={tag} onRemove={handleRemoveTag} />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}

            {/* Add new tag input */}
            <div className="flex gap-2">
              <Input
                id="newTagInput"
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value)}
                onKeyDown={handleTagInputKeyDown}
                placeholder={t('menu.items.dietaryTagsPlaceholder')}
                className="flex-1"
              />
              <Button
                type="button"
                onClick={handleAddTag}
                disabled={!newTagInput.trim() || dietaryTags.includes(newTagInput.trim())}
                size="icon"
                variant="outline"
              >
                <IconPlus className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap">
              {t('menu.items.dietaryTagsHelpPrefix')}
              <Kbd size="sm" className="h-4 px-1">X</Kbd>
              {t('menu.items.dietaryTagsHelpDelete')}
              {t('menu.items.dietaryTagsHelpOr')}
              <Kbd size="sm" className="h-4 px-1">Enter</Kbd>
              {t('menu.items.dietaryTagsHelpAdd')}
            </p>
          </div>

          {/* Availability Notes */}
          <div className="grid gap-2.5">
            <Label htmlFor="availabilityNotes" className="text-sm font-medium">
              {t('menu.items.availabilityNotes')}
            </Label>
            <Textarea
              id="availabilityNotes"
              value={availabilityNotes}
              onChange={(e) => setAvailabilityNotes(e.target.value)}
              placeholder={t('menu.items.availabilityNotesPlaceholder')}
              rows={2}
            />
          </div>

          {/* Visibility */}
          <div className="flex items-start gap-3">
            <div className="pt-0.5">
              <Checkbox
                id="visible"
                checked={visible}
                onCheckedChange={(checked) => setVisible(checked === true)}
              />
            </div>
            <div className="grid gap-1 flex-1">
              <Label
                htmlFor="visible"
                className="text-sm font-medium leading-normal cursor-pointer peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {t('menu.items.visible')}
              </Label>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {t('menu.items.visibleDescription')}
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? t('common.saving') : t('common.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

