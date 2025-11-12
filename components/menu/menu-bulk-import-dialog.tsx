'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { useTranslation } from '@/components/i18n-text'
import { toast } from 'sonner'
import {
  processMenuImages,
  type ExtractedMenuItem,
  type BulkImportResponse,
  type MenuExtractionResult,
} from '@/lib/api/menu-bulk-import'
import {
  getMenuCategories,
  createMenuCategory,
  type MenuCategory,
} from '@/lib/api/menu-categories'
import {
  createMenuItem,
  getNextPosition,
  type CreateMenuItemData,
} from '@/lib/api/menu-items'
import { IconUpload, IconLoader2, IconX } from '@tabler/icons-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import {
  Dropzone,
  DropzoneContent,
  DropzoneEmptyState,
} from '@/components/ui/shadcn-io/dropzone'

interface MenuBulkImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImportComplete: () => void
}

interface ProcessedItem extends ExtractedMenuItem {
  selected: boolean
  categoryId?: string
  imageUrl?: string
  parsedPrice: number
}

export function MenuBulkImportDialog({
  open,
  onOpenChange,
  onImportComplete,
}: MenuBulkImportDialogProps) {
  const { t } = useTranslation()
  const [step, setStep] = useState<'upload' | 'categories' | 'review' | 'importing'>('upload')
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([])
  const [hoveredImageIndex, setHoveredImageIndex] = useState<number | null>(null)
  const imagePreviewUrlsRef = useRef<string[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [extractionResult, setExtractionResult] = useState<BulkImportResponse | null>(null)
  const [processedItems, setProcessedItems] = useState<ProcessedItem[]>([])
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [categoryMapping, setCategoryMapping] = useState<Record<string, string>>({})
  
  // Category management state
  interface ExtractedCategory {
    originalName: string
    editedName: string
    itemCount: number
    mappedToCategoryId?: string
    action: 'map' | 'create' | 'edit'
  }
  const [extractedCategories, setExtractedCategories] = useState<ExtractedCategory[]>([])
  const [isImporting, setIsImporting] = useState(false)
  const [isCreatingCategories, setIsCreatingCategories] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const [importingItemIndex, setImportingItemIndex] = useState<number | null>(null)
  const [expandedDescriptions, setExpandedDescriptions] = useState<Set<number>>(new Set())

  // Load categories on mount
  useEffect(() => {
    if (open) {
      loadCategories()
    }
  }, [open])

  const loadCategories = async () => {
    try {
      const data = await getMenuCategories()
      setCategories(data)
    } catch (error) {
      console.error('Error loading categories:', error)
      toast.error(t('menu.bulkImport.loadCategoriesFailed'))
    }
  }

  // Keep ref in sync with state
  useEffect(() => {
    imagePreviewUrlsRef.current = imagePreviewUrls
  }, [imagePreviewUrls])

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      // Clean up preview URLs before resetting
      imagePreviewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url))
      imagePreviewUrlsRef.current = []
      
      setStep('upload')
      setImageFiles([])
      setImagePreviewUrls([])
      setHoveredImageIndex(null)
      setExtractionResult(null)
      setProcessedItems([])
      setCategoryMapping({})
      setExtractedCategories([])
      setImportProgress(0)
      setExpandedDescriptions(new Set())
    }
  }, [open])

  // Clean up preview URLs on unmount
  useEffect(() => {
    return () => {
      imagePreviewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [])

  // Parse price string to number
  const parsePrice = (priceStr: string | undefined): number => {
    if (!priceStr || typeof priceStr !== 'string') {
      console.warn('Invalid price string:', priceStr)
      return 0
    }
    
    // Remove currency symbols, whitespace, and common separators
    let cleaned = priceStr.replace(/[$,\s]/g, '')
    
    // Handle cases like "ROLL $8.99, HAND ROLL $6.99" - take the first price
    if (cleaned.includes(',')) {
      cleaned = cleaned.split(',')[0]
    }
    
    // Extract first number found (handles formats like "$8.99" or "8.99" or "ROLL $8.99")
    const numberMatch = cleaned.match(/(\d+\.?\d*)/)
    if (numberMatch) {
      cleaned = numberMatch[1]
    }
    
    const parsed = parseFloat(cleaned)
    if (isNaN(parsed) || parsed <= 0) {
      console.warn('Failed to parse price from:', priceStr, '->', cleaned, '->', parsed)
      return 0
    }
    
    return parsed
  }

  // Handle file drop from dropzone
  const handleDrop = (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return
    
    // Clean up previous preview URLs
    imagePreviewUrls.forEach((url) => URL.revokeObjectURL(url))
    
    // Create new preview URLs
    const urls = acceptedFiles.map((file) => URL.createObjectURL(file))
    
    setImageFiles(acceptedFiles)
    setImagePreviewUrls(urls)
  }

  // Remove image from list
  const handleRemoveImage = (index: number) => {
    const newFiles = imageFiles.filter((_, i) => i !== index)
    const newUrls = imagePreviewUrls.filter((_, i) => i !== index)
    
    // Revoke URL for removed image
    URL.revokeObjectURL(imagePreviewUrls[index])
    
    setImageFiles(newFiles)
    setImagePreviewUrls(newUrls)
  }

  // Process menu images
  const handleProcessImages = async () => {
    if (imageFiles.length === 0) {
      toast.error(t('menu.bulkImport.noImages'))
      return
    }

    setIsProcessing(true)
    try {
      // Process from files
      const result = await processMenuImages(imageFiles)

      console.log('Extraction result:', result)
      setExtractionResult(result)

      // Helper function to parse JSON from text field
      // Handles cases where JSON is incomplete or wrapped in text
      const parseJsonFromText = (text: string | undefined): MenuExtractionResult | null => {
        if (!text) return null
        
        console.log('Parsing JSON from text, text length:', text.length)
        
        try {
          // Try to parse the text directly first
          const parsed = JSON.parse(text)
          console.log('Direct parse succeeded, items count:', parsed?.items?.length)
          if (parsed && typeof parsed === 'object' && parsed.items && Array.isArray(parsed.items)) {
            console.log(`Successfully parsed ${parsed.items.length} items from direct JSON parse`)
            return parsed
          }
        } catch (e: any) {
          // If direct parsing fails, try to extract and fix the JSON
          console.log('Direct parse failed:', e.message, 'Attempting to extract JSON from text...')
        }
        
        // Extract JSON object from text (might be wrapped or have extra content)
        // Try to find the JSON object - it might start with { and contain "items"
        let jsonStr = text.trim()
        
        // Remove any leading/trailing whitespace or quotes
        if (jsonStr.startsWith('"') && jsonStr.endsWith('"')) {
          try {
            jsonStr = JSON.parse(jsonStr) // Unescape if it's a JSON string
          } catch {
            // Not a JSON string, continue
          }
        }
        
        // Try to find the JSON object
        const jsonMatch = jsonStr.match(/\{[\s\S]*"items"[\s\S]*\}/)
        if (!jsonMatch) {
          console.warn('No JSON object with "items" found in text')
          return null
        }
        
        jsonStr = jsonMatch[0]
        console.log('Extracted JSON string, length:', jsonStr.length)
        
        // Try to parse the extracted JSON
        try {
          const parsed = JSON.parse(jsonStr)
          console.log('Extracted JSON parse succeeded, items count:', parsed?.items?.length)
          if (parsed && typeof parsed === 'object' && parsed.items && Array.isArray(parsed.items)) {
            console.log(`Successfully parsed ${parsed.items.length} items from extracted JSON`)
            return parsed
          }
        } catch (parseError: any) {
          console.log('Extracted JSON parse failed:', parseError.message, 'Position:', parseError.message.match(/position (\d+)/)?.[1])
          console.log('JSON string preview (first 500 chars):', jsonStr.substring(0, 500))
          console.log('JSON string preview (last 500 chars):', jsonStr.substring(Math.max(0, jsonStr.length - 500)))
          
          // JSON is incomplete - try to extract complete items using a more robust approach
          // Find all item objects by matching the pattern: {"id":"...","name":"...",...}
          // Use a more flexible regex that handles nested quotes and escaped characters
          const items: ExtractedMenuItem[] = []
          
          // Method 1: Try to find complete items by matching from "id" to closing brace
          // This regex looks for {"id":"..." and finds the matching closing brace
          let searchIndex = 0
          const itemStartPattern = /\{"id"\s*:\s*"/g
          
          while (true) {
            const match = itemStartPattern.exec(jsonStr)
            if (!match) break
            
            const startPos = match.index
            let braceCount = 0
            let inString = false
            let escapeNext = false
            let endPos = -1
            
            for (let i = startPos; i < jsonStr.length; i++) {
              const char = jsonStr[i]
              
              if (escapeNext) {
                escapeNext = false
                continue
              }
              
              if (char === '\\') {
                escapeNext = true
                continue
              }
              
              if (char === '"') {
                inString = !inString
                continue
              }
              
              if (!inString) {
                if (char === '{') braceCount++
                if (char === '}') {
                  braceCount--
                  if (braceCount === 0) {
                    endPos = i + 1
                    break
                  }
                }
              }
            }
            
            if (endPos > startPos) {
              const itemStr = jsonStr.substring(startPos, endPos)
              try {
                const item = JSON.parse(itemStr)
                if (item && item.id && item.name && item.price) {
                  items.push(item)
                }
              } catch (itemError) {
                // Try regex extraction for this item
                const idMatch = itemStr.match(/"id"\s*:\s*"([^"]*)"/)
                const nameMatch = itemStr.match(/"name"\s*:\s*"([^"]*)"/)
                const descMatch = itemStr.match(/"description"\s*:\s*"([^"]*)"/)
                const priceMatch = itemStr.match(/"price"\s*:\s*"([^"]*)"/)
                const catMatch = itemStr.match(/"category"\s*:\s*"([^"]*)"/)
                const sectionMatch = itemStr.match(/"section"\s*:\s*"([^"]*)"/)
                
                if (idMatch && nameMatch && priceMatch) {
                  const extractedItem: ExtractedMenuItem = {
                    id: idMatch[1],
                    name: nameMatch[1],
                    description: descMatch?.[1] || '',
                    price: priceMatch[1], // Keep as string, will be parsed later
                    category: catMatch?.[1] || '',
                    section: sectionMatch?.[1] || '',
                  }
                  
                  // Validate that price exists
                  if (!extractedItem.price) {
                    console.warn(`Item ${extractedItem.id} (${extractedItem.name}) missing price in regex extraction`)
                  }
                  
                  items.push(extractedItem)
                } else {
                  console.warn('Failed to extract required fields from item:', {
                    hasId: !!idMatch,
                    hasName: !!nameMatch,
                    hasPrice: !!priceMatch,
                    itemStr: itemStr.substring(0, 200)
                  })
                }
              }
            }
          }
          
          if (items.length > 0) {
            console.log(`Successfully extracted ${items.length} items using brace-matching method`)
            return { items }
          }
          
          console.warn('Failed to extract any items using brace-matching method')
        }
        
        return null
      }

      // Extract items from result
      const allItems: ExtractedMenuItem[] = []
      
      if (result.results && result.results.length > 0) {
        // Multiple images
        console.log('Processing multiple images, results count:', result.results.length)
        result.results.forEach((r, idx) => {
          console.log(`Result ${idx}:`, {
            hasJson: !!r.json,
            itemCount: r.json?.items?.length || 0,
            parseError: r.parse_error,
            hasText: !!r.text
          })
          
          // Try json first, then fallback to parsing text
          if (r.json?.items && Array.isArray(r.json.items)) {
            allItems.push(...r.json.items)
          } else if (r.text) {
            const parsed = parseJsonFromText(r.text)
            if (parsed?.items && Array.isArray(parsed.items)) {
              console.log(`Parsed ${parsed.items.length} items from text field for result ${idx}`)
              allItems.push(...parsed.items)
            }
          }
        })
      } else {
        // Single image - try json first, then fallback to parsing text
        if (result.json?.items && Array.isArray(result.json.items)) {
          console.log('Processing single image from json field, items count:', result.json.items.length)
          allItems.push(...result.json.items)
        } else if (result.text) {
          console.log('Attempting to parse items from text field...')
          console.log('Text field length:', result.text.length)
          console.log('Text field preview (first 200 chars):', result.text.substring(0, 200))
          console.log('Text field preview (last 200 chars):', result.text.substring(Math.max(0, result.text.length - 200)))
          
          const parsed = parseJsonFromText(result.text)
          if (parsed?.items && Array.isArray(parsed.items)) {
            console.log(`Successfully parsed ${parsed.items.length} items from text field`)
            console.log('First item:', parsed.items[0])
            console.log('Last item:', parsed.items[parsed.items.length - 1])
            console.log('All item IDs:', parsed.items.map(i => i.id).join(', '))
            allItems.push(...parsed.items)
          } else {
            console.warn('Failed to parse items from text field')
            console.warn('Parsed result:', parsed)
          }
        }
      }
      
      console.log('Total items collected before processing:', allItems.length)
      console.log('Item IDs collected:', allItems.map(i => i.id).join(', '))

      // If still no items, show error
      if (allItems.length === 0) {
        console.warn('No items found in result. Result structure:', {
          hasResults: !!result.results,
          hasJson: !!result.json,
          jsonItems: result.json?.items,
          text: result.text?.substring(0, 200),
          parseError: result.parse_error
        })
        
        if (result.parse_error) {
          toast.error(`Failed to parse menu items: ${result.parse_error}. Attempting to extract from raw text...`)
          // Try one more time with a more aggressive parsing approach
          if (result.text) {
            const parsed = parseJsonFromText(result.text)
            if (parsed?.items && parsed.items.length > 0) {
              allItems.push(...parsed.items)
              toast.success(`Extracted ${parsed.items.length} items from raw text despite parse error`)
            }
          }
          
          if (allItems.length === 0) {
            setIsProcessing(false)
            return
          }
        } else {
          toast.error('No menu items found in the images. Please try different images.')
          setIsProcessing(false)
          return
        }
      }

      console.log('Total items extracted:', allItems.length)
      console.log('All extracted item IDs:', allItems.map(i => i.id).join(', '))

      // Process items: parse prices, set defaults, and validate
      const processed: ProcessedItem[] = allItems
        .map((item, idx) => {
          const parsedPrice = parsePrice(item.price)
          
          // Log items with missing or invalid prices
          if (!item.price || parsedPrice === 0) {
            console.warn(`Item ${item.id || idx} (${item.name}) has invalid price:`, item.price)
          }
          
          const parsed = {
            ...item,
            selected: true,
            parsedPrice: parsedPrice,
          }
          
          if (idx < 5 || idx >= allItems.length - 5) {
            console.log(`Processed item ${idx}:`, {
              id: parsed.id,
              name: parsed.name,
              price: item.price,
              parsedPrice: parsed.parsedPrice
            })
          }
          return parsed
        })
        .filter((item) => {
          // Filter out items without valid prices (but log them)
          if (item.parsedPrice === 0) {
            console.warn(`Filtering out item ${item.id || item.name} - no valid price`)
            return false
          }
          return true
        })

      console.log('Processed items count (after price validation):', processed.length)
      console.log('Processed item IDs:', processed.map(i => i.id).join(', '))
      console.log('Items with prices:', processed.map(i => `${i.id}: $${i.parsedPrice.toFixed(2)}`).join(', '))
      
      // Debug: Check first few items to ensure prices are present
      if (processed.length > 0) {
        console.log('Sample processed items (first 3):', processed.slice(0, 3).map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          parsedPrice: item.parsedPrice
        })))
      }

      // Auto-map categories with improved matching
      const mapping: Record<string, string> = {}
      const uniqueCategories = new Set<string>()
      const categoryStats: Record<string, { count: number; items: string[] }> = {}
      
      // Collect all unique categories and their stats
      processed.forEach((item) => {
        const catName = item.category || item.section
        if (catName) {
          uniqueCategories.add(catName)
          if (!categoryStats[catName]) {
            categoryStats[catName] = { count: 0, items: [] }
          }
          categoryStats[catName].count++
          categoryStats[catName].items.push(item.name)
        }
      })

      console.log('📊 Category Analysis:')
      console.log('Unique categories extracted:', Array.from(uniqueCategories))
      console.log('Category statistics:', categoryStats)

      // Improved category matching with multiple strategies
      uniqueCategories.forEach((extractedCatName) => {
        // Strategy 1: Exact match (case-insensitive)
        let existing = categories.find(
          (c) => c.name.toLowerCase() === extractedCatName.toLowerCase()
        )
        
        // Strategy 2: Partial match (if exact fails)
        if (!existing) {
          const extractedLower = extractedCatName.toLowerCase()
          existing = categories.find((c) => {
            const catLower = c.name.toLowerCase()
            // Check if extracted category contains existing category name or vice versa
            return catLower.includes(extractedLower) || extractedLower.includes(catLower)
          })
        }
        
        // Strategy 3: Fuzzy match for common variations
        if (!existing) {
          const normalizedExtracted = extractedCatName.toLowerCase().replace(/[^a-z0-9]/g, '')
          existing = categories.find((c) => {
            const normalizedExisting = c.name.toLowerCase().replace(/[^a-z0-9]/g, '')
            return normalizedExtracted === normalizedExisting
          })
        }
        
        // Strategy 4: Common category name mappings
        if (!existing) {
          const categoryMappings: Record<string, string[]> = {
            'appetizer': ['appetizers', 'appetiser', 'appetisers', 'starter', 'starters'],
            'entry': ['entries', 'main', 'mains', 'main course', 'entree', 'entrees'],
            'beverage': ['beverages', 'drink', 'drinks', 'beverage'],
            'dessert': ['desserts', 'sweet', 'sweets'],
          }
          
          for (const [standardName, variations] of Object.entries(categoryMappings)) {
            if (variations.some(v => extractedCatName.toLowerCase().includes(v.toLowerCase()))) {
              existing = categories.find(c => c.name.toLowerCase() === standardName.toLowerCase())
              if (existing) break
            }
          }
        }
        
        if (existing) {
          mapping[extractedCatName] = existing.id
          console.log(`✅ Mapped extracted category "${extractedCatName}" → existing category "${existing.name}" (${categoryStats[extractedCatName].count} items)`)
        } else {
          console.log(`⚠️  No match found for extracted category "${extractedCatName}" (${categoryStats[extractedCatName].count} items)`)
          console.log(`   Items in this category:`, categoryStats[extractedCatName].items.slice(0, 5))
        }
      })

      // Auto-assign matched categories to items
      const processedWithCategories = processed.map((item) => {
        const catName = item.category || item.section
        const matchedCategoryId = catName ? mapping[catName] : undefined
        return {
          ...item,
          categoryId: matchedCategoryId,
        }
      })

      console.log(`📋 Auto-assigned categories: ${processedWithCategories.filter(i => i.categoryId).length} / ${processedWithCategories.length} items`)

      // Prepare extracted categories for management step
      const categoriesForManagement: ExtractedCategory[] = Array.from(uniqueCategories).map((catName) => {
        const stats = categoryStats[catName]
        const mappedId = mapping[catName]
        return {
          originalName: catName,
          editedName: catName,
          itemCount: stats.count,
          mappedToCategoryId: mappedId,
          action: mappedId ? 'map' : 'create' as 'map' | 'create' | 'edit',
        }
      })

      setCategoryMapping(mapping)
      setProcessedItems(processedWithCategories)
      setExtractedCategories(categoriesForManagement)
      setStep('categories')
      
      toast.success(`Successfully extracted ${processed.length} menu items`)
    } catch (error: any) {
      console.error('Error processing images:', error)
      toast.error(error.message || t('menu.bulkImport.processFailed'))
    } finally {
      setIsProcessing(false)
    }
  }

  // Category management functions
  const updateCategoryName = (index: number, newName: string) => {
    setExtractedCategories((prev) =>
      prev.map((cat, i) =>
        i === index ? { ...cat, editedName: newName, action: 'edit' as const } : cat
      )
    )
  }

  const updateCategoryMapping = (index: number, categoryId: string) => {
    setExtractedCategories((prev) =>
      prev.map((cat, i) =>
        i === index
          ? {
              ...cat,
              mappedToCategoryId: categoryId,
              action: categoryId ? 'map' : 'create' as const,
            }
          : cat
      )
    )
  }

  const bulkMapToCategory = (categoryId: string) => {
    setExtractedCategories((prev) =>
      prev.map((cat) => ({
        ...cat,
        mappedToCategoryId: categoryId,
        action: categoryId ? 'map' : 'create' as const,
      }))
    )
  }

  const handleCategoriesContinue = async () => {
    setIsCreatingCategories(true)
    try {
      // Create new categories in the database
      const newMapping: Record<string, string> = {}
      const categoriesToCreate = extractedCategories.filter(
        (cat) => !cat.mappedToCategoryId && (cat.editedName || cat.originalName)
      )

      // Create new categories
      for (const cat of categoriesToCreate) {
        const categoryName = cat.editedName || cat.originalName
        if (!categoryName.trim()) continue

        try {
          console.log(`Creating new category: "${categoryName}"`)
          const newCategory = await createMenuCategory({
            name: categoryName.trim(),
            visible: true,
          })
          
          // Add to categories list
          setCategories((prev) => [...prev, newCategory])
          
          // Update the extracted category with the new ID
          setExtractedCategories((prev) =>
            prev.map((c) =>
              c.originalName === cat.originalName
                ? { ...c, mappedToCategoryId: newCategory.id, action: 'create' as const }
                : c
            )
          )
          
          // Add to mapping
          newMapping[cat.originalName] = newCategory.id
          if (cat.editedName && cat.editedName !== cat.originalName) {
            newMapping[cat.editedName] = newCategory.id
          }
          
          console.log(`✅ Created category "${categoryName}" with ID: ${newCategory.id}`)
        } catch (error: any) {
          console.error(`Failed to create category "${categoryName}":`, error)
          toast.error(`Failed to create category "${categoryName}": ${error.message}`)
          // Continue with other categories even if one fails
        }
      }

      // Update mapping for categories that were mapped to existing ones
      extractedCategories.forEach((cat) => {
        if (cat.mappedToCategoryId) {
          const finalName = cat.editedName || cat.originalName
          // Map to existing category
          newMapping[cat.originalName] = cat.mappedToCategoryId
          // Also map the edited name if different
          if (cat.editedName && cat.editedName !== cat.originalName) {
            newMapping[cat.editedName] = cat.mappedToCategoryId
          }
        }
      })

      // Get the latest extracted categories state (with newly created IDs)
      const updatedExtractedCategories = extractedCategories.map((cat) => {
        // If we just created this category, use the new mapping
        const createdMapping = newMapping[cat.originalName]
        if (createdMapping) {
          return { ...cat, mappedToCategoryId: createdMapping }
        }
        return cat
      })

      // Update items with new category mappings
      const updatedItems = processedItems.map((item) => {
        const catName = item.category || item.section
        if (catName) {
          // Find the extracted category
          const extractedCat = updatedExtractedCategories.find(
            (ec) => ec.originalName === catName
          )
          if (extractedCat && extractedCat.mappedToCategoryId) {
            return { ...item, categoryId: extractedCat.mappedToCategoryId }
          }
        }
        return item
      })

      setCategoryMapping(newMapping)
      setProcessedItems(updatedItems)
      
      const createdCount = categoriesToCreate.length
      if (createdCount > 0) {
        toast.success(`Successfully created ${createdCount} new categor${createdCount === 1 ? 'y' : 'ies'}`)
      }
      
      setStep('review')
    } catch (error: any) {
      console.error('Error in category creation:', error)
      toast.error(`Failed to create categories: ${error.message}`)
    } finally {
      setIsCreatingCategories(false)
    }
  }

  // Toggle item selection
  const toggleItemSelection = (index: number) => {
    setProcessedItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, selected: !item.selected } : item
      )
    )
  }

  // Update category mapping for an item
  const updateItemCategory = (index: number, categoryId: string) => {
    setProcessedItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, categoryId } : item
      )
    )
  }

  // Create or get category ID
  // NOTE: Currently in DRY RUN mode - no database writes, only console.log
  const getOrCreateCategory = async (categoryName: string): Promise<string> => {
    // Check if already mapped
    if (categoryMapping[categoryName]) {
      console.log(`[DRY RUN] Using existing mapped category: "${categoryName}" -> ${categoryMapping[categoryName]}`)
      return categoryMapping[categoryName]
    }

    // Check if exists
    const existing = categories.find(
      (c) => c.name.toLowerCase() === categoryName.toLowerCase()
    )
    if (existing) {
      console.log(`[DRY RUN] Found existing category: "${categoryName}" -> ${existing.id}`)
      setCategoryMapping((prev) => ({ ...prev, [categoryName]: existing.id }))
      return existing.id
    }

    // Create new category (DRY RUN - not actually creating)
    try {
      console.log(`[DRY RUN] Would create new category: "${categoryName}"`)
      console.log(`[DRY RUN] Category data:`, {
        name: categoryName,
        visible: true,
      })
      
      // Simulate category creation with a mock ID
      const mockCategoryId = `mock-category-${categoryName.toLowerCase().replace(/\s+/g, '-')}`
      console.log(`[DRY RUN] Mock category ID generated: ${mockCategoryId}`)
      
      // In real mode, this would be:
      // const newCategory = await createMenuCategory({ name: categoryName, visible: true })
      // setCategories((prev) => [...prev, newCategory])
      // setCategoryMapping((prev) => ({ ...prev, [categoryName]: newCategory.id })
      // return newCategory.id
      
      setCategoryMapping((prev) => ({ ...prev, [categoryName]: mockCategoryId }))
      return mockCategoryId
    } catch (error) {
      console.error('[DRY RUN] Error in category creation (simulated):', error)
      throw error
    }
  }

  // Import selected items
  // NOTE: Currently in DRY RUN mode - no database writes, only console.log
  const handleImport = async () => {
    const selectedItems = processedItems.filter((item) => item.selected)
    
    console.log(`[DRY RUN] ========================================`)
    console.log(`[DRY RUN] Starting bulk import (DRY RUN MODE)`)
    console.log(`[DRY RUN] Selected items count: ${selectedItems.length}`)
    console.log(`[DRY RUN] ========================================`)
    
    if (selectedItems.length === 0) {
      toast.error(t('menu.bulkImport.noItemsSelected'))
      return
    }

    // Validate all items have categories
    const itemsWithoutCategories = selectedItems.filter(
      (item) => !item.categoryId && !item.category && !item.section
    )
    if (itemsWithoutCategories.length > 0) {
      toast.error(t('menu.bulkImport.itemsWithoutCategories'))
      return
    }

    setIsImporting(true)
    setImportProgress(0)
    setImportingItemIndex(null)

    try {
      let successCount = 0
      let errorCount = 0

      for (let i = 0; i < selectedItems.length; i++) {
        const item = selectedItems[i]
        // Find the index in processedItems
        const itemIndex = processedItems.findIndex((pi) => pi.name === item.name && pi.price === item.price)
        setImportingItemIndex(itemIndex >= 0 ? itemIndex : null)
        setImportProgress(((i + 1) / selectedItems.length) * 100)

        try {
          // Get or create category
          const categoryName = item.category || item.section || ''
          let categoryId = item.categoryId

          if (!categoryId && categoryName) {
            categoryId = await getOrCreateCategory(categoryName)
          }

          if (!categoryId) {
            errorCount++
            continue
          }

          // Validate price before creating
          if (!item.parsedPrice || item.parsedPrice <= 0) {
            console.error(`Item ${item.name} has invalid price: ${item.parsedPrice}`)
            errorCount++
            continue
          }

          // Create menu item (DRY RUN - not actually creating)
          const createData: CreateMenuItemData = {
            category_id: categoryId,
            name: item.name,
            description: item.description || null,
            price: item.parsedPrice,
            image_url: item.imageUrl || null,
            visible: true,
          }

          console.log(`[DRY RUN] Would create menu item:`, {
            name: item.name,
            price: `$${item.parsedPrice.toFixed(2)}`,
            category_id: categoryId,
            description: item.description || null,
            image_url: item.imageUrl || null,
            visible: true,
          })
          console.log(`[DRY RUN] Full create data:`, createData)
          
          // In real mode, this would be:
          // await createMenuItem(createData)
          
          successCount++
        } catch (error: any) {
          console.error(`Error importing item ${item.name}:`, error)
          errorCount++
        }
      }

      console.log(`[DRY RUN] ========================================`)
      console.log(`[DRY RUN] Import complete (DRY RUN MODE)`)
      console.log(`[DRY RUN] Success: ${successCount}, Errors: ${errorCount}`)
      console.log(`[DRY RUN] ========================================`)
      
      if (successCount > 0) {
        toast.success(
          `[DRY RUN] ${t('menu.bulkImport.importSuccess', { count: successCount })}`
        )
      }
      if (errorCount > 0) {
        toast.error(
          `[DRY RUN] ${t('menu.bulkImport.importErrors', { count: errorCount })}`
        )
      }

      // Note: onImportComplete() would normally reload the menu items list
      // In dry run mode, we skip this to avoid unnecessary database reads
      // onImportComplete()
      onOpenChange(false)
    } catch (error: any) {
      console.error('Error during import:', error)
      toast.error(error.message || t('menu.bulkImport.importFailed'))
    } finally {
      setIsImporting(false)
      setImportProgress(0)
    }
  }

  const selectedCount = processedItems.filter((item) => item.selected).length

  const toggleDescription = (index: number) => {
    setExpandedDescriptions((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(index)) {
        newSet.delete(index)
      } else {
        newSet.add(index)
      }
      return newSet
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-[95vw] w-[95vw] h-[90vh] p-0 flex flex-col overflow-hidden sm:max-w-[95vw] max-w-[calc(100%-2rem)]"
        style={{ maxWidth: '95vw', width: '95vw' }}
      >
        <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
          <DialogTitle>{t('menu.bulkImport.title')}</DialogTitle>
          <DialogDescription>
            {t('menu.bulkImport.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col min-h-0 px-6">
          {step === 'upload' && (
            <div className="flex-1 flex gap-4 py-4">
              {/* Dropzone Column */}
              <div className="flex-1 flex flex-col">
                <Dropzone
                  accept={{
                    'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
                  }}
                  maxFiles={20}
                  maxSize={10 * 1024 * 1024} // 10MB
                  onDrop={handleDrop}
                  src={imageFiles}
                  className="flex-1 h-full"
                >
                  <DropzoneEmptyState>
                    <div className="flex flex-col items-center justify-center">
                      <div className="flex size-12 items-center justify-center rounded-md bg-muted text-muted-foreground mb-3">
                        <IconUpload className="h-6 w-6" />
                      </div>
                      <p className="my-2 w-full truncate text-wrap font-medium text-sm">
                        {t('menu.bulkImport.uploadFiles')}
                      </p>
                      <p className="w-full truncate text-wrap text-muted-foreground text-xs">
                        {t('menu.bulkImport.uploadHint')}
                      </p>
                      <p className="text-wrap text-muted-foreground text-xs mt-1">
                        Accepts images up to 10MB
                      </p>
                    </div>
                  </DropzoneEmptyState>
                  <DropzoneContent>
                    <div className="flex flex-col items-center justify-center">
                      <div className="flex size-12 items-center justify-center rounded-md bg-muted text-muted-foreground mb-3">
                        <IconUpload className="h-6 w-6" />
                      </div>
                      <p className="my-2 w-full truncate font-medium text-sm">
                        {imageFiles.length} {imageFiles.length === 1 ? 'file' : 'files'} selected
                      </p>
                      <p className="w-full text-wrap text-muted-foreground text-xs">
                        Drag and drop or click to replace
                      </p>
                    </div>
                  </DropzoneContent>
                </Dropzone>
              </div>

              {/* Image List Column */}
              <div className="w-64 flex-shrink-0 flex flex-col border rounded-lg">
                <div className="px-3 py-2 border-b bg-muted/50">
                  <Label className="text-sm font-medium">
                    {t('menu.bulkImport.uploadedImages')} ({imageFiles.length})
                  </Label>
                </div>
                <ScrollArea className="flex-1">
                  {imageFiles.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      No images uploaded yet
                    </div>
                  ) : (
                    <div className="p-2 space-y-1">
                      {imageFiles.map((file, index) => (
                        <div
                          key={index}
                          className="relative group flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 transition-colors cursor-pointer"
                          onMouseEnter={() => setHoveredImageIndex(index)}
                          onMouseLeave={() => setHoveredImageIndex(null)}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{file.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {(file.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleRemoveImage(index)
                            }}
                          >
                            <IconX className="h-3 w-3" />
                          </Button>
                          
                          {/* Hover Preview */}
                          {hoveredImageIndex === index && imagePreviewUrls[index] && (
                            <div className="absolute left-full ml-2 top-0 z-50 pointer-events-none">
                              <div className="bg-background border rounded-lg shadow-xl p-2 w-64 max-h-[500px] overflow-hidden">
                                <img
                                  src={imagePreviewUrls[index]}
                                  alt={file.name}
                                  className="w-full h-auto rounded object-contain"
                                  style={{ maxHeight: '480px' }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </div>
          )}

          {step === 'categories' && (
            <div className="flex flex-col h-full min-h-0 py-4">
              <div className="mb-4">
                <h3 className="text-lg font-semibold mb-2">Manage Categories</h3>
                <p className="text-sm text-muted-foreground">
                  Review and edit the categories extracted from the images. Map them to existing categories or create new ones.
                </p>
              </div>

              {/* Bulk Actions */}
              <div className="mb-4 p-3 bg-muted/50 rounded-lg">
                <Label className="text-sm font-medium mb-2 block">Bulk Map All to Category:</Label>
                <Select
                  onValueChange={(value) => {
                    if (value === 'clear-all') {
                      bulkMapToCategory('')
                    } else {
                      bulkMapToCategory(value)
                    }
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select category to map all..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="clear-all">Clear all mappings</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator className="mb-4" />

              {/* Categories List */}
              <ScrollArea className="flex-1">
                <div className="space-y-3">
                  {extractedCategories.map((cat, index) => (
                    <div
                      key={index}
                      className="p-4 border rounded-lg space-y-3"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <Label className="text-sm font-medium min-w-[100px]">
                              Original Name:
                            </Label>
                            <Badge variant="outline">{cat.originalName}</Badge>
                            <span className="text-xs text-muted-foreground">
                              ({cat.itemCount} items)
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Label htmlFor={`cat-name-${index}`} className="text-sm font-medium min-w-[100px]">
                              Edit Name:
                            </Label>
                            <Input
                              id={`cat-name-${index}`}
                              value={cat.editedName}
                              onChange={(e) => updateCategoryName(index, e.target.value)}
                              className="flex-1"
                              placeholder="Category name"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <Label htmlFor={`cat-map-${index}`} className="text-sm font-medium min-w-[100px]">
                              Map to:
                            </Label>
                            <Select
                              value={cat.mappedToCategoryId || 'create-new'}
                              onValueChange={(value) => updateCategoryMapping(index, value === 'create-new' ? '' : value)}
                            >
                              <SelectTrigger id={`cat-map-${index}`} className="flex-1">
                                <SelectValue placeholder="Create new or map to existing..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="create-new">Create new category</SelectItem>
                                {categories.map((existingCat) => (
                                  <SelectItem key={existingCat.id} value={existingCat.id}>
                                    {existingCat.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {cat.mappedToCategoryId ? (
                            <Badge variant="default" className="bg-green-600">
                              Mapped
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-yellow-500/10 text-yellow-700 dark:text-yellow-400">
                              New
                            </Badge>
                          )}
                          {cat.action === 'edit' && (
                            <Badge variant="outline" className="text-xs">
                              Edited
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {step === 'review' && (
            <div className="flex flex-col h-full min-h-0">
              {processedItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 overflow-y-auto">
                  <p className="text-lg font-medium mb-2">No items extracted</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    The images were processed but no menu items were found.
                  </p>
                  {extractionResult && (
                    <div className="w-full max-w-2xl space-y-2">
                      {extractionResult.parse_error && (
                        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md">
                          <p className="text-sm font-medium text-destructive mb-1">Parse Error:</p>
                          <p className="text-xs text-muted-foreground">{extractionResult.parse_error}</p>
                        </div>
                      )}
                      {extractionResult.text && (
                        <div className="p-4 bg-muted rounded-md">
                          <p className="text-sm font-medium mb-2">Raw Extraction Text:</p>
                          <ScrollArea className="h-48">
                            <pre className="text-xs whitespace-pre-wrap">{extractionResult.text}</pre>
                          </ScrollArea>
                        </div>
                      )}
                    </div>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => setStep('upload')}
                    className="mt-4"
                  >
                    Try Again
                  </Button>
                </div>
              ) : (
                <>
              {/* Progress bar at top when importing */}
              {isImporting && (
                <div className="mb-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <IconLoader2 className="h-4 w-4 animate-spin text-primary" />
                      <p className="text-sm font-medium">
                        {t('menu.bulkImport.importing')}... {Math.round(importProgress)}%
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {selectedCount} items
                    </p>
                  </div>
                  <Progress value={importProgress} className="h-2" />
                </div>
              )}

              <div className="flex items-center justify-between py-4 flex-shrink-0">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {t('menu.bulkImport.reviewItems', {
                      total: processedItems.length,
                      selected: selectedCount,
                    })}
                  </p>
                </div>
                {!isImporting && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setProcessedItems((prev) =>
                          prev.map((item) => ({ ...item, selected: true }))
                        )
                      }}
                    >
                      {t('menu.bulkImport.selectAll')}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setProcessedItems((prev) =>
                          prev.map((item) => ({ ...item, selected: false }))
                        )
                      }}
                    >
                      {t('menu.bulkImport.deselectAll')}
                    </Button>
                  </div>
                )}
              </div>

              <Separator className="flex-shrink-0" />

              <div className="flex-1 min-h-0 overflow-auto">
                <Table className="w-full">
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead className="w-12 sticky left-0 bg-background z-20">
                        {!isImporting && (
                          <Checkbox
                            checked={
                              processedItems.length > 0 &&
                              processedItems.every((item) => item.selected)
                            }
                            onCheckedChange={(checked) => {
                              setProcessedItems((prev) =>
                                prev.map((item) => ({ ...item, selected: !!checked }))
                              )
                            }}
                          />
                        )}
                      </TableHead>
                      <TableHead className="min-w-[200px]">{t('menu.items.name')}</TableHead>
                      <TableHead className="min-w-[400px]">{t('menu.items.description')}</TableHead>
                      <TableHead className="min-w-[120px] whitespace-nowrap text-right">{t('menu.items.price')}</TableHead>
                      <TableHead className="min-w-[200px]">{t('menu.items.category')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {processedItems.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="sticky left-0 bg-background z-20">
                          {isImporting && importingItemIndex === index ? (
                            <IconLoader2 className="h-4 w-4 animate-spin text-primary" />
                          ) : !isImporting ? (
                            <Checkbox
                              checked={item.selected}
                              onCheckedChange={() => toggleItemSelection(index)}
                            />
                          ) : (
                            <div className="w-4 h-4" />
                          )}
                        </TableCell>
                        <TableCell className="font-medium min-w-[200px]">{item.name}</TableCell>
                        <TableCell className="min-w-[400px] max-w-[500px]">
                          {item.description ? (
                            <div
                              className={`cursor-pointer hover:text-primary transition-colors ${
                                expandedDescriptions.has(index) ? '' : 'truncate'
                              }`}
                              onClick={() => toggleDescription(index)}
                              title={expandedDescriptions.has(index) ? 'Click to collapse' : 'Click to expand'}
                            >
                              {item.description}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap min-w-[120px] font-medium text-right">
                          {item.parsedPrice > 0 ? (
                            <span className="text-foreground">${item.parsedPrice.toFixed(2)}</span>
                          ) : (
                            <span className="text-muted-foreground text-xs">No price</span>
                          )}
                        </TableCell>
                        <TableCell className="min-w-[200px]">
                          <Select
                            value={
                              item.categoryId ||
                              categoryMapping[item.category || item.section || ''] ||
                              ''
                            }
                            onValueChange={(value) => updateItemCategory(index, value)}
                          >
                            <SelectTrigger className="w-full min-w-[160px]">
                              <SelectValue placeholder={t('menu.items.selectCategory')} />
                            </SelectTrigger>
                            <SelectContent>
                              {categories.map((cat) => (
                                <SelectItem key={cat.id} value={cat.id}>
                                  {cat.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
              </>
              )}
            </div>
          )}

        </div>

        <DialogFooter className="px-6 pb-6 pt-4 border-t flex-shrink-0">
          {step === 'upload' && (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                {t('common.cancel')}
              </Button>
              <Button
                onClick={handleProcessImages}
                disabled={imageFiles.length === 0 || isProcessing}
              >
                {isProcessing ? (
                  <>
                    <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('menu.bulkImport.processing')}
                  </>
                ) : (
                  <>
                    <IconUpload className="mr-2 h-4 w-4" />
                    {t('menu.bulkImport.processImages')}
                  </>
                )}
              </Button>
            </>
          )}
          {step === 'categories' && (
            <>
              <Button
                variant="outline"
                onClick={() => setStep('upload')}
                disabled={isCreatingCategories}
              >
                {t('common.cancel')}
              </Button>
              <Button onClick={handleCategoriesContinue} disabled={isCreatingCategories}>
                {isCreatingCategories ? (
                  <>
                    <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Categories...
                  </>
                ) : (
                  'Continue to Review'
                )}
              </Button>
            </>
          )}
          {step === 'review' && (
            <>
              {!isImporting && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => setStep('categories')}
                  >
                    Back
                  </Button>
                  <Button onClick={handleImport} disabled={selectedCount === 0}>
                    {t('menu.bulkImport.importItems', { count: selectedCount })}
                  </Button>
                </>
              )}
              {isImporting && (
                <Button variant="outline" disabled>
                  <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('menu.bulkImport.importing')}...
                </Button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

