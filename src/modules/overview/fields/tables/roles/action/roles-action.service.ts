import type { RolesActionProps } from './roles-action.component'

export const useRolesActionService = ({ onAdd }: RolesActionProps) => {
  const handleAddRole = () => onAdd()
  return { handleAddRole }
}
