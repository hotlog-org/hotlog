import {
  keepPreviousData,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, it, vi } from 'vitest'
import { ELayoutKey, type ILayoutDto } from '@/shared/api/interface'

const api = vi.hoisted(() => ({
  read: vi.fn(),
  update: vi.fn(),
  batch: vi.fn(),
}))
vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }))
vi.mock('@/shared/api/layout/layout.api', () => ({
  layoutsQueryApi: api.read,
  updateLayoutApi: api.update,
  batchComponentsApi: api.batch,
  createLayoutApi: vi.fn(),
  deleteLayoutApi: vi.fn(),
  addRoleLayoutApi: vi.fn(),
  removeRoleLayoutApi: vi.fn(),
}))
vi.mock('@/shared/api/schema', () => ({
  useSchemasQuery: () => ({ data: undefined }),
  useSchemaFieldsQuery: () => ({ data: undefined }),
}))
vi.mock('@/shared/api/project-role/project-role.hook', () => ({
  useProjectRolesQuery: () => ({ data: { data: [{ id: 'r', name: 'Role' }] } }),
}))
vi.mock('@/shared/api/user-permission/user-permission.hook', () => ({
  useUserPermissions: () => ({ can: () => true }),
}))
// Render actual controls/view handlers, not canvas charts.
vi.mock('@/shared/charts', () =>
  Object.fromEntries(
    [
      'AreaChart',
      'BarChart',
      'DonutChart',
      'HeatmapChart',
      'HistogramChart',
      'LineChart',
      'PieChart',
      'ScatterChart',
      'StackedBarChart',
      'TimelineChart',
    ].map((name) => [name, () => null]),
  ),
)
import { ModulesComponent } from './modules.component'
import { ModulesEditor } from './fields/editor/modules-editor.component'
import type { TFunction } from './modules.interface'
import { useModulesStore } from './modules.store'
import { useDashboardProject } from '@/shared/store/dashboard-project.store'

const component = {
  id: 'c',
  visualization: 'line',
  schemaId: 'schema',
  bindings: [],
  title: 'Chart',
  description: '',
  index: 0,
  span: 'full',
}
const original: ILayoutDto = {
  id: 1,
  name: 'A',
  description: 'Description',
  color: '#000000',
  roleIds: ['r'],
  createdAt: '',
  components: [component],
}
beforeEach(() => {
  useDashboardProject.setState({ selectedProjectId: 'p' })
  useModulesStore.setState({ selectedModuleId: '1' })
  api.read.mockReturnValue(new Promise(() => {}))
  api.batch.mockResolvedValue({ data: [component] })
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  )
})

it('shows skeletons on first load and never shows the previous project while switching', async () => {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, placeholderData: keepPreviousData },
    },
  })
  const { container } = render(
    <QueryClientProvider client={client}>
      <ModulesComponent moduleId='1' />
    </QueryClientProvider>,
  )
  expect(container.querySelector('[data-slot="skeleton"]')).not.toBeNull()
  expect(screen.queryByText('emptyModule')).toBeNull()

  client.setQueryData([ELayoutKey.LAYOUTS_QUERY, 'p'], {
    data: [original],
    currentUserRoleIds: [],
  })
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'A' })).toBeInTheDocument(),
  )

  act(() => useDashboardProject.setState({ selectedProjectId: 'other' }))
  expect(container.querySelector('[data-slot="skeleton"]')).not.toBeNull()
  expect(screen.queryByRole('button', { name: 'A' })).toBeNull()
  expect(screen.queryByText('emptyModule')).toBeNull()
})

it('shows a failed module load as an error, not as an empty module', async () => {
  api.read.mockRejectedValueOnce(new Error('Load failed'))
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  render(
    <QueryClientProvider client={client}>
      <ModulesComponent moduleId='1' />
    </QueryClientProvider>,
  )
  expect(await screen.findByRole('alert')).toHaveTextContent('Load failed')
  expect(screen.queryByText('emptyModule')).toBeNull()
})

it.each(['success', 'failure'] as const)(
  'disables module edit controls during PATCH and unlocks after %s',
  async (outcome) => {
    let resolve!: (response: { data: ILayoutDto }) => void
    let reject!: (error: Error) => void
    api.update.mockReturnValueOnce(
      new Promise((yes, no) => {
        resolve = yes
        reject = no
      }),
    )
    const client = new QueryClient({
      defaultOptions: {
        queries: { staleTime: Infinity, retry: false },
        mutations: { retry: false },
      },
    })
    client.setQueryData([ELayoutKey.LAYOUTS_QUERY, 'p'], {
      data: [original],
      currentUserRoleIds: [],
    })
    const { container } = render(
      <QueryClientProvider client={client}>
        <ModulesComponent moduleId='1' />
      </QueryClientProvider>,
    )
    const user = userEvent.setup()
    await user.click(screen.getByTitle('controls.dragOff'))
    expect(screen.getByRole('button', { name: 'actions.edit' })).toBeEnabled()
    expect(container.querySelector('[draggable="true"]')).not.toBeNull()
    await user.click(screen.getByRole('button', { name: 'A' }))
    await user.clear(screen.getByDisplayValue('A'))
    await user.type(screen.getByRole('textbox'), 'B')
    await user.click(screen.getByRole('button', { name: 'controls.save' }))
    await waitFor(() => expect(api.update).toHaveBeenCalledTimes(1))
    expect(screen.getByRole('button', { name: 'B' })).toBeDisabled()
    expect(screen.getByDisplayValue('#000000')).toBeDisabled()
    expect(screen.getByText('Description')).toHaveAttribute(
      'aria-disabled',
      'true',
    )
    expect(screen.getByRole('button', { name: 'visibility.addRole' })).toBeDisabled()
    expect(
      screen.getByRole('button', { name: 'actions.addComponent' }),
    ).toBeDisabled()
    expect(screen.getByTitle('controls.dragOn')).toBeDisabled()
    expect(
      screen.getByRole('button', { name: 'controls.cancel' }),
    ).toBeDisabled()
    expect(screen.getByRole('button', { name: 'controls.save' })).toBeDisabled()
    expect(
      screen.queryByRole('button', { name: 'actions.edit' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'actions.delete' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'actions.halfWidth' }),
    ).not.toBeInTheDocument()
    expect(container.querySelector('[draggable="true"]')).toBeNull()
    await user.click(screen.getByRole('button', { name: 'B' }))
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    await act(async () => {
      if (outcome === 'success') resolve({ data: { ...original, name: 'B' } })
      else reject(new Error('Denied'))
    })
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'B' })).toBeEnabled(),
    )
    expect(
      screen.getByRole('button', { name: 'actions.addComponent' }),
    ).toBeEnabled()
    expect(screen.getByDisplayValue('#000000')).toBeEnabled()
    if (outcome === 'failure')
      expect(screen.getByRole('alert')).toHaveTextContent('Denied')
    await user.click(screen.getByRole('button', { name: 'B' }))
    await user.clear(screen.getByRole('textbox'))
    await user.type(screen.getByRole('textbox'), 'C')
    expect(screen.getByRole('textbox')).toHaveValue('C')
    client.clear()
  },
)

it('disables portalled component editor fields and submission without losing its local draft', async () => {
  const onSubmit = vi.fn()
  const props = {
    open: true,
    mode: 'edit' as const,
    component: {
      ...component,
      kind: 'chart' as const,
      visualization: 'line' as const,
      span: 'full' as const,
    },
    schemas: [{ id: 'schema', name: 'Schema', fields: [] }],
    visualizations: [{ id: 'line' as const, label: 'Line', inputs: [] }],
    onSubmit,
    onClose: vi.fn(),
    t: ((key: string) => key) as TFunction,
  }
  const { rerender } = render(<ModulesEditor {...props} disabled />)
  expect(screen.getByDisplayValue('Chart')).toBeDisabled()
  expect(
    screen.getByPlaceholderText('drawer.descriptionPlaceholder'),
  ).toBeDisabled()
  for (const select of screen.getAllByRole('combobox'))
    expect(select).toBeDisabled()
  expect(screen.getByRole('button', { name: 'drawer.save' })).toBeDisabled()
  fireEvent.change(screen.getByDisplayValue('Chart'), {
    target: { value: 'Changed' },
  })
  expect(screen.getByDisplayValue('Chart')).toBeDisabled()
  fireEvent.click(screen.getByRole('button', { name: 'drawer.save' }))
  expect(onSubmit).not.toHaveBeenCalled()
  rerender(<ModulesEditor {...props} disabled={false} />)
  expect(screen.getByDisplayValue('Chart')).toBeEnabled()
  fireEvent.click(screen.getByRole('button', { name: 'drawer.save' }))
  expect(onSubmit).toHaveBeenCalledWith(
    expect.objectContaining({ id: 'c', title: 'Chart' }),
  )
})
