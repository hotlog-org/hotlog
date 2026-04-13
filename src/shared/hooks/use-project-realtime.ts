'use client'

import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { createClient } from '@/lib/supabase/client'
import { EProjectMemberKey } from '@/shared/api/interface/project-member.interface'
import { EUserPermissionKey } from '@/shared/api/interface/user-permission.interface'
import { EInvitationKey } from '@/shared/api/interface/invitation.interface'

// Query keys from the project-role interface
const PROJECT_ROLES_QUERY = 'project_roles_query'

/**
 * Subscribes to realtime changes on permission-related tables
 * and invalidates the relevant React Query caches.
 */
export function useProjectRealtime(projectId?: string) {
  const queryClient = useQueryClient()
  const [supabase] = useState(createClient)

  useEffect(() => {
    if (!projectId) return

    const channel = supabase
      .channel(`project-${projectId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_roles' },
        () => {
          queryClient.invalidateQueries({
            queryKey: [EProjectMemberKey.PROJECT_MEMBERS_QUERY, projectId],
          })
          queryClient.invalidateQueries({
            queryKey: [EUserPermissionKey.USER_PERMISSIONS_QUERY, projectId],
          })
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'role_permissions' },
        () => {
          queryClient.invalidateQueries({
            queryKey: [PROJECT_ROLES_QUERY, projectId],
          })
          queryClient.invalidateQueries({
            queryKey: [EUserPermissionKey.USER_PERMISSIONS_QUERY, projectId],
          })
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_projects' },
        () => {
          queryClient.invalidateQueries({
            queryKey: [EProjectMemberKey.PROJECT_MEMBERS_QUERY, projectId],
          })
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'invitations' },
        () => {
          queryClient.invalidateQueries({
            queryKey: [EInvitationKey.INVITATIONS_QUERY, projectId],
          })
          queryClient.invalidateQueries({
            queryKey: [EProjectMemberKey.PROJECT_MEMBERS_QUERY, projectId],
          })
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'roles' },
        () => {
          queryClient.invalidateQueries({
            queryKey: [PROJECT_ROLES_QUERY, projectId],
          })
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [projectId, queryClient, supabase])
}
