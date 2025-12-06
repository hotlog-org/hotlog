'use client'

export interface NumberFieldProps {
  value: unknown
  t: (key: string, params?: Record<string, unknown>) => string
}

export function NumberField({ value, t }: NumberFieldProps) {
  if (typeof value !== 'number') {
    return (
      <span className='text-muted-foreground text-sm'>{t('fields.empty')}</span>
    )
  }

  const formatted = Number.isInteger(value)
    ? value.toString()
    : value.toFixed(2)

  return <span className='text-sm font-medium'>{formatted}</span>
}
