'use client'

import type { SchemaFieldRendererProps } from '../schema-field-renderer.interface'
import { Field, FieldControl, FieldLabel } from '@/shared/ui/field'
import { Input } from '@/shared/ui/input'

export function SchemaFieldNumber(props: SchemaFieldRendererProps) {
  return (
    <div className='grid grid-cols-2 gap-3'>
      <Field>
        <FieldLabel>{props.t('editor.min')}</FieldLabel>
        <FieldControl>
          <Input
            type='number'
            inputMode='decimal'
            value={props.field.numberRange?.min ?? ''}
            onChange={(e) =>
              props.onRangeChange(props.field.id, {
                min: e.target.value === '' ? null : Number(e.target.value),
                max: props.field.numberRange?.max,
              })
            }
          />
        </FieldControl>
      </Field>
      <Field>
        <FieldLabel>{props.t('editor.max')}</FieldLabel>
        <FieldControl>
          <Input
            type='number'
            inputMode='decimal'
            value={props.field.numberRange?.max ?? ''}
            onChange={(e) =>
              props.onRangeChange(props.field.id, {
                min: props.field.numberRange?.min,
                max: e.target.value === '' ? null : Number(e.target.value),
              })
            }
          />
        </FieldControl>
      </Field>
    </div>
  )
}
