import type { RolesSearchProps } from './roles-search.component'

export const useRolesSearchService = ({
  value,
  onChange,
}: RolesSearchProps) => {
  const handleChange = (next: string) => onChange(next)
  return { search: value, handleChange }
}
