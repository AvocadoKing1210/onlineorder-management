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
import { FileUpload } from '@/components/ui/file-upload'
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command'
import { useTranslation } from '@/components/i18n-text'
import {
  type MenuItem,
  type CreateMenuItemData,
  type UpdateMenuItemData,
  getMenuItemModifierGroups,
  setMenuItemModifierGroups,
  getAllDietaryTags,
} from '@/lib/api/menu-items'
import { type MenuCategory, getMenuCategories } from '@/lib/api/menu-categories'
import { type ModifierGroup, getModifierGroups } from '@/lib/api/menu-modifier-groups'
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
import { IconGripVertical, IconX, IconPlus, IconSettings, IconPhoto, IconVideo, IconTags, IconClock, IconDotsCircleHorizontal } from '@tabler/icons-react'
import { useIsMobile } from '@/hooks/use-mobile'
import { Separator } from '@/components/ui/separator'

interface MenuItemDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item?: MenuItem | null
  onSave: (data: CreateMenuItemData | UpdateMenuItemData) => Promise<MenuItem | void>
}

interface SortableTagProps {
  tag: string
  onRemove: (tag: string) => void
}

function SortableTag({ tag, onRemove }: SortableTagProps) {
  const isMobile = useIsMobile()
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: tag, disabled: isMobile })

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
        "inline-flex items-center gap-1 px-2 py-1 rounded-md bg-secondary text-secondary-foreground border",
        isMobile ? "text-xs" : "text-sm",
        isDragging && "cursor-grabbing"
      )}
    >
      {!isMobile && (
        <button
          {...attributes}
          {...listeners}
          type="button"
          className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
          aria-label="Drag to reorder"
        >
          <IconGripVertical className="h-3 w-3" />
        </button>
      )}
      <span>{tag}</span>
      <button
        type="button"
        onClick={() => onRemove(tag)}
        className="ml-0.5 hover:bg-destructive/20 rounded p-0.5 transition-colors"
        aria-label={`Remove ${tag}`}
      >
        <IconX className={cn("text-muted-foreground hover:text-destructive", isMobile ? "h-3 w-3" : "h-3.5 w-3.5")} />
      </button>
    </div>
  )
}

type MenuItemCategory = 'general' | 'image' | 'video' | 'tags' | 'availability' | 'modifiers'

interface CategoryConfig {
  id: MenuItemCategory
  label: string
  icon: React.ComponentType<{ className?: string }>
}

export function MenuItemDialog({
  open,
  onOpenChange,
  item,
  onSave,
}: MenuItemDialogProps) {
  const { t } = useTranslation()
  const isMobile = useIsMobile()
  const isEditing = !!item
  const [selectedCategory, setSelectedCategory] = useState<MenuItemCategory>('general')

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
  const [modifierGroups, setModifierGroups] = useState<ModifierGroup[]>([])
  const [selectedModifierGroupIds, setSelectedModifierGroupIds] = useState<string[]>([])
  const [availableTags, setAvailableTags] = useState<string[]>([])
  const [tagInputOpen, setTagInputOpen] = useState(false)
  const [showDiscardDialog, setShowDiscardDialog] = useState(false)
  
  // Store original form values to detect changes
  const [originalValues, setOriginalValues] = useState<{
    name: string
    description: string
    price: string
    category_id: string
    image_url: string
    video_ref: string
    dietary_tags: string[]
    availability_notes: string
    visible: boolean
    modifier_group_ids: string[]
  } | null>(null)

  // Category configuration
  const getCategories = (): CategoryConfig[] => [
    {
      id: 'general',
      label: t('menu.items.categories.general'),
      icon: IconSettings,
    },
    {
      id: 'image',
      label: t('menu.items.categories.image'),
      icon: IconPhoto,
    },
    {
      id: 'video',
      label: t('menu.items.categories.video'),
      icon: IconVideo,
    },
    {
      id: 'tags',
      label: t('menu.items.categories.tags'),
      icon: IconTags,
    },
    {
      id: 'availability',
      label: t('menu.items.categories.availability'),
      icon: IconClock,
    },
    {
      id: 'modifiers',
      label: t('menu.items.categories.modifiers'),
      icon: IconDotsCircleHorizontal,
    },
  ]

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
      if (newTagInput.trim() && !dietaryTags.includes(newTagInput.trim())) {
        handleAddTag()
        setTagInputOpen(false)
      }
    } else if (e.key === 'Escape') {
      setTagInputOpen(false)
    }
  }

  // Load categories, modifier groups, and available tags
  useEffect(() => {
    if (open) {
      Promise.all([
        getMenuCategories(),
        getModifierGroups(),
        getAllDietaryTags(),
      ])
        .then(([categoriesData, groupsData, tagsData]) => {
          setCategories(categoriesData)
          setModifierGroups(groupsData)
          setAvailableTags(tagsData)
        })
        .catch((error) => {
          console.error('Error loading data:', error)
        })
    }
  }, [open])

  // Load associated modifier groups when editing
  useEffect(() => {
    if (open && item?.id) {
      getMenuItemModifierGroups(item.id)
        .then((ids) => {
          setSelectedModifierGroupIds(ids)
          // Update original values once modifier groups are loaded
          setOriginalValues(prev => {
            if (!prev) return null
            return {
              ...prev,
              modifier_group_ids: ids,
            }
          })
        })
        .catch((error) => {
          console.error('Error loading modifier groups:', error)
        })
    } else if (open && !item) {
      setSelectedModifierGroupIds([])
    }
  }, [open, item?.id])

  // Reset form when dialog opens/closes or item changes
  useEffect(() => {
    if (open) {
      // Reset to general category when dialog opens
      setSelectedCategory('general')
      
      if (item) {
        const nameValue = item.name
        const descriptionValue = item.description || ''
        const priceValue = item.price || ''
        const categoryIdValue = item.category_id
        let imageUrlValue = ''
        // Handle image_url - could be JSON array string or single URL string
        if (item.image_url) {
          try {
            const parsed = JSON.parse(item.image_url)
            // If it's an array, keep as JSON string; if single value, keep as string
            imageUrlValue = Array.isArray(parsed) ? item.image_url : item.image_url
          } catch {
            // Not JSON, treat as single URL string
            imageUrlValue = item.image_url
          }
        }
        const videoRefValue = item.video_ref || ''
        const dietaryTagsValue = item.dietary_tags || []
        const availabilityNotesValue = item.availability_notes || ''
        const visibleValue = item.visible
        
        setName(nameValue)
        setDescription(descriptionValue)
        setPrice(priceValue)
        setCategoryId(categoryIdValue)
        setImageUrl(imageUrlValue)
        setVideoRef(videoRefValue)
        setDietaryTags(dietaryTagsValue)
        setAvailabilityNotes(availabilityNotesValue)
        setVisible(visibleValue)
        
        // Store original values for change detection
        setOriginalValues({
          name: nameValue,
          description: descriptionValue,
          price: priceValue,
          category_id: categoryIdValue,
          image_url: imageUrlValue,
          video_ref: videoRefValue,
          dietary_tags: dietaryTagsValue,
          availability_notes: availabilityNotesValue,
          visible: visibleValue,
          modifier_group_ids: [], // Will be set after loading
        })
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
        
        // Store original values for new item (all empty)
        setOriginalValues({
          name: '',
          description: '',
          price: '',
          category_id: '',
          image_url: '',
          video_ref: '',
          dietary_tags: [],
          availability_notes: '',
          visible: true,
          modifier_group_ids: [],
        })
      }
      setErrors({})
    } else {
      // Reset when dialog closes
      setOriginalValues(null)
      setShowDiscardDialog(false)
    }
  }, [open, item])

  // Check if form has unsaved changes
  const hasUnsavedChanges = (): boolean => {
    if (!originalValues) return false
    
    // Compare arrays by converting to sorted strings
    const arraysEqual = (a: string[], b: string[]): boolean => {
      if (a.length !== b.length) return false
      const sortedA = [...a].sort()
      const sortedB = [...b].sort()
      return sortedA.every((val, idx) => val === sortedB[idx])
    }
    
    return (
      name.trim() !== originalValues.name.trim() ||
      (description || '').trim() !== originalValues.description.trim() ||
      price !== originalValues.price ||
      categoryId !== originalValues.category_id ||
      imageUrl !== originalValues.image_url ||
      videoRef !== originalValues.video_ref ||
      !arraysEqual(dietaryTags, originalValues.dietary_tags) ||
      (availabilityNotes || '').trim() !== originalValues.availability_notes.trim() ||
      visible !== originalValues.visible ||
      !arraysEqual(selectedModifierGroupIds, originalValues.modifier_group_ids)
    )
  }

  // Handle dialog close with unsaved changes check
  const handleDialogClose = (newOpen: boolean) => {
    // When newOpen is false, user wants to close the dialog
    if (!newOpen) {
      if (hasUnsavedChanges()) {
        // Prevent closing and show confirmation dialog
        setShowDiscardDialog(true)
        // Don't call onOpenChange(false) - keep dialog open
      } else {
        // No unsaved changes, close normally
        onOpenChange(false)
      }
    } else {
      // Dialog is opening
      onOpenChange(true)
    }
  }
  
  // Handle discard confirmation
  const handleDiscard = () => {
    setShowDiscardDialog(false)
    onOpenChange(false)
  }
  
  // Handle cancel discard (keep editing)
  const handleKeepEditing = () => {
    setShowDiscardDialog(false)
  }

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

      const savedItem = await onSave(data)
      
      // Save modifier group associations if we have an item ID
      if (savedItem?.id || item?.id) {
        const itemId = savedItem?.id || item?.id
        if (itemId) {
          await setMenuItemModifierGroups(itemId, selectedModifierGroupIds)
        }
      }
      
      // Update original values after successful save
      setOriginalValues({
        name: name.trim(),
        description: description.trim() || '',
        price: price,
        category_id: categoryId,
        image_url: imageUrl,
        video_ref: videoRef,
        dietary_tags: dietaryTags,
        availability_notes: availabilityNotes.trim() || '',
        visible,
        modifier_group_ids: selectedModifierGroupIds,
      })
      
      onOpenChange(false)
    } catch (error) {
      // Error handling is done in parent component
      console.error('Error saving item:', error)
    } finally {
      setIsSaving(false)
    }
  }

  // Render functions for each category
  const renderGeneral = () => (
    <div className="space-y-6">
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

      <Separator />

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

      <Separator />

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

      <Separator />

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

      <Separator />

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
  )

  const renderImage = () => (
    <div className="space-y-6">
      <FileUpload
        value={imageUrl || null}
        onChange={(url) => {
          // Store as JSON string if array, otherwise as string
          if (Array.isArray(url)) {
            setImageUrl(JSON.stringify(url))
          } else if (url) {
            setImageUrl(url)
          } else {
            setImageUrl('')
          }
        }}
        type="image"
        folder="image"
        maxSize={5}
        label={t('menu.items.imageUrl')}
        labelId="imageUpload"
        multiple={true}
      />
    </div>
  )

  const renderVideo = () => (
    <div className="space-y-6">
      <FileUpload
        value={videoRef || null}
        onChange={(url) => {
          // Video is always a single string, not an array
          const videoUrl = Array.isArray(url) ? url[0] : url
          setVideoRef(videoUrl || '')
        }}
        type="video"
        folder="video"
        maxSize={100}
        label={t('menu.items.videoRef')}
        labelId="videoUpload"
      />
    </div>
  )

  const renderTags = () => (
    <div className="space-y-6">
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

        {/* Add new tag input with autocomplete */}
        <div className="flex gap-2 relative">
          <div className="flex-1 relative">
            <Input
              id="newTagInput"
              value={newTagInput}
              onChange={(e) => {
                setNewTagInput(e.target.value)
                if (e.target.value.trim()) {
                  setTagInputOpen(true)
                } else {
                  setTagInputOpen(false)
                }
              }}
              onKeyDown={handleTagInputKeyDown}
              onFocus={() => {
                if (newTagInput.trim()) {
                  setTagInputOpen(true)
                }
              }}
              onBlur={() => {
                // Delay closing to allow clicking on suggestions
                setTimeout(() => {
                  if (!document.activeElement?.closest('[role="option"]')) {
                    setTagInputOpen(false)
                  }
                }, 200)
              }}
              placeholder={t('menu.items.dietaryTagsPlaceholder')}
              className="w-full"
            />
            {tagInputOpen && newTagInput.trim() && (
              <div 
                className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-md max-h-[200px] overflow-auto"
                onMouseDown={(e) => e.preventDefault()}
              >
                <Command shouldFilter={false}>
                  <CommandList>
                    <CommandEmpty>
                      {newTagInput.trim() 
                        ? t('menu.items.noMatchingTags')
                        : t('menu.items.startTypingToSearch')}
                    </CommandEmpty>
                    <CommandGroup>
                      {availableTags
                        .filter((tag) => {
                          const searchTerm = newTagInput.trim().toLowerCase()
                          if (!searchTerm) return false
                          const tagLower = tag.toLowerCase()
                          return tagLower.includes(searchTerm) && !dietaryTags.includes(tag)
                        })
                        .slice(0, 10)
                        .map((tag) => (
                          <CommandItem
                            key={tag}
                            value={tag}
                            onSelect={() => {
                              if (!dietaryTags.includes(tag)) {
                                setDietaryTags([...dietaryTags, tag])
                                setNewTagInput('')
                                setTagInputOpen(false)
                              }
                            }}
                            className="cursor-pointer"
                          >
                            {tag}
                          </CommandItem>
                        ))}
                      {newTagInput.trim() && 
                       !availableTags.some(tag => tag.toLowerCase() === newTagInput.trim().toLowerCase()) &&
                       !dietaryTags.includes(newTagInput.trim()) && (
                        <CommandItem
                          value={newTagInput.trim()}
                          onSelect={() => {
                            handleAddTag()
                            setTagInputOpen(false)
                          }}
                          className="text-muted-foreground cursor-pointer"
                        >
                          <IconPlus className="mr-2 h-4 w-4" />
                          {t('menu.items.createTag', { tag: newTagInput.trim() })}
                        </CommandItem>
                      )}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </div>
            )}
          </div>
          <Button
            type="button"
            onClick={() => {
              handleAddTag()
              setTagInputOpen(false)
            }}
            disabled={!newTagInput.trim() || dietaryTags.includes(newTagInput.trim())}
            size="icon"
            variant="outline"
          >
            <IconPlus className="h-4 w-4" />
          </Button>
        </div>
        <p className={cn(
          "text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap",
          isMobile && "hidden"
        )}>
          {t('menu.items.dietaryTagsHelpPrefix')}
          <Kbd size="sm" className="h-4 px-1">X</Kbd>
          {t('menu.items.dietaryTagsHelpDelete')}
          {t('menu.items.dietaryTagsHelpOr')}
          <Kbd size="sm" className="h-4 px-1">Enter</Kbd>
          {t('menu.items.dietaryTagsHelpAdd')}
        </p>
      </div>
    </div>
  )

  const renderAvailability = () => (
    <div className="space-y-6">
      <div className="grid gap-2.5">
        <Label htmlFor="availabilityNotes" className="text-sm font-medium">
          {t('menu.items.availabilityNotes')}
        </Label>
        <Textarea
          id="availabilityNotes"
          value={availabilityNotes}
          onChange={(e) => setAvailabilityNotes(e.target.value)}
          placeholder={t('menu.items.availabilityNotesPlaceholder')}
          rows={4}
        />
      </div>
    </div>
  )

  const renderModifiers = () => (
    <div className="space-y-6">
      <div className="grid gap-2.5">
        <Label className="text-sm font-medium">
          {t('menu.items.modifiers')}
        </Label>
        <p className="text-xs text-muted-foreground mb-4">
          {t('menu.items.modifiersDescription')}
        </p>
        {modifierGroups.length === 0 ? (
          <div className="text-sm text-muted-foreground py-4 text-center border rounded-lg">
            {t('menu.items.noModifierGroups')}
          </div>
        ) : (
          <div className="space-y-3">
            {modifierGroups.map((group) => (
              <div
                key={group.id}
                className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <div className="pt-0.5">
                  <Checkbox
                    id={`modifier-group-${group.id}`}
                    checked={selectedModifierGroupIds.includes(group.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedModifierGroupIds([...selectedModifierGroupIds, group.id])
                      } else {
                        setSelectedModifierGroupIds(
                          selectedModifierGroupIds.filter((id) => id !== group.id)
                        )
                      }
                    }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <Label
                    htmlFor={`modifier-group-${group.id}`}
                    className="text-sm font-medium leading-normal cursor-pointer"
                  >
                    {group.name}
                  </Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-xs font-normal">
                      {group.option_count || 0} {t('menu.items.options')}
                    </Badge>
                    {group.required && (
                      <Badge variant="outline" className="text-xs font-normal">
                        {t('menu.items.required')}
                      </Badge>
                    )}
                    {!group.visible && (
                      <Badge variant="secondary" className="text-xs font-normal">
                        {t('menu.items.hidden')}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {group.min_select === group.max_select
                      ? group.min_select === 1
                        ? t('menu.items.selectExactlyOne')
                        : t('menu.items.selectExactly', { count: group.min_select })
                      : group.min_select === 0
                      ? t('menu.items.selectUpTo', { count: group.max_select })
                      : t('menu.items.selectRange', { min: group.min_select, max: group.max_select })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )

  const renderContent = () => {
    switch (selectedCategory) {
      case 'general':
        return renderGeneral()
      case 'image':
        return renderImage()
      case 'video':
        return renderVideo()
      case 'tags':
        return renderTags()
      case 'availability':
        return renderAvailability()
      case 'modifiers':
        return renderModifiers()
      default:
        return null
    }
  }

  return (
    <>
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogContent 
        className="max-w-5xl h-[80vh] p-0 flex flex-col overflow-hidden sm:max-w-5xl max-w-[calc(100%-3rem)] sm:h-[72vh]"
        onInteractOutside={(e) => {
          if (hasUnsavedChanges()) {
            e.preventDefault()
            setShowDiscardDialog(true)
          }
        }}
        onEscapeKeyDown={(e) => {
          if (hasUnsavedChanges()) {
            e.preventDefault()
            setShowDiscardDialog(true)
          }
        }}
      >
        <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-4 border-b">
          <DialogTitle className="text-lg sm:text-xl">
            {isEditing ? t('menu.items.editItem') : t('menu.items.createItem')}
          </DialogTitle>
          <DialogDescription>
            {isEditing ? t('menu.items.editItemDescription') : t('menu.items.createItemDescription')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col sm:flex-row flex-1 overflow-hidden">
          {/* Side Navigation */}
          <div className="w-full sm:w-64 border-b sm:border-b-0 sm:border-r bg-muted/30 flex-shrink-0 overflow-x-auto sm:overflow-y-auto">
            <nav className="p-3 sm:p-4 flex sm:flex-col gap-1 sm:space-y-1">
              {getCategories().map((category) => {
                const Icon = category.icon
                const isActive = selectedCategory === category.id
                return (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap",
                      isActive
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{category.label}</span>
                  </button>
                )
              })}
            </nav>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-4 sm:p-6">
              {renderContent()}
            </div>
          </div>
        </div>

        <DialogFooter className="px-4 sm:px-6 py-3 sm:py-4 border-t">
          <Button
            variant="outline"
            onClick={() => handleDialogClose(false)}
            disabled={isSaving}
            className="w-full sm:w-auto"
          >
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto">
            {isSaving ? t('common.saving') : t('common.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    
    {/* Discard Changes Confirmation Dialog */}
    <Dialog open={showDiscardDialog} onOpenChange={setShowDiscardDialog}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle>{t('menu.items.unsavedChanges')}</DialogTitle>
          <DialogDescription>
            {t('menu.items.unsavedChangesDescription')}
          </DialogDescription>
        </DialogHeader>
        <div className="px-4 pb-4 pt-2 flex flex-col sm:flex-row justify-end gap-2">
          <Button
            onClick={handleDiscard}
            disabled={isSaving}
            variant="outline"
            className="w-full sm:w-auto bg-background text-foreground border-border hover:bg-muted"
          >
            {t('menu.items.discardChanges')}
          </Button>
          <Button
            onClick={handleKeepEditing}
            disabled={isSaving}
            className="w-full sm:w-auto bg-foreground text-background hover:bg-foreground/90"
          >
            {t('menu.items.keepEditing')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    </>
  )
}

