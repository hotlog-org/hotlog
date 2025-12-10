import { useEffect, useMemo, useState } from 'react'
import { z } from 'zod'
import type { AddRoleModalProps } from './add-role.modal'

const schema = z.object({
  name: z.string().min(2, 'Role name is required'),
  permissionIds: z.array(z.string()).min(1, 'Select at least one permission'),
})

export const useAddRoleModalService = ({
  open,
  permissions,
  onSubmit,
  onClose,
}: AddRoleModalProps) => {
  const [name, setName] = useState('')
  const [permissionIds, setPermissionIds] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      setName('')
      setPermissionIds([])
      setSearch('')
      setError(null)
    }
  }, [open])

  const filteredPermissions = useMemo(() => {
    if (!search.trim()) return permissions
    const normalized = search.trim().toLowerCase()
    return permissions.filter(
      (permission) =>
        permission.label.toLowerCase().includes(normalized) ||
        permission.category.toLowerCase().includes(normalized),
    )
  }, [permissions, search])

  const togglePermission = (id: string) => {
    setPermissionIds((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id],
    )
  }

  const handleSubmit = () => {
    const parsed = schema.safeParse({ name: name.trim(), permissionIds })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid role')
      return
    }

    onSubmit(parsed.data)
    onClose()
  }

  return {
    name,
    setName,
    permissionIds,
    filteredPermissions,
    togglePermission,
    search,
    setSearch,
    error,
    handleSubmit,
  }
}
