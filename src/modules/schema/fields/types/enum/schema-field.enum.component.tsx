'use client'

import type { SchemaFieldRendererProps } from '../schema-field-renderer.interface'
import {
  Field,
  FieldControl,
  FieldLabel,
  FieldMessage,
} from '@/shared/ui/field'
import { Input } from '@/shared/ui/input'

export function SchemaFieldEnum(props: SchemaFieldRendererProps) {
  return (
    <Field>
      <FieldLabel>{props.t('editor.enumValues')}</FieldLabel>
      <FieldControl>
        <Input
          placeholder={props.t('editor.enumPlaceholder')}
          value={(props.field.enumValues ?? []).join(', ')}
          onChange={(e) =>
            props.onEnumChange(
              props.field.id,
              e.target.value
                .split(',')
                .map((value) => value.trim())
                .filter(Boolean),
            )
          }
        />
      </FieldControl>
      <FieldMessage>{props.t('editor.enumHelp')}</FieldMessage>
    </Field>
  )
}
