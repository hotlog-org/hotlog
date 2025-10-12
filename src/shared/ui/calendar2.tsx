'use client'

import { Calendar } from '@/shared/ui/calendar'
import { useEffect, useState } from 'react'
import { type DateRange } from 'react-day-picker'

export interface CalendarRangeSingleMonthProps {
  value?: DateRange
  onChange?: (range: DateRange | undefined) => void
}

const CalendarRangeSingleMonth = ({
  value,
  onChange,
}: CalendarRangeSingleMonthProps) => {
  const [dateRange, setDateRange] = useState<DateRange | undefined>(value)

  useEffect(() => {
    if (value) {
      setDateRange(value)
    }
  }, [value])

  const handleSelect = (range: DateRange | undefined) => {
    setDateRange(range)
    onChange?.(range)
  }

  return (
    <Calendar
      mode='range'
      selected={dateRange}
      defaultMonth={dateRange?.from}
      onSelect={handleSelect}
      className='rounded-lg border'
    />
  )
}

export default CalendarRangeSingleMonth
