'use client'

import { AddCircleIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import { ModulesCancelButton } from './fields/cancel-button/modules-cancel-button.component'
import { ModulesDragButton } from './fields/drag-button/modules-drag-button.component'
import { ModulesEditor } from './fields/editor/modules-editor.component'
import { ModulesSaveButton } from './fields/save-button/modules-save-button.component'
import { ModulesView } from './fields/view/modules-view.component'
import useModulesService from './modules.service'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shared/ui/popover'
import { cn } from '@/shared/utils/shadcn.utils'
import { useRef } from 'react'

export interface ModulesComponentProps {
  moduleId?: string
}

export function ModulesComponent({ moduleId }: ModulesComponentProps) {
  const service = useModulesService({ moduleId })
  const currentModule = service.module
  const colorInputRef = useRef<HTMLInputElement>(null)

  if (service.isLoading) {
    return (
      <div className='rounded-lg border border-dashed border-border/70 bg-muted/40 p-6 text-sm text-muted-foreground'>
        Loading...
      </div>
    )
  }

  if (!currentModule) {
    return (
      <div className='rounded-lg border border-dashed border-border/70 bg-muted/40 p-6 text-sm text-muted-foreground'>
        {service.t('emptyModule')}
      </div>
    )
  }

  const isNameEditing = service.editingField === 'name'
  const isHeroDescriptionEditing = service.editingField === 'heroDescription'

  return (
    <div className='flex min-h-0 flex-1 flex-col gap-4 pb-4'>
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <div className='space-y-2'>
          <div className='flex items-center gap-2'>
            <span
              className='relative inline-block h-3 w-3 cursor-pointer rounded-full'
              style={{ backgroundColor: currentModule.color }}
              onDoubleClick={() => colorInputRef.current?.click()}
            >
              <input
                ref={colorInputRef}
                type='color'
                value={currentModule.color}
                onChange={(e) => service.updateColor(e.target.value)}
                className='absolute inset-0 h-0 w-0 cursor-pointer opacity-0'
                tabIndex={-1}
              />
            </span>
            {isNameEditing ? (
              <Input
                value={currentModule.name}
                onChange={(event) => service.updateName(event.target.value)}
                onBlur={() => service.setEditingField(null)}
                autoFocus
                className='max-w-sm'
              />
            ) : (
              <button
                type='button'
                className='text-2xl font-bold leading-tight hover:text-primary'
                onClick={() => service.setEditingField('name')}
              >
                {currentModule.name || service.t('placeholders.moduleName')}
              </button>
            )}
          </div>

          {isHeroDescriptionEditing ? (
            <Input
              value={currentModule.heroDescription ?? ''}
              onChange={(event) =>
                service.updateHeroDescription(event.target.value)
              }
              onBlur={() => service.setEditingField(null)}
              autoFocus
              className='max-w-xl'
              placeholder={service.t('placeholders.description')}
            />
          ) : (
            <p
              className={cn(
                'max-w-3xl cursor-text text-sm text-muted-foreground',
                !currentModule.heroDescription && 'italic',
              )}
              onClick={() => service.setEditingField('heroDescription')}
            >
              {currentModule.heroDescription ||
                service.t('placeholders.description')}
            </p>
          )}

          {service.canUpdateLayouts ? (
            <div className='flex flex-wrap items-center gap-1.5'>
              {currentModule.roleIds.length === 0 ? (
                <Badge variant='secondary' className='text-xs'>
                  Public
                </Badge>
              ) : (
                currentModule.roleIds.map((roleId) => {
                  const role = service.projectRoles.find((r) => r.id === roleId)
                  const removable = service.canRemoveRole(roleId)
                  return (
                    <Badge
                      key={roleId}
                      variant='outline'
                      className={cn(
                        'gap-1 text-xs',
                        removable && 'cursor-pointer hover:bg-destructive/10',
                      )}
                      onClick={() => removable && service.removeLayoutRole(roleId)}
                    >
                      {role?.name ?? roleId}
                      {removable ? ' ×' : null}
                    </Badge>
                  )
                })
              )}
              <Popover>
                <PopoverTrigger asChild>
                  <button className='rounded-md border border-dashed border-border px-2 py-0.5 text-xs text-muted-foreground hover:border-primary hover:text-primary'>
                    + role
                  </button>
                </PopoverTrigger>
                <PopoverContent className='w-48 p-2' align='start'>
                  <div className='space-y-1'>
                    {service.projectRoles
                      .filter((r) => !currentModule.roleIds.includes(r.id))
                      .map((role) => (
                        <button
                          key={role.id}
                          className='w-full rounded px-2 py-1 text-left text-sm hover:bg-accent'
                          onClick={() => service.addLayoutRole(role.id)}
                        >
                          {role.name}
                        </button>
                      ))}
                    {service.projectRoles.filter(
                      (r) => !currentModule.roleIds.includes(r.id),
                    ).length === 0 ? (
                      <p className='px-2 py-1 text-xs text-muted-foreground'>
                        All roles assigned
                      </p>
                    ) : null}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          ) : currentModule.roleIds.length > 0 ? (
            <div className='flex flex-wrap items-center gap-1.5'>
              {currentModule.roleIds.map((roleId) => {
                const role = service.projectRoles.find((r) => r.id === roleId)
                return (
                  <Badge key={roleId} variant='outline' className='text-xs'>
                    {role?.name ?? roleId}
                  </Badge>
                )
              })}
            </div>
          ) : null}
        </div>

        <div className='flex flex-wrap items-center gap-2'>
          {service.canUpdateComponents ? (
            <ModulesDragButton
              active={service.reorderEnabled}
              onToggle={() => service.setReorderEnabled(!service.reorderEnabled)}
              t={service.t}
            />
          ) : null}
          {service.canCreateComponents ? (
            <Button
              variant='outline'
              size='sm'
              className='gap-2'
              onClick={service.openCreateComponent}
            >
              <HugeiconsIcon icon={AddCircleIcon} className='size-5' />
              {service.t('actions.addComponent')}
            </Button>
          ) : null}
        </div>
      </div>

      {service.reorderEnabled ? (
        <p className='text-xs text-muted-foreground'>
          {service.t('controls.reorderHint')}
        </p>
      ) : null}

      <ModulesView
        components={currentModule.components}
        schemas={service.schemas}
        visualizations={service.visualizations}
        reorderEnabled={service.reorderEnabled}
        onReorder={service.reorderComponent}
        onEdit={service.openEditComponent}
        onDelete={service.canDeleteComponents ? service.deleteComponent : undefined}
        onToggleSpan={service.canUpdateComponents ? service.toggleComponentSpan : undefined}
        t={service.t}
      />

      <ModulesEditor
        open={service.editor.open}
        mode={service.editor.mode}
        component={service.editor.component}
        schemas={service.schemas}
        visualizations={service.visualizations}
        onSubmit={service.submitComponent}
        onClose={service.closeEditor}
        t={service.t}
      />

      {service.isDirty && (service.canUpdateLayouts || service.canUpdateComponents) ? (
        <div className='fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-lg border border-border bg-card p-3 shadow-lg'>
          <ModulesCancelButton onCancel={service.cancelChanges} t={service.t} />
          <ModulesSaveButton onSave={service.saveModule} t={service.t} disabled={service.isSaving} />
        </div>
      ) : null}
    </div>
  )
}
