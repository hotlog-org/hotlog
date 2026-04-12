'use client'

import { Folder02Icon, Loading03Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import useOverviewService from './overview.service'

import { ApiRequestsGraph } from './fields/graph/api-requests-graph.component'
import { ApiKeyCard } from './fields/key/api-key-card.component'
import { DangerZone } from './fields/danger-zone/danger-zone.component'
import { AddRoleModal } from './fields/modals/add-role/add-role.modal'
import { DeleteProjectModal } from './fields/modals/delete-project/delete-project.modal'
import { InviteMemberModal } from './fields/modals/invite-member/invite-member.modal'
import { RolesAction } from './fields/tables/roles/action/roles-action.component'
import { RolesSearch } from './fields/tables/roles/search/roles-search.component'
import { RolesTable } from './fields/tables/roles/table/roles-table.component'
import { UsersAction } from './fields/tables/users/action/users-action.component'
import { UsersSearch } from './fields/tables/users/search/users-search.component'
import { UsersTable } from './fields/tables/users/table/users-table.component'
import { Button } from '@/shared/ui/button'
import { Card, CardHeader } from '@/shared/ui/card'

function NoPermission({ message }: { message: string }) {
  return (
    <div className='flex items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/5 py-12'>
      <p className='text-sm text-muted-foreground'>{message}</p>
    </div>
  )
}

function LoadingSpinner() {
  return (
    <div className='flex items-center justify-center py-12'>
      <HugeiconsIcon
        icon={Loading03Icon}
        className='size-6 animate-spin text-muted-foreground'
      />
    </div>
  )
}

function EmptyProject() {
  return (
    <div className='flex flex-1 items-center justify-center'>
      <div className='flex flex-col items-center gap-4 text-center'>
        <div className='flex size-16 items-center justify-center rounded-full border border-dashed border-border/60 bg-muted/10'>
          <HugeiconsIcon
            icon={Folder02Icon}
            className='size-7 text-muted-foreground'
          />
        </div>
        <div className='space-y-1'>
          <p className='text-sm font-medium text-foreground'>
            No project selected
          </p>
          <p className='text-sm text-muted-foreground'>
            Create a project from the sidebar to get started.
          </p>
        </div>
      </div>
    </div>
  )
}

export function OverviewComponent() {
  const service = useOverviewService()

  if (service.hasNoProject) {
    return <EmptyProject />
  }

  const canViewUsersTab = service.canReadUsers
  const canViewRolesTab = service.canReadRoles

  return (
    <div className='flex min-h-0 flex-1 flex-col gap-4'>
      <ApiRequestsGraph
        data={service.apiRequests}
        loading={service.apiRequestsLoading}
        t={service.t}
      />

      <ApiKeyCard
        keyValue={service.apiKey}
        loading={service.apiKeyLoading}
        canRead={service.canReadApiKey}
        canCreate={service.canCreateApiKey}
        isRegenerating={service.isRegeneratingApiKey}
        onRegenerate={service.regenerateApiKey}
        t={service.t}
      />

      <Card className='overflow-hidden'>
        <CardHeader>
          <div className='min-w-0 space-y-3'>
            <div className='flex items-center gap-2'>
              <Button
                size='sm'
                variant={service.tab === 'users' ? 'secondary' : 'ghost'}
                onClick={() => service.setTab('users')}
              >
                {service.t('tabs.users')}
              </Button>
              <Button
                size='sm'
                variant={service.tab === 'roles' ? 'secondary' : 'ghost'}
                onClick={() => service.setTab('roles')}
              >
                {service.t('tabs.roles')}
              </Button>

              <div className='ml-auto flex items-center gap-2'>
                {service.tab === 'users' &&
                  canViewUsersTab &&
                  !service.isLoading && (
                    <>
                      {service.canCreateUsers && (
                        <UsersAction
                          onInvite={service.openInviteModal}
                          t={service.t}
                        />
                      )}
                      <UsersSearch
                        value={service.userSearch}
                        onChange={service.setUserSearch}
                        t={service.t}
                      />
                    </>
                  )}
                {service.tab === 'roles' &&
                  canViewRolesTab &&
                  !service.isLoading && (
                    <>
                      {service.canCreateRoles && (
                        <RolesAction
                          onAdd={service.openAddRoleModal}
                          t={service.t}
                        />
                      )}
                      <RolesSearch
                        value={service.roleSearch}
                        onChange={service.setRoleSearch}
                        t={service.t}
                      />
                    </>
                  )}
              </div>
            </div>

            {service.tab === 'users' ? (
              service.isLoading ? (
                <LoadingSpinner />
              ) : canViewUsersTab ? (
                <UsersTable
                  rows={service.filteredUsers}
                  roles={service.roles}
                  roleOptions={service.roleOptions}
                  currentUserId={service.currentUserId}
                  canUpdateRoles={service.canUpdateRoles}
                  onChangeRole={service.updateUserRole}
                  onRemove={service.removeUser}
                  onRevoke={service.revokeInvite}
                  t={service.t}
                />
              ) : (
                <NoPermission message="You don't have enough permissions :(" />
              )
            ) : service.isLoading ? (
              <LoadingSpinner />
            ) : canViewRolesTab ? (
              <RolesTable
                rows={service.filteredRoles}
                permissions={service.permissions}
                permissionColors={service.permissionColors}
                onAddPermission={service.addPermissionToRole}
                onRemovePermission={service.removePermissionFromRole}
                onDelete={service.deleteRole}
                t={service.t}
              />
            ) : (
              <NoPermission message="You don't have enough permissions :(" />
            )}
          </div>

          <InviteMemberModal
            open={service.inviteModalOpen}
            onClose={service.closeInviteModal}
            onSubmit={(email, roleId) => {
              service.inviteMember(email, roleId)
            }}
            roleOptions={service.roleOptions}
            t={service.t}
          />

          <AddRoleModal
            open={service.addRoleModalOpen}
            onClose={service.closeAddRoleModal}
            onSubmit={(payload) => {
              service.addRole(payload)
              service.closeAddRoleModal()
            }}
            permissions={service.permissions}
            permissionColors={service.permissionColors}
            t={service.t}
          />
        </CardHeader>
      </Card>

      {service.canDeleteProject && (
        <DangerZone
          projectName={service.projectName}
          onDelete={service.openDeleteProjectModal}
        />
      )}

      <DeleteProjectModal
        open={service.deleteProjectModalOpen}
        onClose={service.closeDeleteProjectModal}
        onSubmit={service.deleteProject}
        projectName={service.projectName}
        isDeleting={service.isDeletingProject}
        t={service.t}
      />
    </div>
  )
}
