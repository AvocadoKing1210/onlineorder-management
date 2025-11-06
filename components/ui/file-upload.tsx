'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { IconUpload, IconX, IconPhoto, IconVideo } from '@tabler/icons-react'
import { useTranslation } from '@/components/i18n-text'
import { Badge } from '@/components/ui/badge'
import {
  type CarouselApi,
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel'
import { useIsMobile } from '@/hooks/use-mobile'

interface FileUploadProps {
  value?: string | string[] | null
  onChange: (url: string | string[] | null) => void
  accept?: string
  maxSize?: number // in MB
  label?: string
  labelId?: string
  folder?: 'image' | 'video'
  type: 'image' | 'video'
  className?: string
  multiple?: boolean // Only for images
}

export function FileUpload({
  value,
  onChange,
  accept,
  maxSize = 10,
  label,
  labelId,
  folder,
  type,
  className,
  multiple = false,
}: FileUploadProps) {
  const { t } = useTranslation()
  const isMobile = useIsMobile()
  const [isUploading, setIsUploading] = React.useState(false)
  const [uploadProgress, setUploadProgress] = React.useState(0)
  const [error, setError] = React.useState<string | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const dragCounter = React.useRef(0)
  const [api, setApi] = React.useState<CarouselApi>()
  const [current, setCurrent] = React.useState(0)
  
  // Normalize value to array for images when multiple is true, or single value
  const isMultiple = type === 'image' && multiple
  const imageUrls = React.useMemo(() => {
    if (!value) return []
    if (isMultiple) {
      // If it's a string, try to parse as JSON array, otherwise treat as single item
      if (typeof value === 'string') {
        try {
          const parsed = JSON.parse(value)
          return Array.isArray(parsed) ? parsed : [parsed].filter(Boolean)
        } catch {
          return [value].filter(Boolean)
        }
      }
      return Array.isArray(value) ? value : [value].filter(Boolean)
    }
    // Single image/video - return as array for consistency
    const singleValue = typeof value === 'string' ? value : (Array.isArray(value) ? value[0] : null)
    return singleValue ? [singleValue] : []
  }, [value, isMultiple])
  
  const preview = isMultiple ? imageUrls : (imageUrls[0] || null)

  // No longer needed - using imageUrls from useMemo

  React.useEffect(() => {
    if (!api) return

    const updateCurrent = () => {
      setCurrent(api.selectedScrollSnap())
    }

    api.on('select', updateCurrent)
    updateCurrent()

    return () => {
      api.off('select', updateCurrent)
    }
  }, [api])

  const validateFile = (file: File): string | null => {
    // Check file size
    const fileSizeMB = file.size / (1024 * 1024)
    if (fileSizeMB > maxSize) {
      return t('menu.items.uploadFileTooLarge', { maxSize: maxSize.toString() })
    }

    // Check file type
    if (type === 'image' && !file.type.startsWith('image/')) {
      return t('menu.items.uploadInvalidImageType')
    }
    if (type === 'video' && !file.type.startsWith('video/')) {
      return t('menu.items.uploadInvalidVideoType')
    }

    return null
  }

  const uploadFile = async (file: File) => {
    setIsUploading(true)
    setError(null)
    setUploadProgress(0)

    try {
      // Validate file
      const validationError = validateFile(file)
      if (validationError) {
        setError(validationError)
        setIsUploading(false)
        return
      }

      // Get pre-signed URL
      const response = await fetch('/api/upload/presigned-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
          folder: folder || type,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to get upload URL')
      }

      const { presignedUrl, publicUrl } = await response.json()

      // Upload file to R2
      // Note: Don't set Content-Type header - let the browser set it automatically
      // This avoids CORS issues with custom headers
      const uploadResponse = await fetch(presignedUrl, {
        method: 'PUT',
        body: file,
        // Explicitly omit Content-Type to let browser set it automatically
        // The pre-signed URL already includes Content-Type in the signature
      })

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload file')
      }

      // Update parent component
      if (isMultiple && type === 'image') {
        // Add to array
        const newUrls = [...imageUrls, publicUrl]
        onChange(newUrls)
      } else {
        // Single value (video or single image)
        onChange(publicUrl)
      }
      setUploadProgress(100)
    } catch (err: any) {
      console.error('Upload error:', err)
      setError(err.message || t('menu.items.uploadFailed'))
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    if (isMultiple) {
      // Upload multiple files sequentially
      const fileArray = Array.from(files)
      for (const file of fileArray) {
        await uploadFile(file)
      }
    } else {
      // Upload single file
      await uploadFile(files[0])
    }
    
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current++
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current--
    if (dragCounter.current === 0) {
      // Remove drag styling
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current = 0

    const files = e.dataTransfer.files
    if (!files || files.length === 0) return

    if (isMultiple) {
      // Upload multiple files sequentially
      const fileArray = Array.from(files)
      for (const file of fileArray) {
        await uploadFile(file)
      }
    } else {
      // Upload single file
      await uploadFile(files[0])
    }
  }

  const handleRemove = async (urlToRemove?: string) => {
    const targetUrl = urlToRemove || (isMultiple ? imageUrls[current] : preview)
    
    if (!targetUrl) return

    // Delete from R2
    try {
      const response = await fetch('/api/upload/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: targetUrl }),
      })

      if (!response.ok) {
        console.warn('Failed to delete file from R2, but continuing with removal')
      }
    } catch (err) {
      console.warn('Error deleting file from R2:', err)
    }

    // Update parent component
    if (isMultiple && type === 'image') {
      const newUrls = imageUrls.filter(url => url !== targetUrl)
      onChange(newUrls.length > 0 ? newUrls : null)
      // Reset to first image if current was removed
      if (current >= newUrls.length && newUrls.length > 0) {
        api?.scrollTo(0)
      }
    } else {
      onChange(null)
    }

    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  const defaultAccept = type === 'image' 
    ? 'image/jpeg,image/jpg,image/png,image/webp,image/gif'
    : 'video/mp4,video/webm,video/ogg'

  return (
    <div className={cn('grid gap-2.5', className)}>
      {label && (
        <div className="flex items-center gap-2">
          <Label htmlFor={labelId} className="text-sm font-medium">
            {label}
          </Label>
          {imageUrls.length > 0 && type === 'image' && (
            <Badge variant="secondary" className="text-xs">
              {isMultiple && imageUrls.length > 1 
                ? `${imageUrls.length} ${t('menu.items.images')}`
                : t('menu.items.currentImage')
              }
            </Badge>
          )}
        </div>
      )}
      
      <div className={cn(
        "grid gap-4",
        type === 'image' ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"
      )}>
        {/* Upload Area */}
        <div
          className={cn(
            'relative border-2 border-dashed rounded-lg p-4 md:p-6 transition-colors',
            type === 'image' ? 'aspect-square md:aspect-square' : '',
            isUploading
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 hover:border-muted-foreground/50',
            error && 'border-destructive'
          )}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={accept || defaultAccept}
            onChange={handleFileSelect}
            className="hidden"
            id={labelId}
            disabled={isUploading}
            multiple={isMultiple}
          />

          {isUploading ? (
            <div className="flex flex-col items-center justify-center gap-4 text-center h-full">
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <span className="text-sm text-muted-foreground">
                  {t('menu.items.uploading')}... {uploadProgress > 0 && `${uploadProgress}%`}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-4 text-center h-full">
              {type === 'image' ? (
                <IconPhoto className="h-12 w-12 text-muted-foreground" />
              ) : (
                <IconVideo className="h-12 w-12 text-muted-foreground" />
              )}
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  {t('menu.items.dragDropOrClick')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {type === 'image' 
                    ? t('menu.items.uploadImageHint', { maxSize: maxSize.toString() })
                    : t('menu.items.uploadVideoHint', { maxSize: maxSize.toString() })
                  }
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={handleClick}
                disabled={isUploading}
              >
                <IconUpload className="mr-2 h-4 w-4" />
                {isMultiple ? t('menu.items.selectFiles') : t('menu.items.selectFile')}
              </Button>
            </div>
          )}
        </div>

        {/* Preview Area - Always show for images, side-by-side on desktop */}
        {type === 'image' ? (
          imageUrls.length > 0 ? (
            <div className="relative w-full aspect-square">
              <Carousel 
                setApi={setApi} 
                className="w-full h-full"
                opts={{
                  align: "start",
                  loop: false,
                }}
              >
                <CarouselContent className="h-full">
                  {imageUrls.map((url, index) => (
                    <CarouselItem key={url} className="h-full">
                      <div className="relative w-full h-full">
                        <img
                          src={url}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-full rounded-lg border object-cover aspect-square"
                          onError={() => {
                            // Remove broken image
                            if (isMultiple) {
                              handleRemove(url)
                            } else {
                              onChange(null)
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2 h-8 w-8 z-10"
                          onClick={() => handleRemove(url)}
                          disabled={isUploading}
                        >
                          <IconX className="h-4 w-4" />
                        </Button>
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                {imageUrls.length > 1 && (
                  <>
                    <CarouselPrevious 
                      className="left-2 top-1/2 -translate-y-1/2 z-10 bg-background/80 hover:bg-background shadow-md"
                    />
                    <CarouselNext 
                      className="right-2 top-1/2 -translate-y-1/2 z-10 bg-background/80 hover:bg-background shadow-md"
                    />
                  </>
                )}
              </Carousel>
              {imageUrls.length > 1 && (
                <div className="text-center mt-2 text-xs text-muted-foreground">
                  {current + 1} / {imageUrls.length}
                </div>
              )}
            </div>
          ) : (
            <div className="border-2 border-dashed rounded-lg border-muted-foreground/25 flex items-center justify-center aspect-square">
              <p className="text-sm text-muted-foreground">
                {t('menu.items.noPreview')}
              </p>
            </div>
          )
        ) : type === 'video' && preview ? (
          <div className="relative">
            <video
              src={preview}
              controls
              className="w-full rounded-lg border max-h-[300px]"
              onError={() => onChange(null)}
            >
              {t('menu.items.videoNotSupported')}
            </video>
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2 h-8 w-8"
              onClick={() => handleRemove()}
              disabled={isUploading}
            >
              <IconX className="h-4 w-4" />
            </Button>
          </div>
        ) : null}
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  )
}

