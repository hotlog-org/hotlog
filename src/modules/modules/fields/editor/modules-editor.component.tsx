'use client'

import { Button } from '@/shared/ui/button'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/shared/ui/drawer'
import { Field, FieldControl, FieldLabel } from '@/shared/ui/field'
import { Input } from '@/shared/ui/input'
import { ScrollArea } from '@/shared/ui/scroll-area'
import { Separator } from '@/shared/ui/separator'

import type {
  ModuleComponent,
  ModuleSchemaDefinition,
  ModuleVisualizationDefinition,
  TFunction,
} from '../../modules.interface'
import { useModulesEditorService } from './modules-editor.service'

export interface ModulesEditorProps {
  open: boolean
  mode: 'create' | 'edit'
  component: ModuleComponent | null
  schemas: ModuleSchemaDefinition[]
  visualizations: ModuleVisualizationDefinition[]
  onSubmit: (component: ModuleComponent) => void
  onClose: () => void
  t: TFunction
}

export const ModulesEditor = (props: ModulesEditorProps) => {
  const service = useModulesEditorService(props)
  const { draft, inputs, selectedSchema } = service

  const missingRequiredBindings = inputs.some(
    (input) =>
      !input.optional &&
      !draft?.bindings.find(
        (binding) => binding.inputId === input.id && binding.fieldKey,
      ),
  )

  const disabled = !draft || !draft.schemaId || missingRequiredBindings

  return (
    <Drawer
      open={props.open}
      direction='right'
      onOpenChange={(open) => {
        if (!open) props.onClose()
      }}
    >
      <DrawerContent className='w-[92vw] sm:max-w-4xl'>
        <DrawerHeader>
          <DrawerTitle>
            {props.mode === 'edit'
              ? props.t('drawer.editTitle')
              : props.t('drawer.addTitle')}
          </DrawerTitle>
          <DrawerDescription>{props.t('drawer.subtitle')}</DrawerDescription>
        </DrawerHeader>

        <Separator />

        {draft ? (
          <div className='grid grid-cols-1 gap-6 p-4'>
            <div className='space-y-4'>
              <Field>
                <FieldLabel>{props.t('drawer.titleLabel')}</FieldLabel>
                <FieldControl>
                  <Input
                    value={draft.title || ''}
                    onChange={(event) =>
                      service.handleTitleChange(event.target.value)
                    }
                    placeholder={props.t('drawer.textPlaceholder')}
                  />
                </FieldControl>
              </Field>

              <Field>
                <FieldLabel>{props.t('drawer.descriptionLabel')}</FieldLabel>
                <FieldControl>
                  <textarea
                    value={draft.description || ''}
                    onChange={(event) =>
                      service.handleDescriptionChange(event.target.value)
                    }
                    placeholder={props.t('drawer.descriptionPlaceholder')}
                    className='min-h-[6rem] w-full rounded-md border border-border bg-background px-3 py-2 text-sm'
                  />
                </FieldControl>
              </Field>

              <div className='flex justify-between gap-3'>
                <Field className='w-full'>
                  <FieldLabel>{props.t('drawer.visualization')}</FieldLabel>
                  <FieldControl>
                    <select
                      value={draft.visualization}
                      onChange={(event) =>
                        service.handleVisualizationChange(event.target.value)
                      }
                      className='w-full rounded-md border border-border bg-background px-3 py-2 text-sm'
                    >
                      {props.visualizations.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </FieldControl>
                </Field>

                <Field className='w-full'>
                  <FieldLabel>{props.t('drawer.schema')}</FieldLabel>
                  <FieldControl>
                    <select
                      value={draft.schemaId}
                      onChange={(event) =>
                        service.handleSchemaChange(event.target.value)
                      }
                      className='w-full rounded-md border border-border bg-background px-3 py-2 text-sm'
                    >
                      {props.schemas.map((schema) => (
                        <option key={schema.id} value={schema.id}>
                          {schema.name}
                        </option>
                      ))}
                    </select>
                  </FieldControl>
                </Field>
              </div>

              <Field className='w-full h-auto'>
                <FieldLabel>{props.t('drawer.inputs')}</FieldLabel>
                <FieldControl>
                  <ScrollArea className='w-full max-h-80 space-y-2 pr-2'>
                    {inputs.map((input) => {
                      const fields = service.availableFieldsForInput(input)

                      return (
                        <div
                          key={input.id}
                          className='rounded-md border border-border/80 bg-background px-3 py-2'
                        >
                          <div className='flex items-center justify-between gap-2'>
                            <div className='space-y-1'>
                              <p className='text-sm font-medium'>
                                {input.label}
                              </p>
                              <p className='text-xs text-muted-foreground'>
                                {input.type}
                                {input.optional
                                  ? ` • ${props.t('drawer.optional')}`
                                  : ''}
                              </p>
                            </div>
                            <div className='w-48'>
                              <select
                                value={
                                  draft.bindings.find(
                                    (binding) => binding.inputId === input.id,
                                  )?.fieldKey || ''
                                }
                                onChange={(event) =>
                                  service.handleBindingChange(
                                    input.id,
                                    event.target.value || null,
                                  )
                                }
                                className='w-full rounded-md border border-border bg-muted px-2 py-2 text-sm'
                              >
                                <option value=''>
                                  {props.t('drawer.selectField')}
                                </option>
                                {fields.map((field) => (
                                  <option key={field.key} value={field.key}>
                                    {field.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </ScrollArea>
                </FieldControl>
              </Field>
            </div>
          </div>
        ) : null}

        <DrawerFooter className='w-full'>
          <div className='w-full flex gap-3 justify-end'>
            <Button variant='outline' onClick={props.onClose}>
              {props.t('drawer.cancel')}
            </Button>
            <Button onClick={service.handleSubmit} disabled={disabled}>
              {props.t('drawer.save')}
            </Button>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
