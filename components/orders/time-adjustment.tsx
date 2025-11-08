'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer'
import { IconClock, IconPlus, IconMinus } from '@tabler/icons-react'
import { cn } from '@/lib/utils'
import { updateOrderEstimatedTime } from '@/lib/api/orders'
import { toast } from 'sonner'

interface TimeAdjustmentProps {
  orderId: string
  currentMinutes: number | null | undefined
  onUpdate?: () => void
  className?: string
}

export function TimeAdjustment({
  orderId,
  currentMinutes,
  onUpdate,
  className,
}: TimeAdjustmentProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [localMinutes, setLocalMinutes] = useState(currentMinutes || 20)

  // Sync local state when currentMinutes changes
  useEffect(() => {
    if (currentMinutes !== undefined && currentMinutes !== null) {
      setLocalMinutes(currentMinutes)
    } else if (currentMinutes === null || currentMinutes === undefined) {
      setLocalMinutes(20) // Default to 20 minutes if not set
    }
  }, [currentMinutes])

  const handleAdjust = (delta: number) => {
    const newMinutes = Math.max(0, localMinutes + delta)
    setLocalMinutes(newMinutes)
  }

  const handleQuickSet = (minutes: number) => {
    setLocalMinutes(minutes)
  }

  const handleSave = async (minutes?: number) => {
    const minutesToSave = minutes ?? localMinutes
    try {
      setIsUpdating(true)
      await updateOrderEstimatedTime(orderId, minutesToSave)
      toast.success(`Wait time updated to ${minutesToSave} minutes`)
      setIsOpen(false)
      onUpdate?.()
    } catch (error) {
      console.error('Error updating wait time:', error)
      toast.error('Failed to update wait time')
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <Drawer open={isOpen} onOpenChange={setIsOpen}>
      <DrawerTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className={cn('h-10 w-10', className)}
          disabled={isUpdating}
        >
          <IconClock className="h-4 w-4" />
          <span className="sr-only">Adjust wait time</span>
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Adjust Wait Time</DrawerTitle>
        </DrawerHeader>
        <div className="p-4 space-y-6">
          {/* Current time display and +/- controls */}
          <div className="flex items-center justify-between gap-4">
            <Button
              variant="outline"
              size="icon"
              className="h-12 w-12"
              onClick={() => handleAdjust(-5)}
              disabled={isUpdating || localMinutes <= 0}
            >
              <IconMinus className="h-5 w-5" />
            </Button>
            
            <div className="flex-1 text-center">
              <div className="text-4xl font-bold tabular-nums">
                {localMinutes}
              </div>
              <div className="text-sm text-muted-foreground mt-1">minutes</div>
            </div>
            
            <Button
              variant="outline"
              size="icon"
              className="h-12 w-12"
              onClick={() => handleAdjust(5)}
              disabled={isUpdating}
            >
              <IconPlus className="h-5 w-5" />
            </Button>
          </div>

          {/* Quick options */}
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground text-center">Quick options</div>
            <div className="grid grid-cols-3 gap-3">
              {[10, 20, 30].map((mins) => (
                <Button
                  key={mins}
                  variant={localMinutes === mins ? 'default' : 'outline'}
                  size="lg"
                  className="text-base"
                  onClick={() => handleQuickSet(mins)}
                  disabled={isUpdating}
                >
                  {mins}m
                </Button>
              ))}
            </div>
          </div>

          {/* Save button */}
          <Button
            variant="default"
            size="lg"
            className="w-full"
            onClick={() => handleSave()}
            disabled={isUpdating}
          >
            {isUpdating ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  )
}

