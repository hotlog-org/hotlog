export interface JsonFieldProps {
  value: unknown
  t: (key: string, params?: Record<string, unknown>) => string
}
