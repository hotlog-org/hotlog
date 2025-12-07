'use client'

import type { SchemaFieldRendererProps } from './schema-field-renderer.interface'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import { Button } from '@/shared/ui/button'
import { Badge } from '@/shared/ui/badge'
import { LucideMoreVertical } from 'lucide-react'
import { cn } from '@/shared/utils'
import { Field, FieldControl, FieldLabel } from '@/shared/ui/field'

export function SchemaFieldArray(props: SchemaFieldRendererProps) {
  return (
    <Field>
      <FieldLabel className='text-[11px] uppercase tracking-wide text-muted-foreground'>
        {props.t('editor.arrayValueType')}
      </FieldLabel>
      <FieldControl>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant='outline' className='w-full justify-between'>
              <Badge
                variant='outline'
                className={cn(
                  'text-[10px] capitalize',
                  props.typeStyles[props.field.itemType ?? 'string'],
                )}
              >
                {props.t(`editor.types.${props.field.itemType ?? 'string'}`)}
              </Badge>
              <LucideMoreVertical className='size-4 text-muted-foreground' />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className='w-48'>
            {props.typeOptions
              .filter((option) => option !== 'array')
              .map((option) => (
                <DropdownMenuItem
                  key={option}
                  onSelect={(e) => {
                    e.preventDefault()
                    props.onItemTypeChange(props.field.id, option)
                  }}
                >
                  <span className='w-full flex items-center justify-between gap-2'>
                    <span className='capitalize'>
                      {props.t(`editor.types.${option}`)}
                    </span>
                    <Badge
                      variant='outline'
                      className={cn(
                        'text-[10px] capitalize',
                        props.typeStyles[option],
                      )}
                    >
                      {option}
                    </Badge>
                  </span>
                </DropdownMenuItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </FieldControl>
    </Field>
  )
}
