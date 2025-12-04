export interface EnumFieldProps {
  value: unknown
  t: (key: string, params?: Record<string, unknown>) => string
}
