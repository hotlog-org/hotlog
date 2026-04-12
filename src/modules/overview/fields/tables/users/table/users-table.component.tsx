'use client'

import { DataTable } from '@/shared/ui/data-table'

import type {
  OverviewRole,
  OverviewUser,
  RoleOption,
} from '../../../../overview.interface'
import type { TFunction } from '../../../../overview.service'
import { useUsersTableService } from './users-table.service'

export interface UsersTableProps {
  rows: OverviewUser[]
  roles: OverviewRole[]
  roleOptions: RoleOption[]
  currentUserId: string
  canUpdateRoles: boolean
  canDeleteUsers: boolean
  onChangeRole: (userId: string, roleId: string) => void
  onRemove: (userId: string) => void
  onRevoke: (userId: string) => void
  t: TFunction
}

export function UsersTable(props: UsersTableProps) {
  const service = useUsersTableService(props)

  return <DataTable columns={service.columns} data={props.rows} t={props.t} />
}
