import type { ModulesCancelButtonProps } from './modules-cancel-button.component'

export const useModulesCancelButtonService = ({
  t,
}: ModulesCancelButtonProps) => {
  return { label: t('controls.cancel') }
}
