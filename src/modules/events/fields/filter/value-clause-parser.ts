// =============================================================
// Value Clause Parser (regex-based, position-aware)
// =============================================================
// Parses the text from the popover's value-step input into a list
// of typed clauses for a single field. Each clause carries a
// {start, end} source range so the layered input can highlight
// the exact characters live.
//
// Grammar:
//
//   input    := clause ((' and ' | ' or ') clause)*
//   clause   := json_clause | array_quant | array_has
//             | starts | ends | simple
//   simple   := op? value
//   op       := '=' | '?=' | '>' | '>=' | '<' | '<='
//   starts   := 'start' value          // string only
//   ends     := 'end'   value          // string only
//   array_has   := 'has' value
//   array_quant := ('any' | 'all') op value
//   json_clause := key_path 'if' simple
//   key_path    := identifier ('.' identifier)*
//
// `and` / `or` are both treated as clause separators (AND-joined for
// v1; real boolean OR is a follow-up).
//
// Datetime values can be ISO 8601 (`2026-04-12`, `2026-04-12T10:30Z`)
// or `dd.mm.yyyy`. The parser converts the latter to ISO before
// returning.
// =============================================================

import type {
  EventFilterOperator,
  EventFilterQuantifier,
} from '@/shared/api/interface'

import type { SchemaFieldType } from '../../../schema/schema.interface'
import {
  DEFAULT_OPERATOR_FOR_TYPE,
  OPERATOR_LITERAL_LOOKUP,
  OPERATOR_LITERALS,
  OPERATORS_BY_TYPE,
} from '../../filter-operators'

export interface ValueClause {
  id: string
  operator: EventFilterOperator
  values: string[]
  quantifier?: EventFilterQuantifier
  keyPath?: string
  // Source range in the original input text (the text the user
  // typed). The layered input uses this to position the badge
  // highlight character-for-character.
  start: number
  end: number
}

export interface ParseValueResult {
  clauses: ValueClause[]
}

const makeId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `clause_${Date.now()}_${Math.random().toString(36).slice(2)}`
}

// ----- Value normalization -------------------------------------------

const DD_MM_YYYY = /^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/

// Normalize a value string for the wire. For datetime, accept
// `dd.mm.yyyy` and convert to ISO 8601 (`yyyy-mm-dd`). Other types
// pass through unchanged.
const normalizeValue = (raw: string, fieldType: SchemaFieldType): string => {
  if (fieldType !== 'datetime') return raw
  const m = raw.match(DD_MM_YYYY)
  if (!m) return raw
  let year = m[3]
  if (year.length === 2) year = `20${year}`
  const month = m[2].padStart(2, '0')
  const day = m[1].padStart(2, '0')
  return `${year}-${month}-${day}`
}

// ----- Clause-level regexes ------------------------------------------

const IDENT = '[a-zA-Z_][a-zA-Z0-9_]*'

// `KEY if EXPR` or `KEY.NESTED if EXPR` (only valid for json fields)
const JSON_PATH_RE = new RegExp(
  `^(${IDENT}(?:\\.${IDENT})*)\\s+if\\s+(.+)$`,
  'i',
)

// `any OP X` or `all OP X` (only valid for array fields)
const QUANTIFIER_RE = /^(any|all)\s+(>=|<=|==|=|>|<|\?=)\s*(.+)$/i

// `has X` (array contains)
const HAS_RE = /^has\s+(.+)$/i

// `start X` (string starts_with) and `end X` (string ends_with)
const STARTS_WITH_RE = /^start\s+(.+)$/i
const ENDS_WITH_RE = /^end\s+(.+)$/i

// `OP X` where OP is one of the symbols. The order matters — the
// alternatives starting with longer strings (`>=`, `<=`, `==`, `?=`)
// come first so they're tried before the single-char alternatives.
const SIMPLE_OP_RE = /^(\?=|>=|<=|==|=|>|<)\s*(.+)$/

// Patterns that look like a complete keyword/operator with no value
// yet — the user is mid-typing, so we don't promote anything.
const KEYWORD_ONLY_RE = /^(\?=|>=|<=|==|=|>|<|start|end|has|any|all|if)\s*$/i

// A bare value that's all symbols / punctuation isn't worth badging.
// Lets us hold off on showing a badge for `?` alone (waiting for `=`).
const ALL_SYMBOLS_RE = /^[^\p{L}\p{N}]+$/u

// ----- Splitting on `and` / `or` (position-aware) --------------------

interface RawPart {
  text: string
  start: number
  end: number
}

const splitClauses = (text: string): RawPart[] => {
  if (!text.trim()) return []

  // Match `and` / `or` surrounded by at least one space on each side.
  // The match index points at the first space.
  const re = /\s+(?:and|or)\s+/gi
  const parts: RawPart[] = []
  let lastEnd = 0
  let m: RegExpExecArray | null

  const pushSegment = (segStart: number, segEnd: number) => {
    const slice = text.slice(segStart, segEnd)
    const trimmedStart = slice.search(/\S/)
    const trimmedEndOffset = slice.search(/\s+$/)
    if (trimmedStart === -1) return
    const start = segStart + trimmedStart
    const end = trimmedEndOffset === -1 ? segEnd : segStart + trimmedEndOffset
    if (end <= start) return
    parts.push({ text: text.slice(start, end), start, end })
  }

  while ((m = re.exec(text)) !== null) {
    pushSegment(lastEnd, m.index)
    lastEnd = m.index + m[0].length
  }
  pushSegment(lastEnd, text.length)

  return parts
}

// ----- Parsing one clause --------------------------------------------

interface ParseClauseResult {
  operator: EventFilterOperator
  values: string[]
  quantifier?: EventFilterQuantifier
  keyPath?: string
}

const symbolToOperator = (symbol: string): EventFilterOperator | null =>
  OPERATOR_LITERAL_LOOKUP[symbol.toLowerCase()] ?? null

const parseSimpleClause = (
  text: string,
  fieldType: SchemaFieldType,
): ParseClauseResult | null => {
  const trimmed = text.trim()
  if (!trimmed) return null

  // Operator + value
  const opMatch = trimmed.match(SIMPLE_OP_RE)
  if (opMatch) {
    const op = symbolToOperator(opMatch[1])
    if (!op) return null
    if (!OPERATORS_BY_TYPE[fieldType].includes(op)) return null
    const value = opMatch[2].trim()
    if (!value) return null
    return { operator: op, values: [normalizeValue(value, fieldType)] }
  }

  // Reject keyword-only fragments — the user is mid-typing
  if (KEYWORD_ONLY_RE.test(trimmed)) return null
  // Reject all-symbol bare values like `?` alone (waiting for the `=`)
  if (ALL_SYMBOLS_RE.test(trimmed)) return null

  // Bare value -> default operator (`eq`)
  const defaultOp = DEFAULT_OPERATOR_FOR_TYPE[fieldType]
  if (!OPERATORS_BY_TYPE[fieldType].includes(defaultOp)) return null
  return {
    operator: defaultOp,
    values: [normalizeValue(trimmed, fieldType)],
  }
}

const parseClause = (
  text: string,
  fieldType: SchemaFieldType,
): ParseClauseResult | null => {
  const trimmed = text.trim()
  if (!trimmed) return null

  // Bail on keyword-only fragments at the very top so they never
  // accidentally land in any of the matchers.
  if (KEYWORD_ONLY_RE.test(trimmed)) return null

  // 1. JSON key path: `KEY if EXPR` (json fields only)
  if (fieldType === 'json') {
    const jsonMatch = trimmed.match(JSON_PATH_RE)
    if (jsonMatch) {
      const keyPath = jsonMatch[1]
      const inner = jsonMatch[2]
      const innerResult = parseSimpleClause(inner, 'string')
      if (!innerResult) return null
      return { ...innerResult, keyPath }
    }
  }

  // 2. Array quantifier: `any OP X` or `all OP X`
  if (fieldType === 'array') {
    const quantMatch = trimmed.match(QUANTIFIER_RE)
    if (quantMatch) {
      const op = symbolToOperator(quantMatch[2])
      if (!op) return null
      const value = quantMatch[3].trim()
      if (!value) return null
      return {
        operator: op,
        values: [value],
        quantifier: quantMatch[1].toLowerCase() as EventFilterQuantifier,
      }
    }

    // 3. Array `has X`
    const hasMatch = trimmed.match(HAS_RE)
    if (hasMatch) {
      const value = hasMatch[1].trim()
      if (!value) return null
      return { operator: 'eq', values: [value], quantifier: 'has' }
    }
  }

  // 4. String `start X` / `end X`
  if (fieldType === 'string') {
    const startsMatch = trimmed.match(STARTS_WITH_RE)
    if (startsMatch) {
      const value = startsMatch[1].trim()
      if (!value) return null
      return { operator: 'starts_with', values: [value] }
    }
    const endsMatch = trimmed.match(ENDS_WITH_RE)
    if (endsMatch) {
      const value = endsMatch[1].trim()
      if (!value) return null
      return { operator: 'ends_with', values: [value] }
    }
  }

  // 5. Simple operator + value (or bare value)
  return parseSimpleClause(trimmed, fieldType)
}

// ----- Public entry point --------------------------------------------

export function parseValueText(
  text: string,
  fieldType: SchemaFieldType,
): ParseValueResult {
  const parts = splitClauses(text)
  const clauses: ValueClause[] = []

  for (const part of parts) {
    const result = parseClause(part.text, fieldType)
    if (!result) continue
    clauses.push({
      id: makeId(),
      operator: result.operator,
      values: result.values,
      quantifier: result.quantifier,
      keyPath: result.keyPath,
      start: part.start,
      end: part.end,
    })
  }

  return { clauses }
}

// ----- Inverse: format a clause back to its canonical text form -----
// Used to pre-populate the value-step input when the user reopens the
// popover for a field that already has filters. Round-trips through
// the parser cleanly.

export interface FormattableClause {
  operator: EventFilterOperator
  values: string[]
  quantifier?: EventFilterQuantifier
  keyPath?: string
}

export function formatClauseToText(clause: FormattableClause): string {
  const symbol = OPERATOR_LITERALS[clause.operator]
  const value = clause.values[0] ?? ''

  let body: string
  if (clause.quantifier === 'has') {
    body = `has ${value}`
  } else if (clause.quantifier === 'any' || clause.quantifier === 'all') {
    body = `${clause.quantifier} ${symbol} ${value}`
  } else if (clause.operator === 'starts_with') {
    body = `start ${value}`
  } else if (clause.operator === 'ends_with') {
    body = `end ${value}`
  } else {
    body = `${symbol} ${value}`
  }

  if (clause.keyPath) {
    return `${clause.keyPath} if ${body}`
  }
  return body
}

export function formatClausesToText(clauses: FormattableClause[]): string {
  return clauses.map(formatClauseToText).join(' and ')
}
