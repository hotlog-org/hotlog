'use client'

import { MoreVertical as LucideMoreVertical } from 'lucide-react'
import { Delete02FreeIcons, PlusSignIcon } from '@hugeicons/core-free-icons'
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
import { Separator } from '@/shared/ui/separator'

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

  const isMaxDepth = field.level >= maxDepth
  const typeBadgeClass = typeStyles[field.type]
  const availableTypeOptions = typeOptions.filter(
    (option) => !(option === 'object' && isMaxDepth),
  )
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
        <div className='flex flex-col gap-2'>
          <Field className='w-full'>
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

          <div className='flex items-end gap-2'>
            <Field className='flex-1'>
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
                    {availableTypeOptions.map((option) => (
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
              className='h-10 w-10'
              onClick={(e) => {
                e.stopPropagation()
                onDeleteField(field.id)
              }}
            >
              <HugeiconsIcon icon={Delete02FreeIcons} color='white' />
            </Button>
          </div>
        </div>
        {field.type === 'object' ? (
          <div className='space-y-2 rounded-lg border border-dashed border-border/70 bg-background/40 p-3'>
            <div className='flex items-center justify-between gap-3'>
              <div className='text-sm font-medium'>
                {t('editor.objectFields')}
              </div>
              <div className='flex items-center gap-3 text-xs text-muted-foreground'>
                <span>{t('editor.depth', { level: field.level })}</span>
                {!isMaxDepth && (
                  <Button
                    variant='ghost'
                    size='icon'
                    className='h-7 w-7'
                    onClick={(e) => {
                      e.stopPropagation()
                      onAddField(field.id)
                    }}
                  >
                    <HugeiconsIcon icon={PlusSignIcon} className='size-4' />
                  </Button>
                )}
              </div>
            </div>
            {/* <Separator className='my-2' /> */}
            {field.children?.length ? (
              <div className='space-y-2'>
                {field.children?.map(renderChild)}
              </div>
            ) : (
              <p className='text-xs text-muted-foreground'>
                {t('editor.noNested')}
              </p>
            )}
          </div>
        ) : Renderer ? (
          Renderer({ ...rendererProps })
        ) : null}
      </div>
    </div>
  )
}
