'use client'

import { useState } from 'react'
import { Loading03Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import type { IArchivedSchemaConflict } from '@/shared/api/interface'

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

export function CreateSchemaDialog(props: {
  open: boolean
  onClose: () => void
  onSubmit: (displayName: string) => void
  isSubmitting: boolean
  error: string | null
  conflict: IArchivedSchemaConflict | null
  onDraftChange: () => void
  onRestore?: (key: string) => void
  isRestoring: boolean
  t: ReturnType<typeof useSchemaService>['t']
}) {
  const [displayName, setDisplayName] = useState('')
  const previewKey = slugifyKey(displayName) || 'schema_key'

  return (
    <Dialog
      open={props.open}
      onOpenChange={(open) => {
        if (!open && !props.isSubmitting) props.onClose()
      }}
    >
      <DialogContent className='sm:max-w-md' aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{props.t('createDialog.title')}</DialogTitle>
        </DialogHeader>
        <div className='space-y-3'>
          <Field>
            <FieldLabel>{props.t('createDialog.displayNameLabel')}</FieldLabel>
            <FieldControl>
              <Input
                value={displayName}
                onChange={(e) => {
                  setDisplayName(e.target.value)
                  props.onDraftChange()
                }}
                disabled={props.isSubmitting}
                placeholder={props.t('createDialog.displayNamePlaceholder')}
                autoFocus
              />
            </FieldControl>
          </Field>
          <p className='text-xs text-muted-foreground'>
            {props.t('createDialog.keyPreview')}{' '}
            <span className='font-mono'>{previewKey}</span>
          </p>
          {props.error && (
            <p role='alert' className='text-sm text-destructive'>
              {props.error}
            </p>
          )}
          {props.conflict?.key === previewKey && (
            <div className='space-y-2 rounded-md border p-3 text-sm'>
              <p className='font-medium'>{props.conflict.displayName}</p>
              <p className='text-muted-foreground'>
                {props.onRestore
                  ? props.t('createDialog.restoreDescription')
                  : props.t('createDialog.restoreNoPermission')}
              </p>
              {props.onRestore && (
                <Button
                  variant='outline'
                  disabled={props.isSubmitting}
                  aria-busy={props.isRestoring}
                  onClick={() => props.onRestore?.(previewKey)}
                >
                  {props.isRestoring && (
                    <HugeiconsIcon
                      icon={Loading03Icon}
                      className='size-4 animate-spin'
                      aria-hidden='true'
                    />
                  )}
                  {props.t(
                    props.isRestoring
                      ? 'createDialog.restoring'
                      : 'createDialog.restore',
                  )}
                </Button>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button
            variant='outline'
            onClick={props.onClose}
            disabled={props.isSubmitting}
          >
            {props.t('editor.cancel')}
          </Button>
          <Button
            onClick={() => props.onSubmit(displayName)}
            disabled={
              !displayName.trim() ||
              props.isSubmitting ||
              props.conflict?.key === previewKey
            }
          >
            {props.isSubmitting && !props.isRestoring
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

      {service.loadError && service.rows.length > 0 && (
        <p role='alert' className='text-sm text-destructive'>
          {service.loadError}
        </p>
      )}

      {service.hasNoProject ? (
        <div className='flex flex-1 items-center justify-center text-muted-foreground'>
          {service.t('emptyState.noProject')}
        </div>
      ) : service.isLoading ? (
        <div className='flex min-h-0 flex-1 flex-col overflow-hidden'>
          <SchemaTableSkeleton />
        </div>
      ) : !service.canRead ? (
        <div className='flex flex-1 items-center justify-center text-muted-foreground'>
          {service.t('emptyState.noPermission')}
        </div>
      ) : service.loadError && service.rows.length === 0 ? (
        <p role='alert' className='text-sm text-destructive'>
          {service.loadError}
        </p>
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
        archivedFieldCount={service.archivedFieldCount}
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
        key={service.createSchemaSession}
        open={service.createSchemaOpen}
        onClose={service.closeCreateSchema}
        onSubmit={service.submitCreateSchema}
        isSubmitting={service.isCreatingSchema}
        error={service.createSchemaError}
        conflict={service.archivedSchemaConflict}
        onDraftChange={service.clearCreateSchemaConflict}
        onRestore={
          service.canRestoreSchema
            ? service.restoreConflictingSchema
            : undefined
        }
        isRestoring={service.isRestoringSchema}
        t={service.t}
      />
    </div>
  )
}
