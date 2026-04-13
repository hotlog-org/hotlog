'use client'

import {
  type ForwardedRef,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'

import { Button } from '@/shared/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/shared/ui/tooltip'
import type { EventFilterOperator } from '@/shared/api/interface'
import { cn } from '@/shared/utils/shadcn.utils'

import type { SchemaFieldType } from '../../../schema/schema.interface'
import { OPERATOR_LITERALS, OPERATORS_BY_TYPE } from '../../filter-operators'
import { type ValueClause, parseValueText } from './value-clause-parser'

// Semantic groups for the keyword/operator vocabulary. Used to color
// both the operator buttons and the inline badges so the colors match.
type KeywordGroup =
  | 'equality' // = ?= start end
  | 'comparison' // > >= < <=
  | 'quantifier' // has any all
  | 'path' // if (json key path)
  | 'connector' // and or — non-essential, gray

const KEYWORD_GROUPS: Record<string, KeywordGroup> = {
  '=': 'equality',
  '?=': 'equality',
  start: 'equality',
  end: 'equality',
  '>': 'comparison',
  '>=': 'comparison',
  '<': 'comparison',
  '<=': 'comparison',
  has: 'quantifier',
  any: 'quantifier',
  all: 'quantifier',
  if: 'path',
  and: 'connector',
  or: 'connector',
}

// Map a parsed clause's operator/quantifier/keyPath to a group so the
// inline badge gets the right color.
const OPERATOR_GROUPS: Record<EventFilterOperator, KeywordGroup> = {
  eq: 'equality',
  contains: 'equality',
  starts_with: 'equality',
  ends_with: 'equality',
  gt: 'comparison',
  gte: 'comparison',
  lt: 'comparison',
  lte: 'comparison',
}

const groupForClause = (clause: ValueClause): KeywordGroup => {
  if (clause.quantifier) return 'quantifier'
  if (clause.keyPath) return 'path'
  return OPERATOR_GROUPS[clause.operator]
}

// Tailwind class strings for each group, applied to the operator
// buttons. Each group has explicit dark-mode variants because the
// shadcn `outline` button variant ships its own `dark:hover:bg-input/50`
// rule that would otherwise wipe out the group color on hover.
const GROUP_BUTTON_CLASSES: Record<KeywordGroup, string> = {
  equality:
    'border-blue-500/40 bg-blue-500/10 text-blue-500 hover:bg-blue-500/25 hover:text-blue-500 dark:bg-blue-500/15 dark:hover:bg-blue-500/30 dark:hover:text-blue-400',
  comparison:
    'border-amber-500/40 bg-amber-500/10 text-amber-500 hover:bg-amber-500/25 hover:text-amber-500 dark:bg-amber-500/15 dark:hover:bg-amber-500/30 dark:hover:text-amber-400',
  quantifier:
    'border-emerald-500/40 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/25 hover:text-emerald-500 dark:bg-emerald-500/15 dark:hover:bg-emerald-500/30 dark:hover:text-emerald-400',
  path: 'border-purple-500/40 bg-purple-500/10 text-purple-500 hover:bg-purple-500/25 hover:text-purple-500 dark:bg-purple-500/15 dark:hover:bg-purple-500/30 dark:hover:text-purple-400',
  connector:
    'border-border bg-muted/30 text-muted-foreground hover:bg-muted/60 hover:text-foreground dark:bg-muted/20 dark:hover:bg-muted/40 dark:hover:text-foreground',
}

const GROUP_BADGE_CLASSES: Record<KeywordGroup, string> = {
  equality: 'bg-blue-500/25 ring-1 ring-blue-500/40',
  comparison: 'bg-amber-500/25 ring-1 ring-amber-500/40',
  quantifier: 'bg-emerald-500/25 ring-1 ring-emerald-500/40',
  path: 'bg-purple-500/25 ring-1 ring-purple-500/40',
  connector: 'bg-muted/40 ring-1 ring-border',
}

// Hover-tooltip text for each operator/keyword. Surfaces what the
// keyword does so the user doesn't have to guess.
const KEYWORD_TOOLTIPS: Record<string, string> = {
  '=': 'equals — exact match',
  '>': 'greater than',
  '>=': 'greater than or equal',
  '<': 'less than',
  '<=': 'less than or equal',
  '?=': 'contains — case-insensitive substring match',
  start: 'starts with',
  end: 'ends with',
  has: 'array contains the given element',
  any: 'any array element matches the predicate',
  all: 'every array element matches the predicate',
  if: 'filter on a nested json key (e.g. address.city if = NYC)',
  and: 'AND — both clauses must match',
  or: 'OR — either clause matches',
}

interface KeywordButtonProps {
  literal: string
  insert: string
  onInsert: (insert: string) => void
}

const KeywordButton = (props: KeywordButtonProps) => {
  const { literal, insert, onInsert } = props
  const tooltip = KEYWORD_TOOLTIPS[literal] ?? literal
  const group = KEYWORD_GROUPS[literal] ?? 'connector'
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type='button'
            variant='outline'
            size='sm'
            className={cn(
              'h-6 px-2 text-xs font-mono',
              GROUP_BUTTON_CLASSES[group],
            )}
            onClick={(e) => {
              e.preventDefault()
              onInsert(insert)
            }}
          >
            {literal}
          </Button>
        </TooltipTrigger>
        <TooltipContent side='top'>{tooltip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export interface ValueTokenInputHandle {
  // Returns the current parsed clauses synchronously, used by the
  // parent on Apply.
  getClauses: () => ValueClause[]
}

export interface ValueTokenInputProps {
  fieldType: SchemaFieldType
  enumValues?: string[]
  // Initial text to populate the input with — used when reopening the
  // popover for a field that already has filters so the user can edit
  // the existing clauses in place.
  initialText?: string
  onClausesChange: (clauses: ValueClause[]) => void
  onHasContentChange?: (hasContent: boolean) => void
  placeholder?: string
  t: (key: string) => string
}

interface Segment {
  text: string
  // Group is set when this segment corresponds to a parsed clause; the
  // ghost renderer uses it to pick the badge color. Plain text segments
  // (between clauses, or untyped trailing) have group = null.
  group: KeywordGroup | null
}

// Split a plain-text gap to find `and` / `or` keywords and tag them
// with the 'connector' group so they get colored inline.
const AND_OR_RE = /\b(and|or)\b/gi

const splitConnectors = (plain: string): Segment[] => {
  const result: Segment[] = []
  let last = 0
  let m: RegExpExecArray | null
  AND_OR_RE.lastIndex = 0
  while ((m = AND_OR_RE.exec(plain)) !== null) {
    if (m.index > last) {
      result.push({ text: plain.slice(last, m.index), group: null })
    }
    result.push({ text: m[0], group: 'connector' })
    last = m.index + m[0].length
  }
  if (last < plain.length) {
    result.push({ text: plain.slice(last), group: null })
  }
  return result
}

// Build the highlighted segments by walking the original text and the
// sorted clause ranges. Each segment is either plain text or a badge
// matching one parsed clause; the badge carries the clause's color
// group. Gaps between clauses are further scanned for `and`/`or`
// keywords so they also get highlighted.
const buildSegments = (text: string, clauses: ValueClause[]): Segment[] => {
  if (!text) return []
  if (clauses.length === 0) return splitConnectors(text)

  const sorted = [...clauses].sort((a, b) => a.start - b.start)
  const segments: Segment[] = []
  let cursor = 0
  for (const clause of sorted) {
    if (clause.start > cursor) {
      segments.push(...splitConnectors(text.slice(cursor, clause.start)))
    }
    segments.push({
      text: text.slice(clause.start, clause.end),
      group: groupForClause(clause),
    })
    cursor = clause.end
  }
  if (cursor < text.length) {
    segments.push(...splitConnectors(text.slice(cursor)))
  }
  return segments
}

function ValueTokenInputInner(
  props: ValueTokenInputProps,
  forwardedRef: ForwardedRef<ValueTokenInputHandle>,
) {
  const {
    fieldType,
    enumValues,
    initialText,
    onClausesChange,
    onHasContentChange,
    placeholder,
    t,
  } = props
  const inputRef = useRef<HTMLInputElement | null>(null)
  const ghostRef = useRef<HTMLDivElement | null>(null)
  const [text, setText] = useState(initialText ?? '')

  const parsed = useMemo(
    () => parseValueText(text, fieldType),
    [text, fieldType],
  )

  useEffect(() => {
    onClausesChange(parsed.clauses)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parsed.clauses])

  useEffect(() => {
    onHasContentChange?.(text.trim().length > 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text])

  useImperativeHandle(
    forwardedRef,
    () => ({
      getClauses: () => parsed.clauses,
    }),
    [parsed.clauses],
  )

  const segments = useMemo(
    () => buildSegments(text, parsed.clauses),
    [text, parsed.clauses],
  )

  // Sync the ghost's horizontal scroll with the input so the badge
  // highlights stay aligned even when the user scrolls past the
  // visible area.
  const handleScroll = () => {
    if (ghostRef.current && inputRef.current) {
      ghostRef.current.scrollLeft = inputRef.current.scrollLeft
    }
  }

  const insertAtEnd = (insert: string) => {
    setText((prev) => {
      const needsLeadingSpace = prev.length > 0 && !prev.endsWith(' ')
      return prev + (needsLeadingSpace ? ' ' : '') + insert
    })
    requestAnimationFrame(() => inputRef.current?.focus())
  }

  const allowedOperators = OPERATORS_BY_TYPE[fieldType]

  return (
    <div className='space-y-2'>
      {/*
        Layered input: a ghost div behind a transparent <input>. The
        ghost has the exact same font / padding / line-height so its
        badge spans line up character-for-character with the input.
        The user types into a real <input>, so caret / IME / backspace
        all work natively. The badges are pure CSS overlays — no
        contentEditable surgery and no caret restoration code.
      */}
      <div className='relative h-9 w-full overflow-hidden rounded-md border border-input bg-background'>
        <div
          ref={ghostRef}
          aria-hidden='true'
          className='pointer-events-none absolute inset-0 overflow-hidden whitespace-pre px-3 py-1.5 font-mono text-sm leading-6 text-transparent'
        >
          {segments.map((seg, i) =>
            seg.group ? (
              <span
                key={i}
                className={cn('rounded-sm', GROUP_BADGE_CLASSES[seg.group])}
              >
                {seg.text}
              </span>
            ) : (
              <span key={i}>{seg.text}</span>
            ),
          )}
          {/* zero-width space so the ghost has at least one line of
              height when the text is empty */}
          {'\u200b'}
        </div>
        <input
          ref={inputRef}
          type='text'
          value={text}
          onChange={(e) => setText(e.target.value)}
          onScroll={handleScroll}
          placeholder={placeholder}
          className={cn(
            'absolute inset-0 h-full w-full bg-transparent px-3 py-1.5 font-mono text-sm leading-6 outline-none',
            'placeholder:text-muted-foreground',
          )}
        />
      </div>

      {/* Operator quick-insert buttons row. Hover any button for a
          tooltip explaining what the operator does. */}
      <div className='flex flex-wrap items-center gap-1'>
        {allowedOperators.map((op) => (
          <KeywordButton
            key={op}
            literal={OPERATOR_LITERALS[op]}
            insert={OPERATOR_LITERALS[op] + ' '}
            onInsert={insertAtEnd}
          />
        ))}

        {fieldType === 'array' && (
          <>
            <span className='mx-1 text-xs text-muted-foreground'>·</span>
            <KeywordButton literal='has' insert='has ' onInsert={insertAtEnd} />
            <KeywordButton literal='any' insert='any ' onInsert={insertAtEnd} />
            <KeywordButton literal='all' insert='all ' onInsert={insertAtEnd} />
          </>
        )}

        {fieldType === 'json' && (
          <>
            <span className='mx-1 text-xs text-muted-foreground'>·</span>
            <KeywordButton literal='if' insert='if ' onInsert={insertAtEnd} />
          </>
        )}

        <span className='mx-1 text-xs text-muted-foreground'>·</span>
        <KeywordButton literal='and' insert='and ' onInsert={insertAtEnd} />
        <KeywordButton literal='or' insert='or ' onInsert={insertAtEnd} />
      </div>

      {fieldType === 'enum' && enumValues && enumValues.length > 0 ? (
        <div className='flex flex-wrap items-center gap-1 text-xs'>
          <span className='text-muted-foreground'>
            {t('filter.suggestions.values')}
          </span>
          {enumValues.map((v) => (
            <Button
              key={v}
              type='button'
              variant='ghost'
              size='sm'
              className='h-6 px-2 text-xs'
              onClick={(e) => {
                e.preventDefault()
                insertAtEnd(v + ' ')
              }}
            >
              {v}
            </Button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export const ValueTokenInput = forwardRef<
  ValueTokenInputHandle,
  ValueTokenInputProps
>(ValueTokenInputInner)
ValueTokenInput.displayName = 'ValueTokenInput'
