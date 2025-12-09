import type { UsersActionProps } from './users-action.component'

export const useUsersActionService = ({ onInvite }: UsersActionProps) => {
  const handleInvite = () => onInvite()
  return { handleInvite }
}
