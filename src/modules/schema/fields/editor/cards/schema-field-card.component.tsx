'use client'

import { MoreVertical as LucideMoreVertical } from 'lucide-react'
import {
  Delete02FreeIcons,
  ArrowReloadHorizontalFreeIcons,
} from '@hugeicons/core-free-icons'
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/shared/ui/tooltip'
import { cn } from '@/shared/utils'

import type { SchemaFieldRendererProps } from '../../types/schema-field-renderer.interface'
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
    canEdit,
    canArchive,
    onArchiveField,
    onRestoreField,
    onFieldDisplayNameChange,
    onFieldKeyChange,
    onFieldRequiredChange,
    onFieldTypeChange,
    onEnumChange,
    onRangeChange,
    onItemTypeChange,
    onSelectField,
  } = props

  const isArchived = field.status === 'archived'
  const typeBadgeClass = typeStyles[field.type]
  const isLockedType = !field.isNew

  const Renderer = rendererMap[field.type]
  const rendererProps: SchemaFieldRendererProps = {
    field,
    t,
    typeOptions,
    typeStyles,
    onItemTypeChange,
    onEnumChange,
    onRangeChange,
  }

  return (
    <div
      className={cn(
        'space-y-3 rounded-xl border border-border/70 bg-muted/10 p-3 transition-shadow',
        field.isFocused && 'border-primary/70 shadow-sm',
        isArchived && 'opacity-60',
      )}
      onClick={() => onSelectField(field.id)}
    >
      <div className='flex flex-col gap-2'>
        <div className='flex items-center gap-2'>
          <Badge
            variant='outline'
            className='font-mono text-[10px] uppercase tracking-wide'
          >
            {field.key || t('editor.fieldKeyPlaceholder')}
          </Badge>
          {isArchived && (
            <Badge variant='outline' className='text-[10px] uppercase'>
              {t('editor.archivedBadge')}
            </Badge>
          )}
          {field.isNew && (
            <Badge
              variant='outline'
              className='text-[10px] uppercase text-amber-500 border-amber-500/40'
            >
              {t('editor.newBadge')}
            </Badge>
          )}
        </div>

        {field.isNew && (
          <Field className='w-full'>
            <FieldLabel className='text-[11px] uppercase tracking-wide text-muted-foreground'>
              {t('editor.fieldKey')}
            </FieldLabel>
            <FieldControl>
              <Input
                value={field.key}
                onChange={(e) => onFieldKeyChange(field.id, e.target.value)}
                placeholder='snake_case_key'
                disabled={!canEdit}
              />
            </FieldControl>
          </Field>
        )}

        <Field className='w-full'>
          <FieldLabel className='text-[11px] uppercase tracking-wide text-muted-foreground'>
            {t('editor.fieldDisplayName')}
          </FieldLabel>
          <FieldControl>
            <Input
              value={field.displayName}
              onChange={(e) =>
                onFieldDisplayNameChange(field.id, e.target.value)
              }
              disabled={!canEdit || isArchived}
            />
          </FieldControl>
        </Field>

        <div className='flex items-end gap-2'>
          <Field className='flex-1'>
            <FieldLabel className='text-[11px] uppercase tracking-wide text-muted-foreground'>
              {t('editor.fieldType')}
            </FieldLabel>
            <FieldControl>
              {isLockedType ? (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type='button'
                        variant='outline'
                        size='default'
                        className='w-full justify-between gap-2 cursor-not-allowed'
                        disabled
                      >
                        <Badge
                          variant='outline'
                          className={cn('text-xs capitalize', typeBadgeClass)}
                        >
                          {field.type}
                        </Badge>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {t('editor.typeImmutableHint')}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant='outline'
                      size='default'
                      className='w-full justify-between gap-2'
                      disabled={!canEdit}
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
              )}
            </FieldControl>
          </Field>

          <Field className='w-32'>
            <FieldLabel className='text-[11px] uppercase tracking-wide text-muted-foreground'>
              {t('editor.required')}
            </FieldLabel>
            <FieldControl>
              <Button
                type='button'
                variant={field.required ? 'default' : 'outline'}
                size='default'
                className='w-full'
                onClick={(e) => {
                  e.stopPropagation()
                  if (canEdit && !isArchived) {
                    onFieldRequiredChange(field.id, !field.required)
                  }
                }}
                disabled={!canEdit || isArchived}
              >
                {field.required
                  ? t('editor.requiredYes')
                  : t('editor.requiredNo')}
              </Button>
            </FieldControl>
          </Field>

          {isArchived ? (
            <Button
              variant='outline'
              size='icon'
              className='h-10 w-10'
              onClick={(e) => {
                e.stopPropagation()
                onRestoreField(field.id)
              }}
              disabled={!canArchive}
              title={t('editor.restore')}
            >
              <HugeiconsIcon icon={ArrowReloadHorizontalFreeIcons} />
            </Button>
          ) : (
            <Button
              variant='destructive'
              size='icon'
              className='h-10 w-10'
              onClick={(e) => {
                e.stopPropagation()
                onArchiveField(field.id)
              }}
              disabled={!canArchive}
              title={
                field.isNew ? t('editor.removeDraft') : t('editor.archive')
              }
            >
              <HugeiconsIcon icon={Delete02FreeIcons} color='white' />
            </Button>
          )}
        </div>

        {Renderer && !isArchived ? Renderer({ ...rendererProps }) : null}
      </div>
    </div>
  )
}
