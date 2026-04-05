import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

interface IState {
  selectedProjectId?: string
}

interface IStore extends IState {
  handleDashboardProject: (value: Partial<IState>) => void
}

export const useDashboardProject = create<IStore>()(
  devtools(
    (set) => ({
      selectedProjectId: undefined,

      handleDashboardProject: (params: Partial<IState>) =>
        set((state) => ({
          ...state,
          ...params,
        })),
    }),
    {
      enabled:
        process.env.NODE_ENV !== 'production' && typeof window !== 'undefined',
    },
  ),
)
