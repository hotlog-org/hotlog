import type { FieldWithMeta, TFunction } from '../../schema.service'
import type { SchemaFieldType } from '../../schema.interface'

export interface SchemaFieldRendererProps {
  field: FieldWithMeta
  t: TFunction
  typeOptions: SchemaFieldType[]
  typeStyles: Record<SchemaFieldType, string>
  onItemTypeChange: (fieldId: string, type: SchemaFieldType) => void
  onEnumChange: (fieldId: string, values: string[]) => void
  onRangeChange: (
    fieldId: string,
    range: { min?: number | null; max?: number | null },
  ) => void
}
