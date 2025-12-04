'use client'

import type { StringFieldProps } from './string-field.interface'

export function StringField({ value, t }: StringFieldProps) {
  if (value === null || value === undefined || value === '') {
    return (
      <span className='text-muted-foreground text-sm'>
        {t('fields.notProvided')}
      </span>
    )
  }

  return <span className='text-sm font-medium'>{String(value)}</span>
}
