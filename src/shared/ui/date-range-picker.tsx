'use client'

import { Calendar03Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { format } from 'date-fns'
import * as React from 'react'
import { type DateRange } from 'react-day-picker'
import { cn } from '../utils'
import { Button } from './button'
import CalendarRangeSingleMonthDemo from './calendar2'
import { Popover, PopoverContent, PopoverTrigger } from './popover'

interface DateRangePickerProps {
  value?: DateRange
  onChange?: (range: DateRange) => void
  className?: string
}

export function DateRangePicker({
  value,
  onChange,
  className,
}: DateRangePickerProps) {
  const [date, setDate] = React.useState<DateRange>(
    value || { from: undefined, to: undefined },
  )

  React.useEffect(() => {
    if (value) {
      setDate(value)
    }
  }, [value])

  const handleSelect = (range: DateRange | undefined) => {
    const newRange = range || { from: undefined, to: undefined }
    setDate(newRange)
    onChange?.(newRange)
  }

  return (
    <div className={cn('grid gap-2', className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id='date'
            variant='outline'
            className={cn(
              'justify-start text-left font-normal',
              !date.from && 'text-muted-foreground',
            )}
          >
            <HugeiconsIcon icon={Calendar03Icon} className='mr-2 h-4 w-4' />
            {date.from ? (
              date.to ? (
                <>
                  {format(date.from, 'LLL dd, y')} -{' '}
                  {format(date.to, 'LLL dd, y')}
                </>
              ) : (
                format(date.from, 'LLL dd, y')
              )
            ) : (
              <span>Pick a date range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className='w-auto p-0' align='start'>
          <CalendarRangeSingleMonthDemo value={date} onChange={handleSelect} />
        </PopoverContent>
      </Popover>
    </div>
  )
}

export type { DateRange }
