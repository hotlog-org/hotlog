'use client'

import useOverviewService from './overview.service'

import { ApiRequestsGraph } from './fields/graph/api-requests-graph.component'
import { ApiKeyCard } from './fields/key/api-key-card.component'
import { AddRoleModal } from './fields/modals/add-role/add-role.modal'
import { InviteMemberModal } from './fields/modals/invite-member/invite-member.modal'
import { RolesAction } from './fields/tables/roles/action/roles-action.component'
import { RolesSearch } from './fields/tables/roles/search/roles-search.component'
import { RolesTable } from './fields/tables/roles/table/roles-table.component'
import { UsersAction } from './fields/tables/users/action/users-action.component'
import { UsersSearch } from './fields/tables/users/search/users-search.component'
import { UsersTable } from './fields/tables/users/table/users-table.component'
import { Button } from '@/shared/ui/button'
import { Card, CardHeader } from '@/shared/ui/card'

export function OverviewComponent() {
  const service = useOverviewService()

  return (
    <div className='flex min-h-0 flex-1 flex-col gap-4'>
      <ApiRequestsGraph data={service.apiRequests} t={service.t} />

      <ApiKeyCard
        keyValue={service.apiKey}
        onRegenerate={service.regenerateApiKey}
        t={service.t}
      />

      <Card>
        <CardHeader>
          <div className='space-y-3'>
            <div className='flex flex-wrap items-center justify-between gap-3'>
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
              </div>

              <div className='flex flex-wrap items-center gap-2'>
                {service.tab === 'users' ? (
                  <>
                    <UsersAction
                      onInvite={service.openInviteModal}
                      t={service.t}
                    />
                    <UsersSearch
                      value={service.userSearch}
                      onChange={service.setUserSearch}
                      t={service.t}
                    />
                  </>
                ) : (
                  <>
                    <RolesAction
                      onAdd={service.openAddRoleModal}
                      t={service.t}
                    />
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
              <UsersTable
                rows={service.filteredUsers}
                roles={service.roles}
                roleOptions={service.roleOptions}
                onChangeRole={service.updateUserRole}
                onRemove={service.removeUser}
                onRevoke={service.revokeInvite}
                t={service.t}
              />
            ) : (
              <RolesTable
                rows={service.filteredRoles}
                permissions={service.permissions}
                permissionColors={service.permissionColors}
                onAddPermission={service.addPermissionToRole}
                onRemovePermission={service.removePermissionFromRole}
                onDelete={service.deleteRole}
                t={service.t}
              />
            )}
          </div>

          <InviteMemberModal
            open={service.inviteModalOpen}
            onClose={service.closeInviteModal}
            onSubmit={(email) => {
              service.inviteMember(email)
              service.closeInviteModal()
            }}
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
    </div>
  )
}
