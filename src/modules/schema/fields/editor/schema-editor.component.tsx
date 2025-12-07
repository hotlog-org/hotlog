'use client'

import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
} from '@/shared/ui/drawer'
import { Separator } from '@/shared/ui/separator'
import { ScrollArea } from '@/shared/ui/scroll-area'
import { Button } from '@/shared/ui/button'
import { Field, FieldControl, FieldLabel } from '@/shared/ui/field'
import { Input } from '@/shared/ui/input'
import { HugeiconsIcon } from '@hugeicons/react'

import type {
  FieldWithMeta,
  SchemaDefinition,
  TFunction,
} from '../../schema.service'
import { FieldCard } from './cards/schema-field-card.component'
import { Delete02FreeIcons } from '@hugeicons/core-free-icons'

export interface SchemaEditorProps {
  open: boolean
  schema: SchemaDefinition | null
  fields: FieldWithMeta[]
  fieldCount: number
  t: TFunction
  onClose: () => void
  maxDepth: number
  selectedFieldId: string | null
  onSchemaNameChange: (value: string) => void
  onDeleteSchema: () => void
  onAddField: (parentId?: string) => void
  onDeleteField: (fieldId: string) => void
  onFieldNameChange: (fieldId: string, name: string) => void
  onFieldTypeChange: (
    fieldId: string,
    type: SchemaDefinition['fields'][number]['type'],
  ) => void
  onEnumChange: (fieldId: string, values: string[]) => void
  onRangeChange: (
    fieldId: string,
    range: { min?: number | null; max?: number | null },
  ) => void
  onItemTypeChange: (
    fieldId: string,
    type: SchemaDefinition['fields'][number]['type'],
  ) => void
  onSelectField: (fieldId: string) => void
}

export function SchemaEditor(props: SchemaEditorProps) {
  const isOpen = Boolean(props.schema) && props.open

  return (
    <Drawer
      open={isOpen}
      direction='right'
      onOpenChange={(open) => {
        if (!open) props.onClose()
      }}
    >
      <DrawerContent className='sm:max-w-3xl lg:max-w-5xl w-[92vw]'>
        {props.schema ? (
          <>
            <DrawerHeader>
              <div className='flex items-end gap-3'>
                <Field className='w-full'>
                  <FieldLabel className='text-xs uppercase tracking-wide text-muted-foreground'>
                    {props.t('editor.schemaName')}
                  </FieldLabel>
                  <FieldControl>
                    <Input
                      value={props.schema.name}
                      onChange={(e) => props.onSchemaNameChange(e.target.value)}
                      placeholder={props.t('editor.schemaNamePlaceholder')}
                    />
                  </FieldControl>
                </Field>
                <Button
                  variant='outline'
                  className='gap-2'
                  onClick={() => props.onAddField()}
                >
                  {props.t('editor.addField')}
                </Button>
              </div>
              <Separator className='my-3' />
            </DrawerHeader>

            <ScrollArea className='overflow-y-auto'>
              <DrawerFooter className='pt-0 h-full'>
                <div className='space-y-3'>
                  {props.fields.map((field) => (
                    <FieldCard
                      key={field.id}
                      field={field}
                      t={props.t}
                      maxDepth={props.maxDepth}
                      onAddField={props.onAddField}
                      onDeleteField={props.onDeleteField}
                      onFieldNameChange={props.onFieldNameChange}
                      onFieldTypeChange={props.onFieldTypeChange}
                      onEnumChange={props.onEnumChange}
                      onRangeChange={props.onRangeChange}
                      onItemTypeChange={props.onItemTypeChange}
                      onSelectField={props.onSelectField}
                    />
                  ))}
                </div>

                <Separator className='my-3' />

                <div className='flex justify-end'>
                  <Button variant='destructive' onClick={props.onDeleteSchema}>
                    <HugeiconsIcon icon={Delete02FreeIcons} size={20} />
                    Delete schema
                  </Button>
                </div>
              </DrawerFooter>
            </ScrollArea>
          </>
        ) : null}
      </DrawerContent>
    </Drawer>
  )
}
