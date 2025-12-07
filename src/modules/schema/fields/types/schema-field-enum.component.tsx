'use client'

import type { SchemaFieldRendererProps } from './schema-field-renderer.interface'
import {
  Field,
  FieldControl,
  FieldLabel,
  FieldMessage,
} from '@/shared/ui/field'
import { Input } from '@/shared/ui/input'
import { useEffect, useMemo, useState } from 'react'

export function SchemaFieldEnum(props: SchemaFieldRendererProps) {
  const [value, setValue] = useState((props.field.enumValues ?? []).join(', '))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setValue((props.field.enumValues ?? []).join(', '))
  }, [props.field.id, props.field.enumValues])

  const isValid = useMemo(() => /^[a-zA-Z0-9-_.\s,]*$/.test(value), [value])

  const commit = () => {
    if (!isValid) return

    const values = value
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean)
    if (values.length === 0) {
      setError(props.t('fields.notProvided'))
      return
    }
    setError(null)
    props.onEnumChange(props.field.id, values)
  }

  return (
    <Field>
      <FieldLabel className='text-[11px] uppercase tracking-wide text-muted-foreground'>
        {props.t('editor.enumValues')}
      </FieldLabel>
      <FieldControl>
        <Input
          placeholder={props.t('editor.enumPlaceholder')}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={commit}
        />
      </FieldControl>
      <FieldMessage
        className={!isValid ? 'text-red-500' : ''}
        state={error ? 'error' : 'default'}
      >
        {error
          ? error
          : isValid
            ? props.t('editor.enumHelp')
            : props.t('editor.enumInvalid')}
      </FieldMessage>
    </Field>
  )
}
