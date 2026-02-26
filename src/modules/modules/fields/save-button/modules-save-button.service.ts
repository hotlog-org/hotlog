import type { ModulesSaveButtonProps } from './modules-save-button.component'

export const useModulesSaveButtonService = ({ t }: ModulesSaveButtonProps) => {
  return { label: t('controls.save') }
}
