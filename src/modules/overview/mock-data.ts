import type { ApiRequestSeriesPoint, OverviewPermission, OverviewRole, OverviewUser, PermissionCategory } from './overview.interface'

const baseKey = 'hl_sk_0123456789abcdef_overview_mock'

export const overviewApiKeyMock = baseKey

const permissionColors: Record<PermissionCategory, string> = {
  events: 'border-yellow-500/40 bg-yellow-500/10 text-yellow-300',
  layouts: 'border-pink-500/40 bg-pink-500/10 text-pink-300',
  api: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
  project: 'border-slate-500/40 bg-slate-500/10 text-slate-200',
  schema: 'border-purple-500/40 bg-purple-500/10 text-purple-300',
  team: 'border-blue-500/40 bg-blue-500/10 text-blue-300',
  roles: 'border-red-500/50 bg-red-500/10 text-red-300',
  special: 'border-white/30 bg-black text-white',
}

export const permissionsCatalog: OverviewPermission[] = [
  { id: 'events/read', category: 'events', label: 'read' },
  { id: 'events/export', category: 'events', label: 'export' },
  { id: 'layouts/read', category: 'layouts', label: 'read' },
  { id: 'layouts/create', category: 'layouts', label: 'create' },
  { id: 'layouts/delete', category: 'layouts', label: 'delete' },
  { id: 'layouts/edit', category: 'layouts', label: 'edit' },
  { id: 'api/create-key', category: 'api', label: 'create key' },
  { id: 'api/read-key', category: 'api', label: 'read key' },
  { id: 'project/create', category: 'project', label: 'create project' },
  { id: 'project/delete', category: 'project', label: 'delete project' },
  { id: 'project/edit', category: 'project', label: 'edit project' },
  { id: 'schema/read', category: 'schema', label: 'read' },
  { id: 'schema/create', category: 'schema', label: 'create' },
  { id: 'schema/delete', category: 'schema', label: 'delete' },
  { id: 'schema/edit', category: 'schema', label: 'edit' },
  { id: 'team/invite-member', category: 'team', label: 'invite member' },
  { id: 'team/kick-member', category: 'team', label: 'kick member' },
  { id: 'team/revoke-invite', category: 'team', label: 'revoke invite' },
  { id: 'roles/create-role', category: 'roles', label: 'create role' },
  { id: 'roles/edit-role', category: 'roles', label: 'edit role' },
  { id: 'roles/delete-role', category: 'roles', label: 'delete role' },
  { id: 'special/admin', category: 'special', label: 'admin' },
]

export const overviewRolesMock: OverviewRole[] = [
  {
    id: 'owner',
    name: 'Owner',
    permissionIds: permissionsCatalog.map((permission) => permission.id),
  },
  {
    id: 'admin',
    name: 'Admin',
    permissionIds: [
      'events/read',
      'events/export',
      'layouts/read',
      'layouts/create',
      'layouts/edit',
      'api/create-key',
      'api/read-key',
      'project/create',
      'project/edit',
      'schema/read',
      'schema/create',
      'schema/edit',
      'team/invite-member',
      'team/kick-member',
      'roles/create-role',
      'roles/edit-role',
    ],
  },
  {
    id: 'developer',
    name: 'Developer',
    permissionIds: [
      'events/read',
      'layouts/read',
      'layouts/edit',
      'api/read-key',
      'project/edit',
      'schema/read',
      'schema/edit',
      'team/invite-member',
    ],
  },
  {
    id: 'viewer',
    name: 'Viewer',
    permissionIds: ['events/read', 'layouts/read', 'schema/read', 'api/read-key'],
  },
]

export const overviewUsersMock: OverviewUser[] = [
  {
    id: 'user-1',
    name: 'Elena Nash',
    email: 'elena.nash@acme.dev',
    roleId: 'owner',
    status: 'active',
  },
  {
    id: 'user-2',
    name: 'Samir Flores',
    email: 'samir.flores@acme.dev',
    roleId: 'developer',
    status: 'active',
  },
  {
    id: 'user-3',
    name: 'Dana Lee',
    email: 'dana.lee@acme.dev',
    roleId: 'admin',
    status: 'active',
  },
  {
    id: 'user-4',
    name: 'Priya Patel',
    email: 'priya.patel@acme.dev',
    roleId: 'viewer',
    status: 'pending',
  },
]

export const permissionCategoryStyles = permissionColors

export const buildApiRequestsSeries = (): ApiRequestSeriesPoint[] => {
  const now = new Date()
  const series: ApiRequestSeriesPoint[] = []

  for (let index = 0; index < 30; index++) {
    const date = new Date(now)
    date.setDate(now.getDate() - (29 - index))

    const base = 2400 + Math.sin(index / 3.5) * 700
    const cadence = (index % 6) * 90

    series.push({
      date,
      value: Math.max(320, Math.round(base + cadence)),
      category: 'API requests',
    })
  }

  return series
}
