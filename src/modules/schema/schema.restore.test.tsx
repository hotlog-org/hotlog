import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
} from '@testing-library/react'
import { HTTPError } from 'ky'
import type { PropsWithChildren } from 'react'
import { beforeEach, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({
  create: vi.fn(),
  update: vi.fn(),
  read: vi.fn(),
  fields: vi.fn(),
  canUpdate: true,
}))
vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }))
vi.mock('@/shared/api/user-permission', () => ({
  useUserPermissions: () => ({
    can: (permission: string) =>
      permission !== 'update:schemas' || api.canUpdate,
  }),
}))
vi.mock('@/shared/api/schema/schema.api', () => ({
  createSchemaApi: api.create,
  updateSchemaApi: api.update,
  schemasQueryApi: api.read,
  schemaFieldsQueryApi: api.fields,
  saveSchemaDraftApi: vi.fn(),
}))
import useSchemaService from './schema.service'
import { CreateSchemaDialog } from './schema.component'
import { useDashboardProject } from '@/shared/store/dashboard-project.store'
import { ESchemaKey } from '@/shared/api/interface'

const conflict = {
  id: 'schema-a',
  key: 'order_created',
  displayName: 'Original schema',
}
const restored = {
  ...conflict,
  status: 'active',
  createdAt: '',
  fieldsCount: 2,
  eventsCount: 10,
}
function archivedError(
  code = 'SCHEMA_KEY_ARCHIVED',
  schema: unknown = conflict,
) {
  return new HTTPError(
    Response.json(
      { error: { code, schema, message: 'Key already exists' } },
      { status: 409 },
    ),
    new Request('https://hotlog.invalid/api/project/schemas'),
    {} as ConstructorParameters<typeof HTTPError>[2],
  )
}
function setup() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Infinity },
      mutations: { retry: false },
    },
  })
  client.setQueryData(
    [ESchemaKey.SCHEMAS_QUERY, 'project-a', { includeArchived: false }],
    { data: [] },
  )
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  return { ...renderHook(useSchemaService, { wrapper }), client }
}
beforeEach(() => {
  useDashboardProject.setState({ selectedProjectId: 'project-a' })
  api.canUpdate = true
  api.create.mockRejectedValue(archivedError())
  api.read.mockResolvedValue({ data: [] })
  api.fields.mockResolvedValue({ data: [] })
  api.update.mockImplementation(async () => {
    api.read.mockResolvedValue({ data: [restored] })
    return { data: restored }
  })
})

it('offers explicit restoration, preserving the original identity and refreshing the schema list', async () => {
  const { result } = setup()
  act(() => result.current.addSchema())
  await act(() => result.current.submitCreateSchema('Order Created'))
  expect(result.current.createSchemaOpen).toBe(true)
  expect(result.current.archivedSchemaConflict).toMatchObject(conflict)
  expect(api.update).not.toHaveBeenCalled()
  await act(() => result.current.restoreConflictingSchema(conflict.key))
  expect(api.update).toHaveBeenCalledExactlyOnceWith({
    id: conflict.id,
    status: 'active',
  })
  expect(result.current.createSchemaOpen).toBe(false)
  expect(result.current.selectedSchema?.id).toBe(conflict.id)
  expect(result.current.rows[0].displayName).toBe(conflict.displayName)
})

it('keeps the conflict dialog open and displays a failed restore', async () => {
  const { result } = setup()
  act(() => result.current.addSchema())
  await act(() => result.current.submitCreateSchema('Order Created'))
  api.update.mockRejectedValueOnce(new Error('Restore denied'))
  await act(() => result.current.restoreConflictingSchema(conflict.key))
  expect(result.current.createSchemaOpen).toBe(true)
  expect(result.current.createSchemaError).toBe('Restore denied')
  expect(result.current.archivedSchemaConflict).toMatchObject(conflict)
  expect(result.current.selectedSchema).toBeNull()
})

it('requires update permission even if the restore handler is called directly', async () => {
  api.canUpdate = false
  const { result } = setup()
  act(() => result.current.addSchema())
  await act(() => result.current.submitCreateSchema('Order Created'))
  expect(result.current.canRestoreSchema).toBe(false)
  await act(() => result.current.restoreConflictingSchema(conflict.key))
  expect(api.update).not.toHaveBeenCalled()
})

it('clears stale conflict actions on draft changes and checks the submitted key', async () => {
  const { result } = setup()
  act(() => result.current.addSchema())
  await act(() => result.current.submitCreateSchema('Order Created'))
  await act(() => result.current.restoreConflictingSchema('other_key'))
  expect(api.update).not.toHaveBeenCalled()
  act(() => result.current.clearCreateSchemaConflict())
  expect(result.current.archivedSchemaConflict).toBeNull()
  expect(result.current.createSchemaError).toBeNull()
})

it.each(['SCHEMA_KEY_EXISTS', 'UNKNOWN'])(
  'does not offer restoration for %s',
  async (code) => {
    api.create.mockRejectedValueOnce(archivedError(code))
    const { result } = setup()
    act(() => result.current.addSchema())
    await act(() => result.current.submitCreateSchema('Order Created'))
    expect(result.current.archivedSchemaConflict).toBeNull()
    expect(result.current.createSchemaError).toBeTruthy()
  },
)

it('blocks duplicate restores and dialog dismissal throughout a pending restore', async () => {
  let resolve!: (value: { data: typeof restored }) => void
  api.update.mockReturnValueOnce(
    new Promise((yes) => {
      resolve = yes
    }),
  )
  const { result } = setup()
  act(() => result.current.addSchema())
  await act(() => result.current.submitCreateSchema('Order Created'))
  let pending!: Promise<void>
  act(() => {
    pending = result.current.restoreConflictingSchema(conflict.key)
    void result.current.restoreConflictingSchema(conflict.key)
    result.current.closeCreateSchema()
  })
  await waitFor(() => expect(api.update).toHaveBeenCalledTimes(1))
  expect(result.current.createSchemaOpen).toBe(true)
  expect(result.current.isRestoringSchema).toBe(true)
  await act(async () => {
    resolve({ data: restored })
    await pending
  })
  expect(result.current.isRestoringSchema).toBe(false)
})

it('ignores late creation conflicts after switching projects', async () => {
  let reject!: (error: Error) => void
  api.create.mockReturnValueOnce(
    new Promise((_resolve, no) => {
      reject = no
    }),
  )
  const { result } = setup()
  act(() => result.current.addSchema())
  let pending!: Promise<void>
  act(() => {
    pending = result.current.submitCreateSchema('Order Created')
  })
  await waitFor(() => expect(api.create).toHaveBeenCalled())
  act(() => useDashboardProject.setState({ selectedProjectId: 'project-b' }))
  await act(async () => {
    reject(archivedError())
    await pending
  })
  expect(result.current.archivedSchemaConflict).toBeNull()
  expect(result.current.createSchemaOpen).toBe(false)
})

it('ignores a late restore result and invalidates only its original project', async () => {
  let resolve!: (value: { data: typeof restored }) => void
  api.update.mockReturnValueOnce(
    new Promise((yes) => {
      resolve = yes
    }),
  )
  const { result, client } = setup()
  act(() => result.current.addSchema())
  await act(() => result.current.submitCreateSchema('Order Created'))
  const invalidate = vi.spyOn(client, 'invalidateQueries')
  let pending!: Promise<void>
  act(() => {
    pending = result.current.restoreConflictingSchema(conflict.key)
  })
  await waitFor(() => expect(api.update).toHaveBeenCalled())
  act(() => useDashboardProject.setState({ selectedProjectId: 'project-b' }))
  await act(async () => {
    resolve({ data: restored })
    await pending
  })
  expect(invalidate).toHaveBeenCalledWith({
    queryKey: [ESchemaKey.SCHEMAS_QUERY, 'project-a'],
  })
  expect(result.current.selectedSchema).toBeNull()
  expect(result.current.createSchemaOpen).toBe(false)
})

it('renders the restore choice only for the current draft and locks it while pending', () => {
  const onRestore = vi.fn()
  const onDraftChange = vi.fn()
  const props = {
    open: true,
    onClose: vi.fn(),
    onSubmit: vi.fn(),
    isSubmitting: false,
    error: 'Archived key',
    conflict,
    onDraftChange,
    onRestore,
    isRestoring: false,
    t: ((key: string) => key) as ReturnType<typeof useSchemaService>['t'],
  }
  const { rerender } = render(<CreateSchemaDialog {...props} />)
  fireEvent.change(screen.getByRole('textbox'), {
    target: { value: 'Order Created' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'createDialog.restore' }))
  expect(onRestore).toHaveBeenCalledWith(conflict.key)
  expect(
    screen.getByRole('button', { name: 'createDialog.create' }),
  ).toBeDisabled()
  rerender(<CreateSchemaDialog {...props} isSubmitting isRestoring />)
  expect(
    screen.getByRole('button', { name: 'createDialog.restoring' }),
  ).toBeDisabled()
  expect(screen.getByRole('textbox')).toBeDisabled()
  rerender(<CreateSchemaDialog {...props} onRestore={undefined} />)
  expect(
    screen.queryByRole('button', { name: 'createDialog.restore' }),
  ).toBeNull()
  expect(
    screen.getByText('createDialog.restoreNoPermission'),
  ).toBeInTheDocument()
  fireEvent.change(screen.getByRole('textbox'), {
    target: { value: 'Another Schema' },
  })
  expect(onDraftChange).toHaveBeenCalled()
  expect(screen.queryByText(conflict.displayName)).toBeNull()
})
