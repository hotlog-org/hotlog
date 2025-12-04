import { useMemo, useState } from 'react'
import { z } from 'zod'

import type { EventsExtraComponentProps } from './events-extra.interface'

export const useEventsExtraService = (
  props: EventsExtraComponentProps,
): EventsExtraComponentProps & {
  draftSchemaName: string | null
  draftFieldLabel: string | null
  valueError: string | null
  handleApply: () => void
  handleValueChange: (value: string) => void
} => {
  const draftSchema = useMemo(
    () =>
      props.filterMenu.schemas.find(
        (s) => s.id === props.filterMenu.draftSchemaId,
      ) ?? null,
    [props.filterMenu.draftSchemaId, props.filterMenu.schemas],
  )

  const draftField = useMemo(
    () =>
      props.filterMenu.fields.find(
        (f) => f.field.key === props.filterMenu.draftFieldKey,
      )?.field ?? null,
    [props.filterMenu.draftFieldKey, props.filterMenu.fields],
  )

  const draftSchemaName = draftSchema?.name ?? null
  const draftFieldLabel = draftField?.label ?? null

  const [valueError, setValueError] = useState<string | null>(null)

  const valueSchema = z.string().min(1, props.t('fields.notProvided'))

  const handleValueChange = (value: string) => {
    setValueError(null)
    props.filterMenu.setDraftValue(value)
  }

  const handleApply = () => {
    const parsed = valueSchema.safeParse(props.filterMenu.draftValue.trim())
    if (!parsed.success) {
      setValueError(
        parsed.error.issues[0]?.message ?? props.t('fields.notProvided'),
      )
      return
    }
    setValueError(null)
    props.filterMenu.apply()
  }

  return {
    ...props,
    draftSchemaName,
    draftFieldLabel,
    valueError,
    handleApply,
    handleValueChange,
  }
}
