import { devtools } from 'zustand/middleware'
import { create } from 'zustand'

interface IState {
  component?: React.JSX.Element
}

interface IStore extends IState {
  handleDashboardNavbarExtra: (value: Partial<IState>) => void
}

export const useDashboardNavbarExtra = create<IStore>()(
  devtools(
    (set) => ({
      component: undefined,

      handleDashboardNavbarExtra: (params: Partial<IState>) =>
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
