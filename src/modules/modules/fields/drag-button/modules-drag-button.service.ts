import type { ModulesDragButtonProps } from './modules-drag-button.component'

export const useModulesDragButtonService = ({
  active,
  t,
}: ModulesDragButtonProps) => {
  const label = active ? t('controls.dragOn') : t('controls.dragOff')

  return { label }
}
