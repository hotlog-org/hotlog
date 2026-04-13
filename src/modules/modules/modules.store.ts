import { create } from 'zustand'

interface ModulesStoreState {
  selectedModuleId: string | null
  setSelectedModuleId: (id: string | null) => void
}

export const useModulesStore = create<ModulesStoreState>((set) => ({
  selectedModuleId: null,
  setSelectedModuleId: (id) => set({ selectedModuleId: id }),
}))
