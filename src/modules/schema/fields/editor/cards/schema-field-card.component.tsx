'use client'

import { MoreVertical as LucideMoreVertical } from 'lucide-react'
import { Delete02FreeIcons } from '@hugeicons/core-free-icons'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import { Field, FieldControl, FieldLabel } from '@/shared/ui/field'
import { Input } from '@/shared/ui/input'
import { Button } from '@/shared/ui/button'
import { Badge } from '@/shared/ui/badge'
import { cn } from '@/shared/utils'

import type { SchemaFieldRendererProps } from '../../types/schema-field-renderer.interface'
import type { FieldWithMeta } from '../../../schema.service'
import {
  typeOptions,
  typeStyles,
  rendererMap,
} from './schema-field-card.constant'
import type { FieldCardProps } from './schema-field-card.interface'
import { HugeiconsIcon } from '@hugeicons/react'

export function FieldCard(props: FieldCardProps) {
  const {
    field,
    t,
    maxDepth,
    onAddField,
    onDeleteField,
    onFieldNameChange,
    onFieldTypeChange,
    onEnumChange,
    onRangeChange,
    onItemTypeChange,
    onSelectField,
  } = props

  const typeBadgeClass = typeStyles[field.type]
  const renderChild = (child: FieldWithMeta) => (
    <FieldCard
      key={child.id}
      field={child}
      t={t}
      maxDepth={maxDepth}
      onAddField={onAddField}
      onDeleteField={onDeleteField}
      onFieldNameChange={onFieldNameChange}
      onFieldTypeChange={onFieldTypeChange}
      onEnumChange={onEnumChange}
      onRangeChange={onRangeChange}
      onItemTypeChange={onItemTypeChange}
      onSelectField={onSelectField}
    />
  )

  const Renderer = rendererMap[field.type]
  const rendererProps: SchemaFieldRendererProps = {
    field,
    t,
    maxDepth,
    typeOptions,
    typeStyles,
    onAddField,
    onDeleteField,
    onFieldNameChange,
    onFieldTypeChange,
    onEnumChange,
    onRangeChange,
    onItemTypeChange,
    onSelectField,
    renderChild,
  }

  return (
    <div
      className={cn(
        'space-y-3 rounded-xl border border-border/70 bg-muted/10 p-3 transition-shadow',
        field.isFocused && 'border-primary/70 shadow-sm',
      )}
      style={{ marginLeft: (field.level - 1) * 12 }}
      onClick={() => onSelectField(field.id)}
    >
      <div className='flex flex-col gap-2'>
        <div className='flex flex-wrap items-end gap-3'>
          <Field className='flex-1 min-w-[160px]'>
            <FieldLabel className='text-[11px] uppercase tracking-wide text-muted-foreground'>
              {t('editor.fieldName')}
            </FieldLabel>
            <FieldControl>
              <Input
                value={field.name}
                onChange={(e) => onFieldNameChange(field.id, e.target.value)}
              />
            </FieldControl>
          </Field>

          <Field className='min-w-[150px]'>
            <FieldLabel className='text-[11px] uppercase tracking-wide text-muted-foreground'>
              {t('editor.fieldType')}
            </FieldLabel>
            <FieldControl>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant='outline'
                    size='default'
                    className='w-full justify-between gap-2'
                  >
                    <Badge
                      variant='outline'
                      className={cn('text-xs capitalize', typeBadgeClass)}
                    >
                      {field.type}
                    </Badge>
                    <LucideMoreVertical className='size-4 text-muted-foreground' />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align='end' className='w-44'>
                  {typeOptions.map((option) => (
                    <DropdownMenuItem
                      key={option}
                      onSelect={(e) => {
                        e.preventDefault()
                        onFieldTypeChange(field.id, option)
                      }}
                    >
                      <span className='w-full flex items-center justify-between gap-3'>
                        <span className='capitalize'>
                          {t(`editor.types.${option}`)}
                        </span>
                        <Badge
                          variant='outline'
                          className={cn(
                            'text-[10px] capitalize',
                            typeStyles[option],
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

          <Button
            variant='destructive'
            size='icon'
            className='h-9 w-9'
            onClick={(e) => {
              e.stopPropagation()
              onDeleteField(field.id)
            }}
          >
            <HugeiconsIcon icon={Delete02FreeIcons} color='white' />
          </Button>
        </div>
        {Renderer ? <Renderer {...rendererProps} /> : null}
      </div>
    </div>
  )
}
