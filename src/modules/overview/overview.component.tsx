'use client'

import { Folder02Icon } from '@hugeicons/core-free-icons'
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
import { Skeleton } from '@/shared/ui/skeleton'

function NoPermission({ message }: { message: string }) {
  return (
    <div className='flex items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/5 py-12'>
      <p className='text-sm text-muted-foreground'>{message}</p>
    </div>
  )
}

function MembersTableSkeleton({ label }: { label: string }) {
  return (
    <div
      role='status'
      aria-label={label}
      aria-busy='true'
      className='space-y-3'
      data-testid='members-skeleton'
    >
      <span className='sr-only'>{label}</span>
      <div className='flex gap-4 border-b pb-3'>
        <Skeleton className='h-4 w-36 flex-1' />
        <Skeleton className='h-4 w-28' />
        <Skeleton className='h-4 w-20' />
      </div>
      {Array.from({ length: 5 }, (_, index) => (
        <div key={index} className='flex items-center gap-4 py-2'>
          <Skeleton className='size-9 shrink-0 rounded-full' />
          <Skeleton className='h-4 min-w-0 flex-1' />
          <Skeleton className='h-4 w-28' />
          <Skeleton className='h-7 w-20' />
        </div>
      ))}
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
      {service.actionError && (
        <p role='alert' className='text-sm text-destructive'>
          {service.actionError}
        </p>
      )}
      {service.statsError && (
        <p role='alert' className='text-sm text-destructive'>
          {service.statsError}
        </p>
      )}
      <ApiRequestsGraph
        data={service.apiRequests}
        loading={service.apiRequestsLoading}
        t={service.t}
      />

      <ApiKeyCard
        keyValue={service.apiKey}
        keys={service.apiKeys}
        selectedId={service.selectedApiKeyId}
        onSelect={service.selectApiKey}
        onDismiss={service.dismissApiKey}
        onRevoke={service.revokeApiKey}
        error={service.apiKeyError}
        canDelete={service.canDeleteApiKey}
        loading={service.apiKeyLoading}
        canRead={service.canReadApiKey}
        canCreate={service.canCreateApiKey}
        isRegenerating={service.isRegeneratingApiKey}
        onCreate={service.createApiKey}
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

            {service.loadError && (
              <p role='alert' className='text-sm text-destructive'>
                {service.loadError}
              </p>
            )}
            {service.tab === 'users' ? (
              service.isLoading ? (
                <MembersTableSkeleton label={service.t('tabs.users')} />
              ) : service.loadError &&
                service.filteredUsers.length === 0 ? null : canViewUsersTab ? (
                <UsersTable
                  rows={service.filteredUsers}
                  roles={service.roles}
                  roleOptions={service.roleOptions}
                  currentUserId={service.currentUserId}
                  canUpdateRoles={service.canUpdateRoles}
                  canDeleteUsers={service.canDeleteUsers}
                  onChangeRole={service.updateUserRole}
                  onRemove={service.removeUser}
                  onRevoke={service.revokeInvite}
                  t={service.t}
                />
              ) : (
                <NoPermission message="You don't have enough permissions :(" />
              )
            ) : service.isLoading ? (
              <MembersTableSkeleton label={service.t('tabs.roles')} />
            ) : service.loadError &&
              service.filteredRoles.length === 0 ? null : canViewRolesTab ? (
              <RolesTable
                rows={service.filteredRoles}
                permissions={service.permissions}
                permissionColors={service.permissionColors}
                canUpdateRoles={service.canUpdateRoles}
                canDeleteRoles={service.canDeleteRoles}
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
            error={service.inviteError}
            isSubmitting={service.isInviting}
            roleOptions={service.roleOptions}
            t={service.t}
          />

          <AddRoleModal
            open={service.addRoleModalOpen}
            onClose={service.closeAddRoleModal}
            onSubmit={service.addRole}
            error={service.addRoleError}
            isSubmitting={service.isAddingRole}
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
        error={service.deleteProjectError}
        t={service.t}
      />
    </div>
  )
}
