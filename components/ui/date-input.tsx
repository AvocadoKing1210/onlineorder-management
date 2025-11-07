'use client'

import * as React from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface DateInputProps {
  value?: Date
  onChange?: (date: Date) => void
  className?: string
  placeholder?: string
}

export function DateInput({
  value,
  onChange,
  className,
  placeholder = 'Select date'
}: DateInputProps) {
  const formatDateForInput = (date: Date | undefined): string => {
    if (!date) return ''
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const [inputValue, setInputValue] = React.useState(formatDateForInput(value))

  React.useEffect(() => {
    setInputValue(formatDateForInput(value))
  }, [value])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)

    if (newValue && onChange) {
      const date = new Date(newValue)
      if (!isNaN(date.getTime())) {
        onChange(date)
      }
    }
  }

  return (
    <Input
      type="date"
      value={inputValue}
      onChange={handleChange}
      className={cn('w-[140px]', className)}
      placeholder={placeholder}
    />
  )
}

