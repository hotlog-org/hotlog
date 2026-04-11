import type { FieldWithMeta, TFunction } from '../../../schema.service'
import type { SchemaFieldType } from '../../../schema.interface'

export type FieldCardProps = {
  field: FieldWithMeta
  t: TFunction
  canEdit: boolean
  canArchive: boolean
  onArchiveField: (fieldId: string) => void
  onRestoreField: (fieldId: string) => void
  onFieldDisplayNameChange: (fieldId: string, value: string) => void
  onFieldKeyChange: (fieldId: string, value: string) => void
  onFieldRequiredChange: (fieldId: string, value: boolean) => void
  onFieldTypeChange: (fieldId: string, type: SchemaFieldType) => void
  onEnumChange: (fieldId: string, values: string[]) => void
  onRangeChange: (
    fieldId: string,
    range: { min?: number | null; max?: number | null },
  ) => void
  onItemTypeChange: (fieldId: string, type: SchemaFieldType) => void
  onSelectField: (fieldId: string) => void
}
