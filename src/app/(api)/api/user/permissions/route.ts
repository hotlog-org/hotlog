import { type NextRequest, NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import {
  type IApiErrorResponse,
  type IUserPermissionsResponse,
} from '@/shared/api/interface'
import {
  isAppAction,
  isAppSubject,
  type PermissionString,
} from '@/shared/utils'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get('project_id')

  if (!projectId) {
    return NextResponse.json<IApiErrorResponse>(
      {
        error: {
          message: 'project_id is required',
        },
      },
      { status: 400 },
    )
  }

  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json<IApiErrorResponse>(
      {
        error: {
          message: 'Unauthorized',
        },
      },
      { status: 401 },
    )
  }

  const { data: membership, error: membershipError } = await supabase
    .from('user_projects')
    .select('id')
    .eq('user_id', user.id)
    .eq('project_id', projectId)
    .maybeSingle()

  if (membershipError) {
    return NextResponse.json<IApiErrorResponse>(
      {
        error: {
          message: membershipError.message,
        },
      },
      { status: 500 },
    )
  }

  if (!membership) {
    return NextResponse.json<IApiErrorResponse>(
      {
        error: {
          message: 'Forbidden',
        },
      },
      { status: 403 },
    )
  }

  const { data: roles, error: rolesError } = await supabase
    .from('roles')
    .select('id, user_roles!inner(user_id)')
    .eq('project_id', projectId)
    .eq('user_roles.user_id', user.id)

  if (rolesError) {
    return NextResponse.json<IApiErrorResponse>(
      {
        error: {
          message: rolesError.message,
        },
      },
      { status: 500 },
    )
  }

  const roleIds = (roles ?? []).map((role) => role.id)

  if (!roleIds.length) {
    return NextResponse.json<IUserPermissionsResponse>({
      data: {
        projectId,
        permissions: [],
      },
    })
  }

  const { data: permissionRows, error: permissionsError } = await supabase
    .from('permissions')
    .select('action, subject, role_permissions!inner(role_id)')
    .in('role_permissions.role_id', roleIds)

  if (permissionsError) {
    return NextResponse.json<IApiErrorResponse>(
      {
        error: {
          message: permissionsError.message,
        },
      },
      { status: 500 },
    )
  }

  const permissions = [
    ...new Set(
      (permissionRows ?? []).flatMap((permissionRow) => {
        if (
          !isAppAction(permissionRow.action) ||
          !isAppSubject(permissionRow.subject)
        ) {
          return []
        }

        return [
          `${permissionRow.action}:${permissionRow.subject}` as PermissionString,
        ]
      }),
    ),
  ]

  return NextResponse.json<IUserPermissionsResponse>({
    data: {
      projectId,
      permissions,
    },
  })
}
