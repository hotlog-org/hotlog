'use client'

import { Badge } from '@/shared/ui/badge'

export interface ArrayFieldProps {
  value: unknown
  t: (key: string, params?: Record<string, unknown>) => string
}

export function ArrayField({ value, t }: ArrayFieldProps) {
  if (!Array.isArray(value) || value.length === 0) {
    return (
      <span className='text-muted-foreground text-sm'>{t('fields.empty')}</span>
    )
  }

  return (
    <div className='flex flex-wrap gap-1.5'>
      {value.map((item, idx) => (
        <Badge key={`${item}-${idx}`} variant='secondary' className='text-xs'>
          {String(item)}
        </Badge>
      ))}
    </div>
  )
}
