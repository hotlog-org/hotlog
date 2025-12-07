'use client'

import type { SchemaFieldRendererProps } from '../schema-field-renderer.interface'
import { Button } from '@/shared/ui/button'
import { LucidePlus } from 'lucide-react'

export function SchemaFieldObject(props: SchemaFieldRendererProps) {
  const hasNested = Boolean(props.field.children?.length)
  const atMaxDepth = props.field.level >= props.maxDepth

  return (
    <div className='space-y-2 rounded-lg border border-dashed border-border/70 bg-background/40 p-3'>
      <div className='flex items-center justify-between'>
        <div className='text-sm font-medium'>
          {props.t('editor.objectFields')}
        </div>
        <div className='text-xs text-muted-foreground'>
          {props.t('editor.depth', { level: props.field.level })}
        </div>
      </div>
      {hasNested ? (
        <div className='space-y-2'>
          {props.field.children?.map((child) => props.renderChild(child))}
        </div>
      ) : (
        <p className='text-xs text-muted-foreground'>
          {props.t('editor.noNested')}
        </p>
      )}
      <Button
        variant='ghost'
        size='sm'
        className='w-fit gap-2'
        disabled={atMaxDepth}
        onClick={(e) => {
          e.stopPropagation()
          props.onAddField(props.field.id)
        }}
      >
        <LucidePlus className='size-4' />
        {atMaxDepth ? props.t('editor.maxDepth') : props.t('editor.addNested')}
      </Button>
    </div>
  )
}
