'use client'

import { Badge } from '@/shared/ui/badge'

export interface EnumFieldProps {
  value: unknown
  t: (key: string, params?: Record<string, unknown>) => string
}

const colorMap: Record<string, string> = {
  critical: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200',
  warning:
    'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200',
  info: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200',
  pro: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200',
  enterprise:
    'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-200',
  free: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
  ios: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-200',
  android:
    'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-200',
}

export function EnumField({ value, t }: EnumFieldProps) {
  if (typeof value !== 'string') {
    return (
      <span className='text-muted-foreground text-sm'>{t('fields.empty')}</span>
    )
  }

  const normalized = value.toLowerCase()
  const className =
    colorMap[normalized] ?? 'bg-secondary text-secondary-foreground'

  return (
    <Badge variant='outline' className={`capitalize ${className}`}>
      {value}
    </Badge>
  )
}
