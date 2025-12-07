'use client'

import {
  MoreVertical as LucideMoreVertical,
  Plus as LucidePlus,
  Trash2 as LucideTrash,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import {
  Field,
  FieldControl,
  FieldLabel,
  FieldMessage,
} from '@/shared/ui/field'
import { Input } from '@/shared/ui/input'
import { Button } from '@/shared/ui/button'
import { Badge } from '@/shared/ui/badge'
import { cn } from '@/shared/utils'

import type { FieldCardProps } from './schema-editor.interface'
import { typeOptions, typeStyles } from './schema-editor.constant'

export function FieldCard({
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
}: FieldCardProps) {
  const typeBadgeClass = typeStyles[field.type]
  const hasNested = Boolean(field.children?.length)
  const atMaxDepth = field.level >= maxDepth

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
        <div className='flex flex-wrap items-start gap-3'>
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
                    size='sm'
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
                      <span className='flex items-center justify-between gap-3'>
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
            variant='ghost'
            size='icon'
            className='h-9 w-9'
            onClick={(e) => {
              e.stopPropagation()
              onDeleteField(field.id)
            }}
          >
            <LucideTrash className='size-4 text-muted-foreground' />
          </Button>
        </div>

        {field.type === 'enum' ? (
          <Field>
            <FieldLabel>{t('editor.enumValues')}</FieldLabel>
            <FieldControl>
              <Input
                placeholder={t('editor.enumPlaceholder')}
                value={(field.enumValues ?? []).join(', ')}
                onChange={(e) =>
                  onEnumChange(
                    field.id,
                    e.target.value
                      .split(',')
                      .map((value) => value.trim())
                      .filter(Boolean),
                  )
                }
              />
            </FieldControl>
            <FieldMessage>{t('editor.enumHelp')}</FieldMessage>
          </Field>
        ) : null}

        {field.type === 'number' ? (
          <div className='grid grid-cols-2 gap-3'>
            <Field>
              <FieldLabel>{t('editor.min')}</FieldLabel>
              <FieldControl>
                <Input
                  type='number'
                  inputMode='decimal'
                  value={field.numberRange?.min ?? ''}
                  onChange={(e) =>
                    onRangeChange(field.id, {
                      min:
                        e.target.value === '' ? null : Number(e.target.value),
                      max: field.numberRange?.max,
                    })
                  }
                />
              </FieldControl>
            </Field>
            <Field>
              <FieldLabel>{t('editor.max')}</FieldLabel>
              <FieldControl>
                <Input
                  type='number'
                  inputMode='decimal'
                  value={field.numberRange?.max ?? ''}
                  onChange={(e) =>
                    onRangeChange(field.id, {
                      min: field.numberRange?.min,
                      max:
                        e.target.value === '' ? null : Number(e.target.value),
                    })
                  }
                />
              </FieldControl>
            </Field>
          </div>
        ) : null}

        {field.type === 'array' ? (
          <Field>
            <FieldLabel>{t('editor.arrayOf')}</FieldLabel>
            <FieldControl>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant='outline' className='w-full justify-between'>
                    <span className='capitalize'>
                      {t(`editor.types.${field.itemType ?? 'string'}`)}
                    </span>
                    <LucideMoreVertical className='size-4 text-muted-foreground' />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className='w-48'>
                  {typeOptions
                    .filter((option) => option !== 'array')
                    .map((option) => (
                      <DropdownMenuItem
                        key={option}
                        onSelect={(e) => {
                          e.preventDefault()
                          onItemTypeChange(field.id, option)
                        }}
                      >
                        <span className='flex items-center justify-between gap-2'>
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
        ) : null}

        {field.type === 'object' ? (
          <div className='space-y-2 rounded-lg border border-dashed border-border/70 bg-background/40 p-3'>
            <div className='flex items-center justify-between'>
              <div className='text-sm font-medium'>
                {t('editor.objectFields')}
              </div>
              <div className='text-xs text-muted-foreground'>
                {t('editor.depth', { level: field.level })}
              </div>
            </div>
            {hasNested ? (
              <div className='space-y-2'>
                {field.children?.map((child) => (
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
                ))}
              </div>
            ) : (
              <p className='text-xs text-muted-foreground'>
                {t('editor.noNested')}
              </p>
            )}
            <Button
              variant='ghost'
              size='sm'
              className='w-fit gap-2'
              disabled={atMaxDepth}
              onClick={(e) => {
                e.stopPropagation()
                onAddField(field.id)
              }}
            >
              <LucidePlus className='size-4' />
              {atMaxDepth ? t('editor.maxDepth') : t('editor.addNested')}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
