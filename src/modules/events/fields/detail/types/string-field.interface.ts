export interface StringFieldProps {
  value: unknown
  t: (key: string, params?: Record<string, unknown>) => string
}
