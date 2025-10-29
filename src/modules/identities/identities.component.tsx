'use client'

import { PlusIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { useEffect, useMemo, useState } from 'react'
import { useGroupService } from '../group/group.service'
import { AreaChart, LineChart } from './charts'
import { IGroup, IMember } from './identities.service'

type DateRange = {
  from: Date
  to: Date
}

function formatDateForInput(d?: Date) {
  if (!d) return ''
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function parseDateFromInput(v: string) {
  if (!v) return undefined
  const parts = v.split('-')
  if (parts.length !== 3) return undefined
  const [y, m, d] = parts.map(Number)
  return new Date(y, m - 1, d)
}

export function DateRangePicker({
  date,
  setDate,
}: {
  date?: DateRange
  setDate: (d?: DateRange) => void
}) {
  const [from, setFrom] = useState<string>(formatDateForInput(date?.from))
  const [to, setTo] = useState<string>(formatDateForInput(date?.to))

  useEffect(() => {
    setFrom(formatDateForInput(date?.from))
    setTo(formatDateForInput(date?.to))
  }, [date])

  return (
    <div className="flex items-center space-x-2">
      <input
        type="date"
        value={from}
        onChange={(e) => setFrom(e.target.value)}
        className="border border-neutral-700 bg-neutral-900 text-neutral-100 rounded-md py-1 px-2 text-sm"
      />
      <span className="text-sm text-neutral-400">–</span>
      <input
        type="date"
        value={to}
        onChange={(e) => setTo(e.target.value)}
        className="border border-neutral-700 bg-neutral-900 text-neutral-100 rounded-md py-1 px-2 text-sm"
      />
      <button
        onClick={() => {
          const f = parseDateFromInput(from)
          const t = parseDateFromInput(to)
          if (f && t) setDate({ from: f, to: t })
        }}
        className="ml-2 inline-flex items-center px-3 py-1 bg-sky-500 hover:bg-sky-600 text-white rounded-md text-sm"
      >
        Apply
      </button>
      <button
        onClick={() => {
          setFrom('')
          setTo('')
          setDate(undefined)
        }}
        className="ml-2 text-sm text-neutral-400 hover:text-neutral-200"
      >
        Clear
      </button>
    </div>
  )
}

interface IdentitiesProps {
  groups: IGroup[]
}

export function IdentitiesComponent({ groups }: IdentitiesProps) {
  const [selectedGroup, setSelectedGroup] = useState<IGroup | null>(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [localGroups, setLocalGroups] = useState<IGroup[]>(groups)

  // Roles state (admins can add/remove)
  const [roles, setRoles] = useState<string[]>(['admin', 'user', 'viewer'])
  const [newRole, setNewRole] = useState<string>('')

  // New-group island state
  const [isNewGroupOpen, setIsNewGroupOpen] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupDesc, setNewGroupDesc] = useState('')
  const [newGroupAccess, setNewGroupAccess] = useState<string>('user')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedMembers, setSelectedMembers] = useState<IMember[]>([])

  useEffect(() => setLocalGroups(groups), [groups])

  // build a simple people pool from existing groups (dedup by email)
  const peoplePool = useMemo(() => {
    const map = new Map<string, IMember>()
    localGroups.forEach((g) =>
      g.members.forEach((m) => {
        if (!map.has(m.email)) map.set(m.email, m)
      })
    )
    // add a few extras for search testing
    const extras: IMember[] = [
      { id: 'x1', name: 'Helen Park', email: 'helen@example.com', role: 'viewer' },
      { id: 'x2', name: 'Ian Cole', email: 'ian@example.com', role: 'user' },
      { id: 'x3', name: 'Judy Kim', email: 'judy@example.com', role: 'user' },
    ]
    extras.forEach((e) => {
      if (!map.has(e.email)) map.set(e.email, e)
    })
    return Array.from(map.values())
  }, [localGroups])

  const searchResults = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    if (!q) return peoplePool.slice(0, 8)
    return peoplePool.filter((p) => p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q)).slice(0, 8)
  }, [searchTerm, peoplePool])

  const openGroup = (g: IGroup) => {
    setSelectedGroup(g)
    setIsSidebarOpen(true)
    document.body.style.overflow = 'hidden'
  }

  const closeSidebar = () => {
    setIsSidebarOpen(false)
    setSelectedGroup(null)
    document.body.style.overflow = ''
  }

  const changeMemberRole = (groupId: string, memberId: string, role: IGroup['members'][0]['role']) => {
    setLocalGroups((prev) =>
      prev.map((g) =>
        g.id === groupId
          ? { ...g, members: g.members.map((m) => (m.id === memberId ? { ...m, role } : m)) }
          : g
      )
    )
  }

  const removeMember = (groupId: string, memberId: string) => {
    setLocalGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, members: g.members.filter((m) => m.id !== memberId) } : g))
    )
  }

  const addRole = () => {
    const r = newRole.trim()
    if (!r) return
    if (roles.includes(r)) {
      setNewRole('')
      return
    }
    setRoles((prev) => [...prev, r])
    setNewRole('')
  }

  const deleteRole = (roleToDelete: string) => {
    const core = ['admin', 'user', 'viewer']
    if (core.includes(roleToDelete)) return
    setRoles((prev) => prev.filter((r) => r !== roleToDelete))
    setLocalGroups((prev) =>
      prev.map((g) =>
        g.members.some((m) => m.role === roleToDelete)
          ? { ...g, members: g.members.map((m) => (m.role === roleToDelete ? { ...m, role: 'viewer' } : m)) }
          : g
      )
    )
  }

  const toggleSelectPerson = (person: IMember) => {
    setSelectedMembers((prev) => {
      if (prev.some((p) => p.email === person.email)) return prev.filter((p) => p.email !== person.email)
      return [...prev, { ...person }]
    })
  }

  const createGroup = () => {
    if (!newGroupName.trim()) return
    const id = `group-${Date.now()}`
    const group: IGroup = {
      id,
      name: newGroupName.trim(),
      description: newGroupDesc.trim(),
      createdAt: new Date(),
      members: selectedMembers.map((m) => ({ ...m, role: newGroupAccess })),
    }
    setLocalGroups((prev) => [group, ...prev])
    // reset island
    setIsNewGroupOpen(false)
    setNewGroupName('')
    setNewGroupDesc('')
    setNewGroupAccess('user')
    setSearchTerm('')
    setSelectedMembers([])
  }

  return (
    <div className="flex min-h-screen bg-neutral-910 text-neutral-100">
      {/* Main */}
      <div className="flex-1 p-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-semibold">Groups</h1>
            <p className="text-sm text-neutral-400 mt-1">Manage teams, roles and access</p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsNewGroupOpen(true)}
              className="inline-flex items-center px-4 py-2 rounded-md text-neutral-100 font-medium bg-transparent border border-neutral-700 shadow-sm hover:bg-neutral-800/22 hover:border-neutral-600 focus:outline-none focus:ring-2 focus:ring-neutral-700 focus:ring-offset-1"
              aria-label="Create new group"
            >
              <PlusIcon className="h-5 w-5 mr-2 text-neutral-200" />
              New Group
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {localGroups.map((group) => (
            <div
              key={group.id}
              onClick={() => openGroup(group)}
              role="button"
              tabIndex={0}
              className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 min-h-[160px] cursor-pointer hover:scale-[1.02] transform transition duration-200 shadow-sm hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className="max-w-[70%]">
                  <h3 className="text-xl font-semibold leading-tight">{group.name}</h3>
                  {group.description && (
                    <p className="text-sm text-neutral-400 mt-1 line-clamp-2">{group.description}</p>
                  )}
                </div>
                <div className="text-sm text-neutral-400 whitespace-nowrap">
                  {new Date(group.createdAt).toLocaleDateString()}
                </div>
              </div>

              <div className="flex items-center mt-5 justify-between">
                <div className="flex -space-x-3">
                  {group.members.slice(0, 5).map((m) => (
                    <img
                      key={m.id}
                      src={m.avatar || `https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(m.email)}`}
                      alt={m.name}
                      className="w-12 h-12 rounded-full ring-1 ring-neutral-800 object-cover"
                    />
                  ))}
                </div>

                <div className="text-sm text-neutral-300 flex items-center gap-2">
                  <span className="px-2 py-1 rounded-full bg-neutral-820 text-xs">{group.members.length} members</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Overlay + Sidebar */}
      {isSidebarOpen && selectedGroup && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40" onClick={closeSidebar} aria-hidden="true" />
          <aside
            className="fixed inset-y-0 right-0 w-full max-w-sm md:max-w-md z-50 transform translate-x-0 transition-transform duration-300"
            role="dialog"
            aria-modal="true"
          >
            <div className="h-full bg-neutral-900 border-l border-neutral-800 shadow-2xl flex flex-col">
              <div className="p-6 border-b border-neutral-800 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold">{selectedGroup.name}</h2>
                  <p className="text-sm text-neutral-400">{selectedGroup.description}</p>
                </div>
                <button onClick={closeSidebar} className="p-1 rounded-md text-neutral-400 hover:text-neutral-200" aria-label="Close">
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="p-5 overflow-y-auto flex-1 space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-neutral-400">Members</p>
                    <p className="text-xs text-neutral-500">{selectedGroup.members.length} total</p>
                  </div>
                </div>

                {/* Role manager (admins can create/remove roles) */}
                <div className="bg-neutral-800 border border-neutral-800 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-sm font-medium">Roles</p>
                      <p className="text-xs text-neutral-500">Define custom roles for access control</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 mb-3">
                    <input
                      type="text"
                      placeholder="New role name"
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value)}
                      className="flex-1 bg-transparent border border-neutral-700 rounded-md py-2 px-3 text-sm text-neutral-100"
                    />
                    <button
                      onClick={addRole}
                      className="px-3 py-2 rounded-md text-sm bg-transparent border border-neutral-700 text-neutral-100 hover:bg-neutral-800/20"
                      aria-label="Add role"
                    >
                      Add
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {roles.map((r) => (
                      <div key={r} className="flex items-center gap-2 bg-neutral-820 px-3 py-1 rounded-md border border-neutral-800">
                        <span className="text-xs text-neutral-200 capitalize">{r}</span>
                        {!['admin', 'user', 'viewer'].includes(r) && (
                          <button onClick={() => deleteRole(r)} className="text-xs text-red-400 hover:text-red-300" aria-label={`Delete role ${r}`}>
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  {selectedGroup.members.map((member: IMember) => (
                    <div key={member.id} className="flex items-center justify-between bg-neutral-800 border border-neutral-800 rounded-md p-3">
                      <div className="flex items-center">
                        <img src={member.avatar || `https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(member.email)}`} alt={member.name} className="w-12 h-12 rounded-full mr-3 object-cover" />
                        <div>
                          <p className="font-medium">{member.name}</p>
                          <p className="text-sm text-neutral-400">{member.email}</p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <select
                          value={member.role}
                          onChange={(e) => changeMemberRole(selectedGroup.id, member.id, e.target.value as IMember['role'])}
                          className="bg-neutral-800 border border-neutral-700 text-sm rounded-md py-1 px-2 text-neutral-100"
                        >
                          {roles.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>

                        <button onClick={() => removeMember(selectedGroup.id, member.id)} className="p-2 rounded-md hover:bg-red-600/20" title="Remove member">
                          <TrashIcon className="h-5 w-5 text-red-400" />
                        </button>
                      </div>
                    </div>
                  ))}

                  <div className="pt-2 border-t border-neutral-800">
                    <button className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md font-medium bg-transparent border border-neutral-700 text-neutral-100 hover:bg-neutral-800/20 focus:outline-none focus:ring-2 focus:ring-neutral-700 focus:ring-offset-1" aria-label="Grant access to members">
                      Grant access
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </>
      )}

      {/* New Group Island (centered panel) */}
      {isNewGroupOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setIsNewGroupOpen(false)} />
          <div className="fixed z-60 inset-0 flex items-start justify-center pt-24 px-4">
            <div className="w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-xl z-60">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Create new group</h3>
                <button onClick={() => setIsNewGroupOpen(false)} className="text-neutral-400 hover:text-neutral-200 p-1 rounded-md" aria-label="Close new group">
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="text-sm text-neutral-300">Group name</label>
                  <input
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    className="mt-2 w-full bg-transparent border border-neutral-700 rounded-md px-3 py-2 text-sm text-neutral-100"
                    placeholder="e.g. Platform Team"
                  />
                </div>

                <div>
                  <label className="text-sm text-neutral-300">Description</label>
                  <textarea
                    value={newGroupDesc}
                    onChange={(e) => setNewGroupDesc(e.target.value)}
                    className="mt-2 w-full bg-transparent border border-neutral-700 rounded-md px-3 py-2 text-sm text-neutral-100"
                    rows={3}
                    placeholder="Short description of the group"
                  />
                </div>

                <div className="flex gap-4 items-end">
                  <div className="flex-1">
                    <label className="text-sm text-neutral-300">Default role for members</label>
                    <select
                      value={newGroupAccess}
                      onChange={(e) => setNewGroupAccess(e.target.value)}
                      className="mt-2 w-full bg-transparent border border-neutral-700 rounded-md px-3 py-2 text-sm text-neutral-100"
                    >
                      {roles.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="w-64">
                    <label className="text-sm text-neutral-300">Search people</label>
                    <input
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search by name or email"
                      className="mt-2 w-full bg-transparent border border-neutral-700 rounded-md px-3 py-2 text-sm text-neutral-100"
                    />
                  </div>
                </div>

                <div>
                  <p className="text-sm text-neutral-400 mb-2">Results</p>
                  <div className="max-h-44 overflow-auto space-y-2">
                    {searchResults.map((p) => {
                      const selected = selectedMembers.some((s) => s.email === p.email)
                      return (
                        <div key={p.email} className="flex items-center justify-between bg-neutral-800 border border-neutral-800 rounded-md p-2">
                          <div className="flex items-center gap-3">
                            <img src={p.avatar || `https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(p.email)}`} alt={p.name} className="w-8 h-8 rounded-full" />
                            <div>
                              <div className="text-sm font-medium">{p.name}</div>
                              <div className="text-xs text-neutral-500">{p.email}</div>
                            </div>
                          </div>
                          <button
                            onClick={() => toggleSelectPerson(p)}
                            className={`px-3 py-1 rounded-md text-sm ${selected ? 'bg-neutral-700 border border-neutral-600' : 'bg-transparent border border-neutral-700 hover:bg-neutral-800/20'}`}
                            aria-pressed={selected}
                          >
                            {selected ? 'Selected' : 'Add'}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div>
                  <p className="text-sm text-neutral-400 mb-2">Selected members</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedMembers.length === 0 && <div className="text-xs text-neutral-500">No members selected</div>}
                    {selectedMembers.map((m) => (
                      <div key={m.email} className="flex items-center gap-2 bg-neutral-820 px-3 py-1 rounded-md">
                        <img src={m.avatar || `https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(m.email)}`} alt={m.name} className="w-6 h-6 rounded-full" />
                        <div className="text-xs">
                          <div className="font-medium">{m.name}</div>
                          <div className="text-neutral-500">{m.email}</div>
                        </div>
                        <button onClick={() => toggleSelectPerson(m)} className="ml-2 text-xs text-red-400">×</button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-2">
                  <button onClick={() => setIsNewGroupOpen(false)} className="px-4 py-2 rounded-md bg-transparent border border-neutral-700 text-neutral-100">Cancel</button>
                  <button onClick={createGroup} className="px-4 py-2 rounded-md bg-neutral-100 text-neutral-900 font-medium">Create</button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}