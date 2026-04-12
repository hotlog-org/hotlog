import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

interface IState {
  selectedProjectId?: string
}

interface IStore extends IState {
  handleDashboardProject: (value: Partial<IState>) => void
}

export const useDashboardProject = create<IStore>()(
  devtools(
    persist(
      (set) => ({
        selectedProjectId: undefined,

        handleDashboardProject: (params: Partial<IState>) =>
          set((state) => ({
            ...state,
            ...params,
          })),
      }),
      {
        name: 'hotlog-selected-project',
        partialize: (state) => ({ selectedProjectId: state.selectedProjectId }),
      },
    ),
    {
      enabled:
        process.env.NODE_ENV !== 'production' && typeof window !== 'undefined',
    },
  ),
)
