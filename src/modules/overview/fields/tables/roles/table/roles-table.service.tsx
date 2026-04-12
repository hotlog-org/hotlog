import { useMemo, useState } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import {
  AddCircleIcon,
  Delete02Icon,
  Shield01Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import { useIsMobile } from '@/shared/hooks/use-mobile'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover'
import { ScrollArea } from '@/shared/ui/scroll-area'
import { isOptimisticId } from '@/shared/api/project-role'

import type {
  OverviewPermission,
  OverviewRole,
  PermissionCategory,
} from '../../../../overview.interface'
import type { TFunction } from '../../../../overview.service'
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
    className={`inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium ${colors[permission.category]}`}
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

// Local component so the search-input state lives outside the parent's
// `columns` useMemo. Typing inside the popover used to bump a state in
// the service hook, which rebuilt the columns array on every keystroke,
// which caused TanStack Table to rebuild the cell tree, which unmounted
// the input and ate every keystroke after the first.
function PermissionPicker(props: {
  role: OverviewRole
  pending: boolean
  permissions: OverviewPermission[]
  permissionColors: Record<PermissionCategory | string, string>
  onAddPermission: (roleId: string, permissionId: string) => void
  t: TFunction
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const handleOpenChange = (next: boolean) => {
    if (props.pending) return
    setOpen(next)
    if (!next) setSearch('')
  }

  const availablePermissions = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return props.permissions.filter(
      (permission) =>
        !props.role.permissionIds.includes(permission.id) &&
        (needle.length === 0 ||
          permission.label.toLowerCase().includes(needle) ||
          permission.category.toLowerCase().includes(needle)),
    )
  }, [props.permissions, props.role.permissionIds, search])

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant='ghost'
          size='icon'
          className='border border-dashed border-border/70 bg-muted/40 text-muted-foreground hover:text-foreground disabled:opacity-40'
          aria-label={props.t('roles.table.addPermission')}
          disabled={props.pending}
        >
          <HugeiconsIcon icon={AddCircleIcon} className='size-5' />
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-80 space-y-2 border-border/80 bg-card p-3'>
        <Input
          autoFocus
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={props.t('roles.table.searchPermissions')}
          onKeyDown={(event) => event.stopPropagation()}
        />
        <ScrollArea className='max-h-72 overflow-y-auto rounded-md border border-border/60'>
          <div className='divide-y divide-border/70'>
            {availablePermissions.length === 0 ? (
              <p className='px-3 py-2 text-sm text-muted-foreground'>
                {props.t('roles.table.noPermissionResults')}
              </p>
            ) : (
              availablePermissions.map((permission) => (
                <button
                  type='button'
                  key={permission.id}
                  onClick={(event) => {
                    event.preventDefault()
                    props.onAddPermission(props.role.id, permission.id)
                    setSearch('')
                  }}
                  className='flex w-full items-center justify-between px-3 py-2 text-left text-sm transition hover:bg-accent/20'
                >
                  <div className='flex items-center gap-2'>
                    {renderPermissionBadge(permission, props.permissionColors)}
                  </div>
                  <span className='text-xs text-muted-foreground'>
                    {props.t('roles.table.add')}
                  </span>
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}

const MOBILE_VISIBLE_COUNT = 3

function PermissionsList(props: {
  role: OverviewRole
  pending: boolean
  permissions: OverviewPermission[]
  permissionLookup: Record<string, OverviewPermission>
  permissionColors: Record<PermissionCategory | string, string>
  onAddPermission: (roleId: string, permissionId: string) => void
  onRemovePermission: (roleId: string, permissionId: string) => void
  t: TFunction
}) {
  const isMobile = useIsMobile()
  const [expanded, setExpanded] = useState(false)

  const selectedPermissions = props.role.permissionIds
    .map((id) => props.permissionLookup[id])
    .filter(Boolean) as OverviewPermission[]

  const shouldTruncate =
    isMobile && !expanded && selectedPermissions.length > MOBILE_VISIBLE_COUNT
  const visible = shouldTruncate
    ? selectedPermissions.slice(0, MOBILE_VISIBLE_COUNT)
    : selectedPermissions
  const hiddenCount = selectedPermissions.length - MOBILE_VISIBLE_COUNT

  return (
    <div className='flex items-center gap-2'>
      <div className='flex items-center gap-2 overflow-x-auto scrollbar-none'>
        {visible.map((permission) =>
          renderPermissionBadge(
            permission,
            props.permissionColors,
            props.pending
              ? undefined
              : () =>
                  props.onRemovePermission(props.role.id, permission.id),
          ),
        )}
        {shouldTruncate && (
          <Button
            variant='outline'
            size='sm'
            className='shrink-0 border-dashed text-xs'
            onClick={() => setExpanded(true)}
          >
            +{hiddenCount} more
          </Button>
        )}
        {isMobile && expanded && selectedPermissions.length > MOBILE_VISIBLE_COUNT && (
          <Button
            variant='ghost'
            size='sm'
            className='shrink-0 text-xs'
            onClick={() => setExpanded(false)}
          >
            {props.t('roles.table.collapse')}
          </Button>
        )}
      </div>
      <PermissionPicker
        role={props.role}
        pending={props.pending}
        permissions={props.permissions}
        permissionColors={props.permissionColors}
        onAddPermission={props.onAddPermission}
        t={props.t}
      />
    </div>
  )
}

export const useRolesTableService = ({
  rows,
  permissions,
  permissionColors,
  onAddPermission,
  onRemovePermission,
  onDelete,
  t,
}: RolesTableProps): RolesTableService => {
  const permissionLookup = useMemo(
    () =>
      permissions.reduce<Record<string, OverviewPermission>>((map, item) => {
        map[item.id] = item
        return map
      }, {}),
    [permissions],
  )

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
        cell: ({ row }) => {
          const pending = isOptimisticId(row.original.id)
          return (
            <div className='flex items-center gap-2'>
              <p className='font-medium text-foreground'>{row.original.name}</p>
              {pending && (
                <span className='text-xs italic text-muted-foreground'>
                  Saving...
                </span>
              )}
            </div>
          )
        },
      },
      {
        id: 'permissions',
        header: t('roles.table.permissions'),
        cell: ({ row }) => (
          <PermissionsList
            role={row.original}
            pending={isOptimisticId(row.original.id)}
            permissions={permissions}
            permissionLookup={permissionLookup}
            permissionColors={permissionColors}
            onAddPermission={onAddPermission}
            onRemovePermission={onRemovePermission}
            t={t}
          />
        ),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => {
          const pending = isOptimisticId(row.original.id)
          return (
            <Button
              variant='ghost'
              size='icon'
              className='text-destructive hover:text-destructive disabled:opacity-40'
              disabled={rows.length <= 1 || pending}
              onClick={(event) => {
                event.stopPropagation()
                onDelete(row.original.id)
              }}
              aria-label={t('roles.table.delete')}
            >
              <HugeiconsIcon icon={Delete02Icon} className='size-5' />
            </Button>
          )
        },
      },
    ],
    [
      onAddPermission,
      onDelete,
      onRemovePermission,
      permissionColors,
      permissionLookup,
      permissions,
      rows.length,
      t,
    ],
  )

  return { columns }
}
