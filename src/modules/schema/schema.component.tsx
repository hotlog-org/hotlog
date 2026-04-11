'use client'

import { useState } from 'react'

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Field, FieldControl, FieldLabel } from '@/shared/ui/field'
import { slugifyKey } from '@/lib/schema-validator'

import { Skeleton } from '@/shared/ui/skeleton'

import { SchemaTable } from './fields/table/schema-table.component'
import { SchemaEditor } from './fields/editor/schema-editor.component'
import useSchemaService from './schema.service'

function SchemaTableSkeleton() {
  return (
    <div className='space-y-2'>
      <Skeleton className='h-10 w-full' />
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className='flex items-center gap-4 rounded-md p-3'>
          <div className='flex-1 space-y-2'>
            <Skeleton className='h-4 w-40' />
            <Skeleton className='h-3 w-24' />
          </div>
          <Skeleton className='h-4 w-10' />
          <Skeleton className='h-4 w-10' />
          <Skeleton className='h-4 w-12' />
        </div>
      ))}
    </div>
  )
}

function CreateSchemaDialog(props: {
  open: boolean
  onClose: () => void
  onSubmit: (displayName: string) => void
  isSubmitting: boolean
  error: string | null
  t: ReturnType<typeof useSchemaService>['t']
}) {
  const [displayName, setDisplayName] = useState('')
  const previewKey = slugifyKey(displayName) || 'schema_key'

  return (
    <Dialog
      open={props.open}
      onOpenChange={(open) => {
        if (!open) {
          setDisplayName('')
          props.onClose()
        }
      }}
    >
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>{props.t('createDialog.title')}</DialogTitle>
        </DialogHeader>
        <div className='space-y-3'>
          <Field>
            <FieldLabel>{props.t('createDialog.displayNameLabel')}</FieldLabel>
            <FieldControl>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={props.t('createDialog.displayNamePlaceholder')}
                autoFocus
              />
            </FieldControl>
          </Field>
          <p className='text-xs text-muted-foreground'>
            {props.t('createDialog.keyPreview')}{' '}
            <span className='font-mono'>{previewKey}</span>
          </p>
          {props.error && <p className='text-sm text-red-500'>{props.error}</p>}
        </div>
        <DialogFooter>
          <Button
            variant='outline'
            onClick={() => {
              setDisplayName('')
              props.onClose()
            }}
            disabled={props.isSubmitting}
          >
            {props.t('editor.cancel')}
          </Button>
          <Button
            onClick={() => props.onSubmit(displayName)}
            disabled={!displayName.trim() || props.isSubmitting}
          >
            {props.isSubmitting
              ? props.t('createDialog.creating')
              : props.t('createDialog.create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function SchemaComponent() {
  const service = useSchemaService()

  return (
    <div className='flex min-h-0 flex-1 flex-col gap-4'>
      <h1 className='text-2xl font-semibold'>{service.t('title')}</h1>

      {service.hasNoProject ? (
        <div className='flex flex-1 items-center justify-center text-muted-foreground'>
          {service.t('emptyState.noProject')}
        </div>
      ) : !service.canRead ? (
        <div className='flex flex-1 items-center justify-center text-muted-foreground'>
          {service.t('emptyState.noPermission')}
        </div>
      ) : service.isLoading ? (
        <div className='flex min-h-0 flex-1 flex-col overflow-hidden'>
          <SchemaTableSkeleton />
        </div>
      ) : (
        <div className='flex min-h-0 flex-1 flex-col overflow-hidden'>
          <SchemaTable
            rows={service.rows}
            onOpen={service.openSchema}
            t={service.t}
          />
        </div>
      )}

      <SchemaEditor
        open={Boolean(service.selectedSchema)}
        schema={service.selectedSchema}
        fields={service.fields}
        fieldCount={service.fieldCount}
        t={service.t}
        selectedFieldId={service.selectedFieldId}
        isDirty={service.isDirty}
        isSaving={service.isSaving}
        isFieldsLoading={service.isFieldsLoading}
        showArchived={service.showArchived}
        saveError={service.saveError}
        canEdit={service.canUpdateFields}
        canArchive={service.canArchiveFields}
        onClose={service.closeSchema}
        onToggleShowArchived={service.toggleShowArchived}
        onSchemaDisplayNameChange={service.updateSchemaDisplayName}
        onArchiveSchema={() =>
          service.selectedSchema &&
          service.archiveSchema(service.selectedSchema.id)
        }
        onAddField={service.addField}
        onArchiveField={service.archiveField}
        onRestoreField={service.restoreField}
        onFieldDisplayNameChange={service.updateFieldDisplayName}
        onFieldKeyChange={service.updateFieldKey}
        onFieldRequiredChange={service.updateFieldRequired}
        onFieldTypeChange={service.updateFieldType}
        onEnumChange={service.updateEnumValues}
        onRangeChange={service.updateNumberRange}
        onItemTypeChange={service.updateItemType}
        onSelectField={service.selectField}
        onSave={service.saveSchema}
        onCancel={service.cancelEdit}
      />

      <CreateSchemaDialog
        open={service.createSchemaOpen}
        onClose={service.closeCreateSchema}
        onSubmit={service.submitCreateSchema}
        isSubmitting={service.isCreatingSchema}
        error={service.createSchemaError}
        t={service.t}
      />
    </div>
  )
}
