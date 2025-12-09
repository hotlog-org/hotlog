import { useMemo, useState } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import {
  AddCircleIcon,
  Delete02Icon,
  Shield01Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover'
import { ScrollArea } from '@/shared/ui/scroll-area'

import type {
  OverviewPermission,
  OverviewRole,
  PermissionCategory,
} from '../../../../overview.interface'
import type { RolesTableProps } from './roles-table.component'

export interface RolesTableService {
  columns: ColumnDef<OverviewRole>[]
}

const renderPermissionBadge = (
  permission: OverviewPermission,
  colors: Record<PermissionCategory | string, string>,
  onRemove?: () => void,
) => (
  <span
    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${colors[permission.category]}`}
  >
    <span>
      {permission.category}/{permission.label}
    </span>
    {onRemove && (
      <button
        type='button'
        className='text-white/70 transition hover:scale-105 hover:text-white'
        onClick={(event) => {
          event.stopPropagation()
          onRemove()
        }}
      >
        ×
      </button>
    )}
  </span>
)

export const useRolesTableService = ({
  rows,
  permissions,
  permissionColors,
  onAddPermission,
  onRemovePermission,
  onDelete,
  t,
}: RolesTableProps): RolesTableService => {
  const [permissionSearch, setPermissionSearch] = useState('')
  const [openRoleId, setOpenRoleId] = useState<string | null>(null)
  const [expandedRoleIds, setExpandedRoleIds] = useState<
    Record<string, boolean>
  >({})

  const permissionLookup = useMemo(
    () =>
      permissions.reduce<Record<string, OverviewPermission>>((map, item) => {
        map[item.id] = item
        return map
      }, {}),
    [permissions],
  )

  const toggleExpanded = (roleId: string) => {
    setExpandedRoleIds((current) => ({
      ...current,
      [roleId]: !current[roleId],
    }))
  }

  const columns: ColumnDef<OverviewRole>[] = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: () => (
          <div className='flex items-center gap-2'>
            <HugeiconsIcon icon={Shield01Icon} className='size-5' />
            <span>{t('roles.table.name')}</span>
          </div>
        ),
        cell: ({ row }) => (
          <p className='font-medium text-foreground'>{row.original.name}</p>
        ),
      },
      {
        id: 'permissions',
        header: t('roles.table.permissions'),
        cell: ({ row }) => {
          const isOpen = openRoleId === row.original.id
          const selectedPermissions = row.original.permissionIds
            .map((id) => permissionLookup[id])
            .filter(Boolean) as OverviewPermission[]

          const availablePermissions = permissions.filter(
            (permission) =>
              !row.original.permissionIds.includes(permission.id) &&
              (permissionSearch.trim().length === 0 ||
                permission.label
                  .toLowerCase()
                  .includes(permissionSearch.trim().toLowerCase()) ||
                permission.category
                  .toLowerCase()
                  .includes(permissionSearch.trim().toLowerCase())),
          )

          return (
            <div className='flex flex-wrap items-center gap-2'>
              {selectedPermissions
                .slice(
                  0,
                  expandedRoleIds[row.original.id]
                    ? selectedPermissions.length
                    : 6,
                )
                .map((permission) =>
                  renderPermissionBadge(permission, permissionColors, () =>
                    onRemovePermission(row.original.id, permission.id),
                  ),
                )}

              {selectedPermissions.length > 6 && (
                <div className='flex items-center gap-2'>
                  <Button
                    variant='outline'
                    size='sm'
                    className='border-dashed text-xs'
                    onClick={() => toggleExpanded(row.original.id)}
                  >
                    {expandedRoleIds[row.original.id]
                      ? t('roles.table.collapse')
                      : t('roles.table.expand', {
                          count: selectedPermissions.length - 6,
                        })}
                  </Button>
                  {expandedRoleIds[row.original.id] && (
                    <Button
                      variant='ghost'
                      size='sm'
                      className='text-xs'
                      onClick={() => toggleExpanded(row.original.id)}
                    >
                      {t('roles.table.hide')}
                    </Button>
                  )}
                </div>
              )}

              <Popover
                open={isOpen}
                onOpenChange={(next) => {
                  setOpenRoleId(next ? row.original.id : null)
                  if (!next) setPermissionSearch('')
                }}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant='ghost'
                    size='icon'
                    className='border border-dashed border-border/70 bg-muted/40 text-muted-foreground hover:text-foreground'
                    aria-label={t('roles.table.addPermission')}
                  >
                    <HugeiconsIcon icon={AddCircleIcon} className='size-5' />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className='w-72 space-y-2 border-border/80 bg-card p-3'>
                  <Input
                    value={permissionSearch}
                    onChange={(event) =>
                      setPermissionSearch(event.target.value)
                    }
                    placeholder={t('roles.table.searchPermissions')}
                    onClick={(event) => event.stopPropagation()}
                    onKeyDown={(event) => event.stopPropagation()}
                  />
                  <ScrollArea className='max-h-60 rounded-md border border-border/60'>
                    <div className='divide-y divide-border/70'>
                      {availablePermissions.length === 0 ? (
                        <p className='px-3 py-2 text-sm text-muted-foreground'>
                          {t('roles.table.noPermissionResults')}
                        </p>
                      ) : (
                        availablePermissions.map((permission) => (
                          <button
                            type='button'
                            key={permission.id}
                            onClick={(event) => {
                              event.preventDefault()
                              onAddPermission(row.original.id, permission.id)
                              setPermissionSearch('')
                              setOpenRoleId(row.original.id)
                            }}
                            className='flex w-full items-center justify-between px-3 py-2 text-left text-sm transition hover:bg-accent/40'
                          >
                            {renderPermissionBadge(
                              permission,
                              permissionColors,
                            )}
                            <span className='text-xs text-muted-foreground'>
                              {t('roles.table.add')}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </PopoverContent>
              </Popover>
            </div>
          )
        },
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <Button
            variant='ghost'
            size='icon'
            className='text-destructive hover:text-destructive'
            disabled={rows.length <= 1}
            onClick={(event) => {
              event.stopPropagation()
              onDelete(row.original.id)
            }}
            aria-label={t('roles.table.delete')}
          >
            <HugeiconsIcon icon={Delete02Icon} className='size-5' />
          </Button>
        ),
      },
    ],
    [
      onAddPermission,
      onDelete,
      onRemovePermission,
      openRoleId,
      permissionColors,
      permissionLookup,
      permissionSearch,
      permissions,
      expandedRoleIds,
      rows.length,
      t,
    ],
  )

  return { columns }
}
