'use client'

import { ScrollArea } from '@/shared/ui/scroll-area'

export interface JsonFieldProps {
  value: unknown
  t: (key: string, params?: Record<string, unknown>) => string
}

export function JsonField({ value, t }: JsonFieldProps) {
  if (!value || typeof value !== 'object') {
    return (
      <span className='text-muted-foreground text-sm'>{t('fields.empty')}</span>
    )
  }

  return (
    <ScrollArea className='max-h-36 rounded-md border border-border bg-muted/30 p-3 text-xs font-mono leading-relaxed'>
      <pre className='whitespace-pre-wrap break-words'>
        {JSON.stringify(value, null, 2)}
      </pre>
    </ScrollArea>
  )
}
