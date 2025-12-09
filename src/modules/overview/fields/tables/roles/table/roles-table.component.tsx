'use client'

import { DataTable } from '@/shared/ui/data-table'

import type {
  OverviewPermission,
  OverviewRole,
  PermissionCategory,
} from '../../../../overview.interface'
import type { TFunction } from '../../../../overview.service'
import { useRolesTableService } from './roles-table.service'

export interface RolesTableProps {
  rows: OverviewRole[]
  permissions: OverviewPermission[]
  permissionColors: Record<PermissionCategory | string, string>
  onAddPermission: (roleId: string, permissionId: string) => void
  onRemovePermission: (roleId: string, permissionId: string) => void
  onDelete: (roleId: string) => void
  t: TFunction
}

export function RolesTable(props: RolesTableProps) {
  const service = useRolesTableService(props)

  return <DataTable columns={service.columns} data={props.rows} t={props.t} />
}
