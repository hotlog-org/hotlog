import { useMemo } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import {
  ArrowDown01Icon,
  Delete02Icon,
  UserBlock01Icon,
  UserStatusIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover'
import { ScrollArea } from '@/shared/ui/scroll-area'

import type {
  OverviewRole,
  OverviewUser,
  RoleOption,
} from '../../../../overview.interface'
import type { UsersTableProps } from './users-table.component'

export interface UsersTableService {
  columns: ColumnDef<OverviewUser>[]
}

const renderRoleSelector = (
  user: OverviewUser,
  roleOptions: RoleOption[],
  roleLookup: Record<string, OverviewRole>,
  onSelect: (roleId: string) => void,
) => {
  const selected = roleLookup[user.roleId]
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant='outline'
          size='sm'
          className='w-full justify-between border-border/70 bg-muted/40'
        >
          <span className='truncate'>{selected?.name ?? 'Role'}</span>
          <HugeiconsIcon icon={ArrowDown01Icon} className='size-4 opacity-70' />
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-56 border-border/80 bg-card p-0'>
        <ScrollArea className='max-h-64'>
          <div className='divide-y divide-border/70'>
            {roleOptions.map((option) => {
              const isActive = option.value === user.roleId
              return (
                <button
                  type='button'
                  key={option.value}
                  onClick={(event) => {
                    event.preventDefault()
                    onSelect(option.value)
                  }}
                  className={`flex w-full items-center justify-between px-3 py-2 text-sm transition hover:bg-accent/50 ${
                    isActive ? 'bg-accent/50 font-medium' : ''
                  }`}
                >
                  <span className='truncate'>{option.label}</span>
                  {isActive && (
                    <span className='text-xs text-foreground'>
                      <HugeiconsIcon icon={UserStatusIcon} className='size-4' />
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}

export const useUsersTableService = ({
  roleOptions,
  roles,
  onChangeRole,
  onRemove,
  onRevoke,
  t,
}: UsersTableProps): UsersTableService => {
  const roleLookup = useMemo(
    () =>
      roles.reduce<Record<string, OverviewRole>>((acc, role) => {
        acc[role.id] = role
        return acc
      }, {}),
    [roles],
  )

  const columns: ColumnDef<OverviewUser>[] = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: t('users.table.name'),
        cell: ({ row }) => (
          <div className='space-y-1'>
            <p className='font-medium text-foreground'>{row.original.name}</p>
          </div>
        ),
      },
      {
        accessorKey: 'email',
        header: t('users.table.email'),
        cell: ({ row }) => (
          <p className='text-sm text-muted-foreground'>{row.original.email}</p>
        ),
      },
      {
        id: 'role',
        header: t('users.table.role'),
        cell: ({ row }) =>
          renderRoleSelector(row.original, roleOptions, roleLookup, (roleId) =>
            onChangeRole(row.original.id, roleId),
          ),
      },
      {
        id: 'status',
        header: t('users.table.status'),
        cell: ({ row }) => (
          <Badge
            variant='outline'
            className={
              row.original.status === 'pending'
                ? 'border-amber-500/50 bg-amber-500/10 text-amber-200'
                : 'border-emerald-500/50 bg-emerald-500/10 text-emerald-200'
            }
          >
            {t(`users.status.${row.original.status}`)}
          </Badge>
        ),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => {
          const isPending = row.original.status === 'pending'
          return (
            <div className='flex items-center'>
              <Button
                variant='ghost'
                size='icon'
                className='text-destructive hover:text-destructive'
                onClick={(event) => {
                  event.stopPropagation()
                  if (isPending) onRevoke(row.original.id)
                  else onRemove(row.original.id)
                }}
                aria-label={
                  isPending ? t('users.table.revoke') : t('users.table.remove')
                }
              >
                <HugeiconsIcon
                  icon={isPending ? UserBlock01Icon : Delete02Icon}
                  className='size-5'
                />
              </Button>
            </div>
          )
        },
      },
    ],
    [onChangeRole, onRemove, onRevoke, roleLookup, roleOptions, t],
  )

  return { columns }
}
