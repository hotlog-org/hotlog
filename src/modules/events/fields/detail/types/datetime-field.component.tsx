'use client'

import { format, formatDistanceToNow } from 'date-fns'

import type { DateTimeFieldProps } from './datetime-field.interface'

export function DateTimeField({ value, t }: DateTimeFieldProps) {
  if (!value) {
    return (
      <span className='text-muted-foreground text-sm'>{t('fields.empty')}</span>
    )
  }

  const date = new Date(String(value))
  if (Number.isNaN(date.getTime())) {
    return (
      <span className='text-muted-foreground text-sm'>
        {t('fields.invalidDate')}
      </span>
    )
  }

  return (
    <div className='flex flex-col text-sm'>
      <span className='font-medium'>{format(date, 'PPP p')}</span>
      <span className='text-muted-foreground text-xs'>
        {formatDistanceToNow(date, { addSuffix: true })}
      </span>
    </div>
  )
}
