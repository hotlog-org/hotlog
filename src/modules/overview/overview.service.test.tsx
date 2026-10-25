import {
  keepPreviousData,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query'
import {
  act,
  render,
  renderHook,
  screen,
  waitFor,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { PropsWithChildren } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/config/env', () => ({
  envClient: { NEXT_PUBLIC_CLIENT_API_URL: 'https://hotlog.invalid/api' },
}))
vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }))
vi.mock('@/shared/hooks/use-auth', () => ({
  useAuth: () => ({ user: { id: 'synthetic' } }),
}))
const { deniedPermissions } = vi.hoisted(() => ({
  deniedPermissions: new Set<string>(),
}))
vi.mock('@/shared/api/user-permission', () => ({
  useUserPermissions: () => ({
    can: (permission: string) => !deniedPermissions.has(permission),
  }),
}))
beforeEach(() => deniedPermissions.clear())
import { useOverviewService } from './overview.service'
import { ApiKeyCard } from './fields/key/api-key-card.component'
import { AddRoleModal } from './fields/modals/add-role/add-role.modal'
import { InviteMemberModal } from './fields/modals/invite-member/invite-member.modal'
import { useDashboardProject } from '@/shared/store/dashboard-project.store'
import {
  EEventKey,
  EInvitationKey,
  EProjectApiKeyKey,
  EProjectMemberKey,
  EProjectPermissionKey,
  EProjectRoleKey,
  EUserProjectKey,
} from '@/shared/api/interface'

function setup(usePlaceholder = false) {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  )
  useDashboardProject.setState({ selectedProjectId: 'p' })
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: Infinity,
        placeholderData: usePlaceholder ? keepPreviousData : undefined,
      },
      mutations: { retry: false },
    },
  })
  for (const key of [
    EInvitationKey.INVITATIONS_QUERY,
    EProjectApiKeyKey.PROJECT_API_KEYS_QUERY,
    EProjectMemberKey.PROJECT_MEMBERS_QUERY,
    EProjectRoleKey.PROJECT_ROLES_QUERY,
  ])
    client.setQueryData([key, 'p'], { data: [] })
  client.setQueryData([EProjectPermissionKey.PROJECT_PERMISSIONS_QUERY], {
    data: [{ id: 'permission', action: 'read', subject: 'events' }],
  })
  client.setQueryData([EUserProjectKey.USER_PROJECTS_QUERY], {
    data: [{ id: 'p', name: 'Project', createdAt: '', isCreator: true }],
  })
  client.setQueryData([EEventKey.EVENT_STATS_QUERY, 'p', 30], { data: [] })
  vi.mocked(fetch).mockImplementation(async (input) =>
    (input as Request).method === 'GET'
      ? Response.json({ data: [] })
      : Response.json({ error: { message: 'Write denied' } }, { status: 403 }),
  )
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  return { client, wrapper }
}

describe('overview action failure handling', () => {
  it('keeps old project data out of members, keys and graph during a project switch', async () => {
    const { client, wrapper } = setup(true)
    client.setQueryData([EProjectMemberKey.PROJECT_MEMBERS_QUERY, 'p'], {
      data: [
        {
          id: 'member-a',
          email: 'a@invalid.test',
          roleId: null,
          isCreator: false,
        },
      ],
    })
    client.setQueryData([EProjectApiKeyKey.PROJECT_API_KEYS_QUERY, 'p'], {
      data: [{ id: 7, key_prefix: 'old', revoked_at: null }],
    })
    client.setQueryData([EEventKey.EVENT_STATS_QUERY, 'p', 30], {
      data: [{ day: '2026-01-01', count: 42 }],
    })
    vi.mocked(fetch).mockImplementation(() => new Promise(() => {}))
    const { result } = renderHook(useOverviewService, { wrapper })
    expect(result.current.users).toHaveLength(1)
    expect(result.current.apiKeys).toHaveLength(1)
    expect(result.current.apiRequests).toHaveLength(1)

    act(() => useDashboardProject.setState({ selectedProjectId: 'other' }))
    expect(result.current.isLoading).toBe(true)
    expect(result.current.users).toEqual([])
    expect(result.current.apiKeys).toEqual([])
    expect(result.current.apiRequests).toEqual([])
  })

  it('keeps project selection and delete confirmation open on failure', async () => {
    const { client, wrapper } = setup()
    const { result } = renderHook(useOverviewService, { wrapper })
    act(() => result.current.openDeleteProjectModal())
    act(() => result.current.deleteProject())
    await waitFor(() =>
      expect(result.current.deleteProjectError).toBe('Write denied'),
    )
    expect(result.current.deleteProjectModalOpen).toBe(true)
    expect(useDashboardProject.getState().selectedProjectId).toBe('p')
    client.clear()
  })

  it('retains role modal draft and renders the server error instead of closing', async () => {
    const { client, wrapper } = setup()
    function Form() {
      const service = useOverviewService()
      return (
        <>
          <button onClick={service.openAddRoleModal}>Open role</button>
          <AddRoleModal
            open={service.addRoleModalOpen}
            onClose={service.closeAddRoleModal}
            onSubmit={service.addRole}
            permissions={service.permissions}
            permissionColors={service.permissionColors}
            t={service.t}
            error={service.addRoleError}
            isSubmitting={service.isAddingRole}
          />
        </>
      )
    }
    render(<Form />, { wrapper })
    const user = userEvent.setup()
    await user.click(screen.getByText('Open role'))
    await user.type(
      screen.getByPlaceholderText('roles.modal.namePlaceholder'),
      'Draft role',
    )
    await user.click(screen.getByText('roles.modal.addPermission'))
    await user.click(screen.getByText('roles.modal.submit'))
    expect(await screen.findByRole('alert')).toHaveTextContent('Write denied')
    expect(
      screen.getByPlaceholderText('roles.modal.namePlaceholder'),
    ).toHaveValue('Draft role')
    expect(screen.getByRole('dialog')).toBeVisible()
    client.clear()
  })

  it('retains invitation email/role and shows failure without sending real email', async () => {
    const { client, wrapper } = setup()
    function Form() {
      const service = useOverviewService()
      return (
        <>
          <button onClick={service.openInviteModal}>Open invite</button>
          <InviteMemberModal
            open={service.inviteModalOpen}
            onClose={service.closeInviteModal}
            onSubmit={service.inviteMember}
            roleOptions={[{ value: 'r', label: 'Test role' }]}
            t={service.t}
            error={service.inviteError}
            isSubmitting={service.isInviting}
          />
        </>
      )
    }
    render(<Form />, { wrapper })
    const user = userEvent.setup()
    await user.click(screen.getByText('Open invite'))
    await user.type(
      screen.getByPlaceholderText('users.inviteModal.placeholder'),
      'test@example.invalid',
    )
    await user.selectOptions(screen.getByRole('combobox'), 'r')
    await user.click(screen.getByText('users.inviteModal.submit'))
    expect(await screen.findByRole('alert')).toHaveTextContent('Write denied')
    expect(
      screen.getByPlaceholderText('users.inviteModal.placeholder'),
    ).toHaveValue('test@example.invalid')
    expect(screen.getByRole('combobox')).toHaveValue('r')
    expect(screen.getByRole('dialog')).toBeVisible()
    client.clear()
  })
})

const keyMetadata = (id: number) => ({
  id,
  project_id: 'p',
  key_prefix: '12345678',
  last_used_at: null,
  revoked_at: null,
})
const secret = '12345678-1234-4123-8123-123456789012'
function setupKeys(ids = [1, 2]) {
  const setupResult = setup()
  const cacheKey = [EProjectApiKeyKey.PROJECT_API_KEYS_QUERY, 'p']
  const keys = ids.map(keyMetadata)
  setupResult.client.setQueryData(cacheKey, { data: keys })
  vi.mocked(fetch).mockImplementation(async (input) =>
    (input as Request).method === 'GET'
      ? Response.json({
          data: (input as Request).url.includes('api-keys') ? keys : [],
        })
      : Response.json({ error: { message: 'Write denied' } }, { status: 403 }),
  )
  return { ...setupResult, cacheKey, keys }
}
function KeyCard() {
  const s = useOverviewService()
  return (
    <ApiKeyCard
      keyValue={s.apiKey}
      keys={s.apiKeys}
      selectedId={s.selectedApiKeyId}
      onSelect={s.selectApiKey}
      onDismiss={s.dismissApiKey}
      onRevoke={s.revokeApiKey}
      onCreate={s.createApiKey}
      onRegenerate={s.regenerateApiKey}
      error={s.apiKeyError}
      loading={s.apiKeyLoading}
      canRead={s.canReadApiKey}
      canCreate={s.canCreateApiKey}
      canDelete={s.canDeleteApiKey}
      isRegenerating={s.isRegeneratingApiKey}
      t={s.t}
    />
  )
}
describe('selected API key lifecycle', () => {
  it('requires an explicit selection with multiple keys and cannot reveal old secrets', async () => {
    const { client, wrapper } = setupKeys()
    render(<KeyCard />, { wrapper })
    expect(screen.getByRole('button', { name: 'apiKey.rotate' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'apiKey.revoke' })).toBeDisabled()
    expect(
      screen.queryByRole('button', { name: 'apiKey.reveal' }),
    ).not.toBeInTheDocument()
    await userEvent.selectOptions(screen.getByRole('combobox'), '2')
    expect(screen.getByRole('button', { name: 'apiKey.rotate' })).toBeEnabled()
    expect(screen.getByText('apiKey.lostResponse')).toBeVisible()
    client.clear()
  })
  it.each(['create:api_keys', 'delete:api_keys'])(
    'gates rotation when missing %s',
    async (permission) => {
      const { client, wrapper } = setupKeys([1])
      deniedPermissions.add(permission)
      render(<KeyCard />, { wrapper })
      expect(
        screen.queryByRole('button', { name: 'apiKey.rotate' }),
      ).not.toBeInTheDocument()
      expect(
        Boolean(screen.queryByRole('button', { name: 'apiKey.generate' })),
      ).toBe(permission !== 'create:api_keys')
      expect(
        Boolean(screen.queryByRole('button', { name: 'apiKey.revoke' })),
      ).toBe(permission !== 'delete:api_keys')
      client.clear()
    },
  )
  it('rotates only the selected key once, displays a secret and retains metadata only in both caches', async () => {
    const { client, wrapper, keys } = setupKeys()
    let finish!: (value: Response) => void
    vi.mocked(fetch).mockImplementation((input) =>
      (input as Request).method === 'PATCH'
        ? new Promise<Response>((resolve) => {
            finish = resolve
          })
        : Promise.resolve(Response.json({ data: keys })),
    )
    const { result } = renderHook(useOverviewService, { wrapper })
    act(() => result.current.selectApiKey(2))
    act(() => {
      result.current.regenerateApiKey()
      result.current.regenerateApiKey()
    })
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))
    const req = vi.mocked(fetch).mock.calls[0][0] as Request
    expect(req.method).toBe('PATCH')
    expect(await req.json()).toEqual({ project_id: 'p', id: 2 })
    await act(async () => {
      finish(Response.json({ data: { ...keyMetadata(3), key: secret } }))
    })
    await waitFor(() => expect(result.current.apiKey).toBe(secret))
    expect(result.current.selectedApiKeyId).toBe(3)
    expect(
      JSON.stringify(
        client
          .getQueryCache()
          .getAll()
          .map((q) => q.state),
      ),
    ).not.toContain(secret)
    expect(
      JSON.stringify(
        client
          .getMutationCache()
          .getAll()
          .map((m) => m.state),
      ),
    ).not.toContain(secret)
    expect(
      vi
        .mocked(fetch)
        .mock.calls.filter(([r]) => (r as Request).method === 'DELETE'),
    ).toHaveLength(0)
    act(() => result.current.dismissApiKey())
    expect(result.current.apiKey).toBeNull()
    client.clear()
  })
  it.each(['create', 'rotate', 'revoke'])(
    'failed %s retains active keys and reports the error',
    async (action) => {
      const { client, wrapper, keys } = setupKeys([1, 2])
      const { result } = renderHook(useOverviewService, { wrapper })
      act(() => result.current.selectApiKey(2))
      act(() => {
        if (action === 'create') result.current.createApiKey()
        else if (action === 'rotate') result.current.regenerateApiKey()
        else result.current.revokeApiKey()
      })
      await waitFor(() =>
        expect(result.current.apiKeyError).toBe('Write denied'),
      )
      expect(result.current.apiKey).toBeNull()
      expect(result.current.apiKeys).toEqual(keys)
      expect(result.current.selectedApiKeyId).toBe(2)
      client.clear()
    },
  )
  it('creation delivers one-time secret without putting it in mutation data', async () => {
    const { client, wrapper } = setupKeys([])
    vi.mocked(fetch).mockImplementation(async (input) =>
      Response.json({
        data:
          (input as Request).method === 'POST'
            ? { ...keyMetadata(3), key: secret }
            : [keyMetadata(3)],
      }),
    )
    const { result } = renderHook(useOverviewService, { wrapper })
    act(() => result.current.createApiKey())
    await waitFor(() => expect(result.current.apiKey).toBe(secret))
    expect(
      JSON.stringify(
        client
          .getMutationCache()
          .getAll()
          .map((m) => m.state),
      ),
    ).not.toContain(secret)
    act(() => result.current.selectApiKey(3))
    expect(result.current.apiKey).toBeNull()
    client.clear()
  })
  it('drops a late secret after switching away and back to the original project', async () => {
    const { client, wrapper } = setupKeys([1])
    let finish!: (value: Response) => void
    vi.mocked(fetch).mockImplementation((input) =>
      (input as Request).method === 'PATCH'
        ? new Promise<Response>((resolve) => {
            finish = resolve
          })
        : Promise.resolve(Response.json({ data: [] })),
    )
    const { result } = renderHook(useOverviewService, { wrapper })
    act(() => result.current.regenerateApiKey())
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))
    act(() => useDashboardProject.setState({ selectedProjectId: 'other' }))
    act(() => useDashboardProject.setState({ selectedProjectId: 'p' }))
    await act(async () => {
      finish(Response.json({ data: { ...keyMetadata(3), key: secret } }))
    })
    await waitFor(() => expect(result.current.isRegeneratingApiKey).toBe(false))
    expect(result.current.apiKey).toBeNull()
    client.clear()
  })
  it('renders one-time reveal/copy/dismiss controls only for newly issued secrets', async () => {
    const { client, wrapper } = setupKeys([])
    vi.mocked(fetch).mockImplementation(async (input) =>
      Response.json({
        data:
          (input as Request).method === 'POST'
            ? { ...keyMetadata(3), key: secret }
            : [keyMetadata(3)],
      }),
    )
    const user = userEvent.setup()
    render(<KeyCard />, { wrapper })
    await user.click(screen.getByRole('button', { name: 'apiKey.generate' }))
    expect(await screen.findByLabelText('apiKey.secret')).toHaveValue(secret)
    expect(screen.getByLabelText('apiKey.secret')).toHaveAttribute(
      'type',
      'password',
    )
    await user.click(screen.getByRole('button', { name: 'apiKey.reveal' }))
    expect(screen.getByLabelText('apiKey.secret')).toHaveAttribute(
      'type',
      'text',
    )
    await user.click(screen.getByRole('button', { name: 'apiKey.copy' }))
    expect(await navigator.clipboard.readText()).toBe(secret)
    await user.click(screen.getByRole('button', { name: 'apiKey.dismiss' }))
    expect(screen.queryByLabelText('apiKey.secret')).not.toBeInTheDocument()
    client.clear()
  })
})

describe('one-time key response uncertainty', () => {
  it('does not automatically retry a lost rotation response and retains metadata with an error', async () => {
    const { client, wrapper, keys } = setupKeys([1])
    vi.mocked(fetch).mockImplementation(async (input) => {
      if ((input as Request).method === 'PATCH')
        throw new Error('Response lost')
      return Response.json({ data: keys })
    })
    const { result } = renderHook(useOverviewService, { wrapper })
    act(() => result.current.regenerateApiKey())
    await waitFor(() =>
      expect(result.current.apiKeyError).toBe('Response lost'),
    )
    expect(result.current.apiKeys).toEqual(keys)
    expect(result.current.apiKey).toBeNull()
    expect(
      vi
        .mocked(fetch)
        .mock.calls.filter(([r]) => (r as Request).method === 'PATCH'),
    ).toHaveLength(1)
    client.clear()
  })

  it('allows create without delete or read permission but blocks rotate/revoke', async () => {
    const { client, wrapper } = setupKeys([1])
    deniedPermissions.add('read:api_keys')
    deniedPermissions.add('delete:api_keys')
    vi.mocked(fetch).mockResolvedValue(
      Response.json({ data: { ...keyMetadata(3), key: secret } }),
    )
    const { result } = renderHook(useOverviewService, { wrapper })
    act(() => {
      result.current.regenerateApiKey()
      result.current.revokeApiKey()
    })
    expect(fetch).not.toHaveBeenCalled()
    act(() => result.current.createApiKey())
    await waitFor(() => expect(result.current.apiKey).toBe(secret))
    expect((vi.mocked(fetch).mock.calls[0][0] as Request).method).toBe('POST')
    client.clear()
  })
})
