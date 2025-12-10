import type { UsersSearchProps } from './users-search.component'

export const useUsersSearchService = ({
  value,
  onChange,
}: UsersSearchProps) => {
  const handleChange = (next: string) => {
    onChange(next)
  }

  return { search: value, handleChange }
}
