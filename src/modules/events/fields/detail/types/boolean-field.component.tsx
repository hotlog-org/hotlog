'use client'

import { Badge } from '@/shared/ui/badge'

export interface BooleanFieldProps {
  value: unknown
  t: (key: string, params?: Record<string, unknown>) => string
}

export function BooleanField({ value, t }: BooleanFieldProps) {
  if (typeof value !== 'boolean') {
    return (
      <span className='text-muted-foreground text-sm'>{t('fields.empty')}</span>
    )
  }

  return (
    <Badge
      variant='outline'
      className={
        value
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200'
          : 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200'
      }
    >
      {value ? t('fields.true') : t('fields.false')}
    </Badge>
  )
}
