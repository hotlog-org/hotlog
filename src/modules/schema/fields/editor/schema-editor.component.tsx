'use client'

import { useIsMobile } from '@/shared/hooks/use-mobile'
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/shared/ui/drawer'
import { Separator } from '@/shared/ui/separator'
import { ScrollArea } from '@/shared/ui/scroll-area'
import { Button } from '@/shared/ui/button'
import { Field, FieldControl, FieldLabel } from '@/shared/ui/field'
import { Input } from '@/shared/ui/input'
import { Badge } from '@/shared/ui/badge'
import { Skeleton } from '@/shared/ui/skeleton'
import { HugeiconsIcon } from '@hugeicons/react'

import { FieldCard } from './cards/schema-field-card.component'
import { Delete02FreeIcons, Tick02Icon } from '@hugeicons/core-free-icons'
import { SchemaDefinition, SchemaFieldType } from '../../schema.interface'
import { FieldWithMeta, TFunction } from '../../schema.service'

export interface SchemaEditorProps {
  open: boolean
  schema: SchemaDefinition | null
  fields: FieldWithMeta[]
  fieldCount: number
  archivedFieldCount: number
  t: TFunction
  selectedFieldId: string | null
  isDirty: boolean
  isSaving: boolean
  isFieldsLoading: boolean
  showArchived: boolean
  saveError: string | null
  canEdit: boolean
  canArchive: boolean
  onClose: () => void
  onToggleShowArchived: () => void
  onSchemaDisplayNameChange: (value: string) => void
  onArchiveSchema: () => void
  onAddField: () => void
  onArchiveField: (fieldId: string) => void
  onRestoreField: (fieldId: string) => void
  onFieldDisplayNameChange: (fieldId: string, value: string) => void
  onFieldKeyChange: (fieldId: string, value: string) => void
  onFieldRequiredChange: (fieldId: string, value: boolean) => void
  onFieldTypeChange: (fieldId: string, type: SchemaFieldType) => void
  onEnumChange: (fieldId: string, values: string[]) => void
  onRangeChange: (
    fieldId: string,
    range: { min?: number | null; max?: number | null },
  ) => void
  onItemTypeChange: (fieldId: string, type: SchemaFieldType) => void
  onSelectField: (fieldId: string) => void
  onSave: () => void
  onCancel: () => void
}

export function SchemaEditor(props: SchemaEditorProps) {
  const isOpen = Boolean(props.schema) && props.open
  const isMobile = useIsMobile()

  return (
    <Drawer
      open={isOpen}
      direction={isMobile ? 'bottom' : 'right'}
      onOpenChange={(open) => {
        if (!open) props.onClose()
      }}
    >
      <DrawerContent className={isMobile ? 'max-h-[90vh]' : 'sm:max-w-3xl lg:max-w-5xl w-[92vw]'}>
        {props.schema ? (
          <>
            <DrawerHeader>
              <DrawerTitle className='sr-only'>
                {props.schema.displayName || props.schema.key}
              </DrawerTitle>
              <div className='flex items-end gap-3'>
                <Field className='w-full'>
                  <div className='flex items-center gap-2'>
                    <FieldLabel className='text-xs uppercase tracking-wide text-muted-foreground'>
                      {props.t('editor.schemaName')}
                    </FieldLabel>
                    <Badge
                      variant='outline'
                      className='font-mono text-[10px] uppercase'
                    >
                      {props.schema.key}
                    </Badge>
                  </div>
                  <FieldControl>
                    <Input
                      value={props.schema.displayName}
                      onChange={(e) =>
                        props.onSchemaDisplayNameChange(e.target.value)
                      }
                      placeholder={props.t('editor.schemaNamePlaceholder')}
                      disabled={!props.canEdit}
                    />
                  </FieldControl>
                </Field>
                <Button
                  variant='outline'
                  className='gap-2'
                  onClick={props.onAddField}
                  disabled={!props.canEdit}
                >
                  {props.t('editor.addField')}
                </Button>
              </div>
              <div className='mt-2 flex items-center justify-between text-xs'>
                <button
                  type='button'
                  className='text-muted-foreground underline'
                  onClick={props.onToggleShowArchived}
                >
                  {props.showArchived
                    ? props.t('editor.hideArchived')
                    : props.t('editor.showArchived')}
                </button>
                <span className='text-muted-foreground'>
                  {props.t('editor.activeFields', {
                    count: props.fieldCount,
                  })}
                  {props.showArchived && props.archivedFieldCount > 0 && (
                    <span className='text-muted-foreground/60'>
                      {' · '}
                      {props.t('editor.archivedFields', {
                        count: props.archivedFieldCount,
                      })}
                    </span>
                  )}
                </span>
              </div>
              <Separator className='my-3' />
            </DrawerHeader>

            <ScrollArea className='overflow-y-auto'>
              <DrawerFooter className='pt-0 h-full'>
                <div className='space-y-3'>
                  {props.isFieldsLoading && props.fields.length === 0 ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <div
                        key={i}
                        className='space-y-3 rounded-xl border border-border/70 bg-muted/10 p-3'
                      >
                        <div className='flex items-center gap-2'>
                          <Skeleton className='h-4 w-20' />
                        </div>
                        <Skeleton className='h-9 w-full' />
                        <div className='flex gap-2'>
                          <Skeleton className='h-10 flex-1' />
                          <Skeleton className='h-10 w-32' />
                          <Skeleton className='h-10 w-10' />
                        </div>
                      </div>
                    ))
                  ) : props.fields.length === 0 ? (
                    <p className='text-sm text-muted-foreground text-center py-8'>
                      {props.t('editor.noFields')}
                    </p>
                  ) : (
                    props.fields.map((field) => (
                      <FieldCard
                        key={field.id}
                        field={field}
                        t={props.t}
                        canEdit={props.canEdit}
                        canArchive={props.canArchive}
                        onArchiveField={props.onArchiveField}
                        onRestoreField={props.onRestoreField}
                        onFieldDisplayNameChange={
                          props.onFieldDisplayNameChange
                        }
                        onFieldKeyChange={props.onFieldKeyChange}
                        onFieldRequiredChange={props.onFieldRequiredChange}
                        onFieldTypeChange={props.onFieldTypeChange}
                        onEnumChange={props.onEnumChange}
                        onRangeChange={props.onRangeChange}
                        onItemTypeChange={props.onItemTypeChange}
                        onSelectField={props.onSelectField}
                      />
                    ))
                  )}
                </div>

                {props.saveError && (
                  <p className='text-sm text-red-500 mt-3'>{props.saveError}</p>
                )}

                <Separator className='my-3' />

                <div className='flex items-center justify-between gap-2'>
                  <Button
                    variant='ghost'
                    className='text-destructive hover:text-destructive'
                    onClick={props.onArchiveSchema}
                    disabled={!props.canArchive}
                  >
                    <HugeiconsIcon icon={Delete02FreeIcons} size={18} />
                    <span className='hidden sm:inline'>
                      {props.t('editor.archiveSchema')}
                    </span>
                  </Button>
                  <div className='flex items-center gap-2'>
                    <Button
                      variant='outline'
                      onClick={props.onCancel}
                      disabled={!props.isDirty || props.isSaving}
                    >
                      {props.t('editor.cancel')}
                    </Button>
                    <Button
                      onClick={props.onSave}
                      disabled={
                        !props.isDirty || props.isSaving || !props.canEdit
                      }
                    >
                      <HugeiconsIcon
                        icon={Tick02Icon}
                        size={18}
                        className='sm:hidden'
                      />
                      <span className='hidden sm:inline'>
                        {props.isSaving
                          ? props.t('editor.saving')
                          : props.t('editor.save')}
                      </span>
                    </Button>
                  </div>
                </div>
              </DrawerFooter>
            </ScrollArea>
          </>
        ) : null}
      </DrawerContent>
    </Drawer>
  )
}
