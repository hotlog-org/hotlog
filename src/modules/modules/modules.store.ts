import { create } from 'zustand'

import { modulesMock } from './mock-data'
import type {
  ModuleCreationPayload,
  ModuleDefinition,
} from './modules.interface'

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '') || `module-${Date.now()}`

interface ModulesStoreState {
  modules: ModuleDefinition[]
  selectedModuleId: string | null
  setSelectedModuleId: (id: string) => void
  addModule: (payload: ModuleCreationPayload) => ModuleDefinition
  updateModule: (module: ModuleDefinition) => void
  deleteModule: (id: string) => void
  setModules: (modules: ModuleDefinition[]) => void
  reset: () => void
}

export const useModulesStore = create<ModulesStoreState>((set) => ({
  modules: modulesMock,
  selectedModuleId: modulesMock[0]?.id ?? null,
  setSelectedModuleId: (id) => set({ selectedModuleId: id }),
  addModule: (payload) => {
    let createdModule: ModuleDefinition | null = null

    set((state) => {
      const baseId = slugify(payload.name)
      let id = baseId
      let counter = 1

      while (state.modules.some((module) => module.id === id)) {
        id = `${baseId}-${counter}`
        counter += 1
      }

      createdModule = {
        id,
        name: payload.name,
        color: payload.color,
        heroTitle: payload.name,
        heroDescription: '',
        components: [],
      }

      return {
        modules: [...state.modules, createdModule],
        selectedModuleId: id,
      }
    })

    return createdModule as unknown as ModuleDefinition
  },
  updateModule: (module) =>
    set((state) => ({
      modules: state.modules.map((item) =>
        item.id === module.id ? module : item,
      ),
    })),
  deleteModule: (id) =>
    set((state) => {
      const next = state.modules.filter((item) => item.id !== id)
      return {
        modules: next,
        selectedModuleId: next[0]?.id ?? null,
      }
    }),
  setModules: (modules) => set({ modules }),
  reset: () =>
    set({ modules: modulesMock, selectedModuleId: modulesMock[0]?.id ?? null }),
}))
