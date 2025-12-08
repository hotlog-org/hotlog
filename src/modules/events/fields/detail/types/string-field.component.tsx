'use client'

export interface StringFieldProps {
  value: unknown
  t: (key: string, params?: Record<string, string | number | Date>) => string
}

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
