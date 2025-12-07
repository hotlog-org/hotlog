import type { FieldWithMeta, TFunction } from '../../schema.service'
import type { SchemaFieldType } from '../../schema.interface'

export interface SchemaFieldRendererProps {
  field: FieldWithMeta
  t: TFunction
  maxDepth: number
  typeOptions: SchemaFieldType[]
  typeStyles: Record<SchemaFieldType, string>
  onAddField: (parentId?: string) => void
  onDeleteField: (fieldId: string) => void
  onFieldNameChange: (fieldId: string, name: string) => void
  onFieldTypeChange: (fieldId: string, type: SchemaFieldType) => void
  onEnumChange: (fieldId: string, values: string[]) => void
  onRangeChange: (
    fieldId: string,
    range: { min?: number | null; max?: number | null },
  ) => void
  onItemTypeChange: (fieldId: string, type: SchemaFieldType) => void
  onSelectField: (fieldId: string) => void
  renderChild: (child: FieldWithMeta) => JSX.Element
}
