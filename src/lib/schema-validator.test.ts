// @vitest-environment node
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import {
  validateEventValue,
  type ValidationError,
  type ValidatorField,
} from './schema-validator'

// SQL and JS use the exact same fixtures, including raw numeric JSON that JS
// parses to Infinity/zero/rounded binary64 rather than arbitrary precision.
const sql = readFileSync(
  new URL(
    '../../supabase/tests/20261004160002_event_validation.sql',
    import.meta.url,
  ),
  'utf8',
)
const fixtures = JSON.parse(sql.split('$parity$')[1]) as Array<{
  name: string
  fields: ValidatorField[]
  valueJson: string
  errors: ValidationError[]
}>

describe('validateEventValue SQL parity fixtures', () => {
  it.each(fixtures)('$name', ({ fields, valueJson, errors }) => {
    expect(validateEventValue(JSON.parse(valueJson), fields)).toEqual(errors)
  })

  it.each([NaN, Infinity, -Infinity])(
    'rejects non-JSON finite-number failure %s',
    (value) => {
      expect(
        validateEventValue({ x: value }, [
          { key: 'x', type: 'NUMBER', required: true, metadata: null },
        ]),
      ).toEqual([{ field_key: 'x', reason: 'expected finite number' }])
    },
  )

  it('does not inherit required payload fields from a prototype', () => {
    expect(
      validateEventValue(Object.create({ x: 'inherited' }), [
        { key: 'x', type: 'STRING', required: true, metadata: null },
      ]),
    ).toEqual([{ field_key: 'x', reason: 'required field missing' }])
  })
})
