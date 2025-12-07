'use client'

import type { SchemaFieldRendererProps } from '../schema-field-renderer.interface'
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

export function SchemaFieldArray(props: SchemaFieldRendererProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant='outline' className='w-full justify-between'>
          <span className='capitalize'>
            {props.t(`editor.types.${props.field.itemType ?? 'string'}`)}
          </span>
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
              <span className='flex items-center justify-between gap-2'>
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
  )
}
