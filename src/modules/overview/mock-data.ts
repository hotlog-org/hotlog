import type { ApiRequestSeriesPoint, PermissionCategory } from './overview.interface'

const permissionColors: Record<PermissionCategory, string> = {
  all: 'border-white/30 bg-black text-white',
  projects: 'border-slate-500/40 bg-slate-500/10 text-slate-200',
  events: 'border-yellow-500/40 bg-yellow-500/10 text-yellow-300',
  schemas: 'border-purple-500/40 bg-purple-500/10 text-purple-300',
  fields: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300',
  layouts: 'border-pink-500/40 bg-pink-500/10 text-pink-300',
  components: 'border-orange-500/40 bg-orange-500/10 text-orange-300',
  roles: 'border-red-500/50 bg-red-500/10 text-red-300',
  permissions: 'border-indigo-500/40 bg-indigo-500/10 text-indigo-300',
  users: 'border-blue-500/40 bg-blue-500/10 text-blue-300',
  api_keys: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
}

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
