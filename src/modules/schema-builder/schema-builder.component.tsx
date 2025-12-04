'use client'

import {
  AlertTriangle,
  Braces,
  ChevronRight,
  Lock,
  Save,
  Trash,
} from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'
import { useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

import { ERoutes } from '@/config/routes'
import { Button } from '@/shared/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/ui/card'
import { Separator } from '@/shared/ui/separator'
import { cn } from '@/shared/utils/shadcn.utils'
import {
  SchemaChangeAnalysis,
  ALLOWED_TYPES,
  useSchemaBuilderService,
} from './schema-builder.service'

const allowedTypeLabels = ALLOWED_TYPES.map(
  (type) => type[0].toUpperCase() + type.slice(1),
)

const normalizeTypes = (text: string) => {
  const lines = text.split('\n')
  return lines
    .map((line) => {
      const match = line.match(/^(\s*[A-Za-z0-9_]+)\s*:\s*([A-Za-z0-9_]+)(.*)$/)
      if (!match) return line

      const [, key, rawType, rest] = match
      const normalizedType =
        allowedTypeLabels.find(
          (type) => type.toLowerCase() === rawType.toLowerCase(),
        ) ?? rawType

      return `${key}: ${normalizedType}${rest ?? ''}`
    })
    .join('\n')
}

const formatSchemaText = (text: string) => {
  const lines = text.split('\n')
  let indent = 0

  return lines
    .map((raw) => {
      const trimmed = raw.trim()
      if (!trimmed) return ''
      if (trimmed.startsWith('}')) {
        indent = Math.max(0, indent - 1)
      }

      const match = trimmed.match(
        /^([A-Za-z0-9_]+)\s*:\s*([A-Za-z0-9_]+)?(\s*\{)?/,
      )
      let line = trimmed
      if (match) {
        const name = match[1]
        const type = match[2]
        const brace = match[3]?.trim() ?? ''
        const normalizedType = type
          ? (allowedTypeLabels.find(
              (allowed) => allowed.toLowerCase() === type.toLowerCase(),
            ) ?? type)
          : ''
        line = `${name}${normalizedType ? `: ${normalizedType}` : ''}${
          brace ? ' {' : ''
        }`
      }

      const indented = `${'  '.repeat(indent)}${line}`
      if (trimmed.endsWith('{')) {
        indent += 1
      }
      return indented
    })
    .join('\n')
}

const renderHighlighted = (text: string) => {
  const lines = text.split('\n')
  return lines.map((line, index) => {
    const match = line.match(
      /^(\s*)([A-Za-z0-9_]+)?(\s*:\s*)?([A-Za-z0-9_]+)?(\s*\{)?(.*)$/,
    )

    if (!match) {
      return (
        <div key={index} className='whitespace-pre leading-relaxed'>
          {line || ' '}
        </div>
      )
    }

    const [, indent, key, colon, type, brace, rest] = match

    return (
      <div key={index} className='whitespace-pre leading-relaxed'>
        <span className='text-muted-foreground/70'>{indent}</span>
        {key && <span className='text-foreground'>{key}</span>}
        {colon && <span className='text-muted-foreground'>{colon}</span>}
        {type && <span className='text-sky-400'>{type}</span>}
        {brace && <span className='text-muted-foreground'>{brace}</span>}
        {rest && <span className='text-muted-foreground/70'>{rest}</span>}
        {!key && !type && !rest && !brace && <span> </span>}
      </div>
    )
  })
}

const ChangeChip = ({
  label,
  count,
  tone = 'neutral',
}: {
  label: string
  count: number
  tone?: 'neutral' | 'success' | 'warning' | 'danger'
}) => {
  const toneClass: Record<
    'neutral' | 'success' | 'warning' | 'danger',
    string
  > = {
    neutral: 'bg-muted/60 text-foreground',
    success:
      'bg-emerald-500/10 text-emerald-400 dark:text-emerald-300 border border-emerald-500/30',
    warning:
      'bg-amber-500/10 text-amber-400 dark:text-amber-200 border border-amber-500/40',
    danger: 'bg-destructive/10 text-destructive border border-destructive/30',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-md px-3 py-1 text-xs font-medium',
        toneClass[tone],
      )}
    >
      <span className='rounded-sm bg-black/5 px-1 py-0.5 text-[10px] uppercase tracking-widest dark:bg-white/5'>
        {count}
      </span>
      {label}
    </span>
  )
}

const WarningPanel = ({
  title,
  description,
  items,
  tone,
}: {
  title: string
  description: string
  items: string[]
  tone: 'danger' | 'warning'
}) => {
  if (items.length === 0) return null

  return (
    <div
      className={cn(
        'rounded-lg border px-4 py-3 text-sm',
        tone === 'danger'
          ? 'border-destructive/40 bg-destructive/5 text-destructive'
          : 'border-amber-400/40 bg-amber-500/10 text-amber-500 dark:text-amber-200',
      )}
    >
      <div className='flex items-start gap-2'>
        <AlertTriangle className='mt-0.5 size-4 shrink-0' />
        <div className='space-y-1'>
          <p className='font-semibold'>{title}</p>
          <p className='text-xs text-muted-foreground'>{description}</p>
          <ul className='ml-4 list-disc space-y-0.5 text-xs'>
            {items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

const ChangeSummary = ({
  summary,
  fieldCount,
}: {
  summary: SchemaChangeAnalysis
  fieldCount: number
}) => {
  return (
    <div className='space-y-3'>
      <div className='flex flex-wrap gap-2'>
        <ChangeChip
          label='New fields'
          count={summary.additions.length}
          tone='success'
        />
        <ChangeChip
          label='Removed fields'
          count={summary.deletions.length}
          tone='danger'
        />
        <ChangeChip
          label='Renamed fields'
          count={summary.renames.length}
          tone='warning'
        />
        <ChangeChip label='Total in draft' count={fieldCount} />
      </div>

      {summary.additions.length > 0 && (
        <div className='text-xs text-muted-foreground'>
          New entries will be added as-is when saved:
          <ul className='ml-4 mt-1 list-disc space-y-0.5'>
            {summary.additions.map((item) => (
              <li key={item.path} className='text-foreground'>
                {item.path}{' '}
                <span className='text-muted-foreground'>({item.type})</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

type SchemaBuilderProps = {
  schemaId?: string
}

export const SchemaBuilderComponent = ({ schemaId }: SchemaBuilderProps) => {
  const service = useSchemaBuilderService(schemaId)
  const router = useRouter()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const overlayRef = useRef<HTMLPreElement>(null)
  const [typeContext, setTypeContext] = useState<{
    lineIndex: number
    tokenStart: number
    tokenEnd: number
    token: string
  } | null>(null)

  const currentFieldCount = Object.keys(
    service.changeSummary.parsedCurrent ?? {},
  ).length

  const typeSuggestions = useMemo(() => {
    if (!typeContext) return []
    const prefix = typeContext.token.toLowerCase()
    return allowedTypeLabels.filter((type) =>
      type.toLowerCase().startsWith(prefix),
    )
  }, [typeContext])

  const computeTypeContext = (value: string, caret: number) => {
    const lines = value.split('\n')
    let offset = 0

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const lineStart = offset
      const lineEnd = offset + line.length
      offset = lineEnd + 1

      if (caret < lineStart || caret > lineEnd + 1) continue

      const colonIndex = line.indexOf(':')
      if (colonIndex === -1 || caret <= colonIndex) continue

      const afterColon = line.slice(colonIndex + 1)
      const nonSpace = afterColon.search(/\S/)
      if (nonSpace === -1) continue

      const tokenStart = colonIndex + 1 + nonSpace
      const tokenMatch = line.slice(tokenStart).match(/^[A-Za-z]*/)
      const token = tokenMatch?.[0] ?? ''
      const tokenEnd = tokenStart + token.length

      return {
        lineIndex: i,
        tokenStart,
        tokenEnd,
        token,
      }
    }

    return null
  }

  const handleTextareaChange = (
    event: React.ChangeEvent<HTMLTextAreaElement>,
  ) => {
    const caret = event.target.selectionStart ?? 0
    const normalized = normalizeTypes(event.target.value)
    const context = computeTypeContext(normalized, caret)
    setTypeContext(context)
    service.handleSchemaChange(normalized)
  }

  const applyTypeSuggestion = (suggestion: string) => {
    if (!typeContext) return
    const lines = service.schemaDraft.split('\n')
    const line = lines[typeContext.lineIndex] ?? ''
    const before = line.slice(0, typeContext.tokenStart)
    const after = line.slice(typeContext.tokenEnd)
    lines[typeContext.lineIndex] = `${before}${suggestion}${after}`
    const nextValue = lines.join('\n')
    service.handleSchemaChange(nextValue)
    setTypeContext(null)

    const area = textareaRef.current
    if (area) {
      const offset =
        lines
          .slice(0, typeContext.lineIndex)
          .reduce((sum, l) => sum + l.length + 1, 0) +
        before.length +
        suggestion.length
      requestAnimationFrame(() => {
        area.focus()
        area.selectionStart = offset
        area.selectionEnd = offset
      })
    }
  }

  const handleTextareaKeyDown = (
    event: React.KeyboardEvent<HTMLTextAreaElement>,
  ) => {
    if (event.key === 'Tab') {
      event.preventDefault()
      const area = textareaRef.current
      if (!area) return
      const { selectionStart, selectionEnd, value } = area
      if (event.shiftKey) {
        const start = Math.max(0, selectionStart)
        const removeSize =
          start >= 2 && value.slice(start - 2, start) === '  '
            ? 2
            : start >= 1 && value.slice(start - 1, start) === ' '
              ? 1
              : 0
        const nextValue =
          value.slice(0, start - removeSize) + value.slice(selectionEnd)
        const caret = start - removeSize
        service.handleSchemaChange(normalizeTypes(nextValue))
        requestAnimationFrame(() => {
          area.selectionStart = caret
          area.selectionEnd = caret
        })
        return
      }

      const insert = '  '
      const nextValue =
        value.slice(0, selectionStart) + insert + value.slice(selectionEnd)
      const caret = selectionStart + insert.length
      service.handleSchemaChange(normalizeTypes(nextValue))
      requestAnimationFrame(() => {
        area.selectionStart = caret
        area.selectionEnd = caret
      })
    }
  }

  const handleFormat = () => {
    const formatted = formatSchemaText(service.schemaDraft)
    service.handleSchemaChange(formatted)
    setTypeContext(null)
  }

  const syncScroll = (event: React.UIEvent<HTMLTextAreaElement>) => {
    if (!overlayRef.current) return
    overlayRef.current.scrollTop = event.currentTarget.scrollTop
    overlayRef.current.scrollLeft = event.currentTarget.scrollLeft
  }

  const handleDelete = () => {
    service.handleDeleteSchema()
    router.push(ERoutes.DASHBOARD_SCHEMA)
  }

  return (
    <Card className='h-full'>
      <CardHeader className='gap-4'>
        <div className='flex flex-wrap items-start justify-between gap-3'>
          <div className='space-y-1'>
            <CardTitle className='flex items-center gap-2'>
              <Braces className='size-5 text-muted-foreground' />
              {service.selectedSchema?.name ?? 'Untitled schema'}
            </CardTitle>
            <CardDescription>
              {service.selectedSchema?.description ??
                'Shape your schema using the prompt below.'}
            </CardDescription>

            <div className='flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground'>
              <span className='rounded-sm bg-foreground/5 px-2 py-0.5'>
                Version {service.selectedSchema?.version ?? 'v0.0.1'}
              </span>
              <span className='rounded-sm bg-foreground/5 px-2 py-0.5'>
                {currentFieldCount} fields in draft
              </span>
              {service.hasUnsavedChanges ? (
                <span className='inline-flex items-center gap-1 rounded-sm bg-amber-500/10 px-2 py-0.5 text-amber-500 dark:text-amber-200'>
                  <ChevronRight className='size-3' />
                  Unsaved changes
                </span>
              ) : (
                <span className='inline-flex items-center gap-1 rounded-sm bg-foreground/5 px-2 py-0.5'>
                  Synced
                </span>
              )}
            </div>
          </div>

          <div className='flex items-center gap-2'>
            <Button variant='secondary' size='sm' onClick={handleFormat}>
              Auto format
            </Button>
            <Dialog.Root
              open={service.deleteDialogOpen}
              onOpenChange={service.setDeleteDialogOpen}
            >
              <Dialog.Trigger asChild>
                <Button variant='destructive' size='sm' className='gap-2'>
                  <Trash className='size-4' />
                  Delete
                </Button>
              </Dialog.Trigger>
              <Dialog.Portal>
                <Dialog.Overlay className='fixed inset-0 bg-black/60' />
                <Dialog.Content className='bg-card text-card-foreground fixed left-1/2 top-1/2 w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-destructive/40 p-6 shadow-xl focus:outline-none'>
                  <Dialog.Title className='flex items-center gap-2 text-lg font-semibold text-destructive'>
                    Delete schema
                  </Dialog.Title>
                  <Dialog.Description className='mt-2 text-sm text-muted-foreground'>
                    After deleting the schema all data related to it will be
                    deleted. This action cannot be undone.
                  </Dialog.Description>
                  <div className='mt-4 space-y-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive'>
                    <p className='font-medium'>You are about to remove:</p>
                    <p>
                      {service.selectedSchema?.name ?? 'Current schema'} (
                      {currentFieldCount} fields)
                    </p>
                  </div>
                  <div className='mt-6 flex justify-end gap-2'>
                    <Dialog.Close asChild>
                      <Button variant='outline' size='sm'>
                        Cancel
                      </Button>
                    </Dialog.Close>
                    <Button
                      variant='destructive'
                      size='sm'
                      onClick={handleDelete}
                    >
                      Confirm delete
                    </Button>
                  </div>
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>
            <Button
              size='sm'
              className='gap-2'
              disabled={
                !service.hasUnsavedChanges || service.typeErrors.length > 0
              }
              onClick={service.handleSave}
            >
              <Save className='size-4' />
              Save
            </Button>
          </div>
        </div>

        <Separator />

        <div className='space-y-2'>
          {service.typeErrors.length > 0 && (
            <div className='flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive'>
              <AlertTriangle className='mt-0.5 size-4' />
              <div className='space-y-1'>
                <p className='font-semibold'>Unsupported field types</p>
                <p className='text-xs text-muted-foreground'>
                  Allowed types are{' '}
                  {ALLOWED_TYPES.map(
                    (type) => type[0].toUpperCase() + type.slice(1),
                  ).join(', ')}
                  , and nested objects using braces {'{ }'}.
                </p>
                <ul className='ml-4 list-disc space-y-0.5 text-xs'>
                  {service.typeErrors.map((issue) => (
                    <li key={issue.path}>
                      {issue.path}: {issue.type}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
          <WarningPanel
            tone='danger'
            title='Field removal warning'
            description='Deleting a field will drop its values from existing records.'
            items={service.changeSummary.deletions.map((item) => item.path)}
          />
          <WarningPanel
            tone='warning'
            title='Field rename detected'
            description='Renaming a field will create a new column and stop tracking the previous one.'
            items={service.changeSummary.renames.map(
              (item) => `${item.from} → ${item.to}`,
            )}
          />
          {service.typeConflicts.length > 0 && (
            <div className='flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive'>
              <Lock className='mt-0.5 size-4' />
              <div className='space-y-1'>
                <p className='font-semibold'>Type changes are locked</p>
                <p className='text-xs text-muted-foreground'>
                  Update blocked. Remove the field and re-add it if you need a
                  different type.
                </p>
                <ul className='ml-4 list-disc space-y-0.5 text-xs'>
                  {service.typeConflicts.map((conflict) => (
                    <li key={conflict.path}>
                      {conflict.path}: {conflict.from} → {conflict.to}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className='h-full space-y-4'>
        <div className='space-y-3'>
          <div className='flex items-center justify-between text-sm font-medium'>
            <span>Schema prompt</span>
            <span className='text-xs text-muted-foreground'>
              Nested objects supported through braces.
            </span>
          </div>
          <div className='rounded-lg border border-border bg-muted/20 p-3 shadow-inner'>
            <div className='relative'>
              <pre
                aria-hidden
                ref={overlayRef}
                className='pointer-events-none absolute inset-0 z-0 overflow-auto whitespace-pre rounded-lg p-2 text-left font-mono text-sm leading-relaxed text-muted-foreground'
              >
                {renderHighlighted(service.schemaDraft)}
              </pre>
              <textarea
                className='relative z-10 bg-transparent font-mono text-sm leading-relaxed text-transparent caret-foreground whitespace-pre min-h-[420px] w-full resize-none overflow-auto rounded-lg p-2 outline-none selection:bg-primary selection:text-primary-foreground'
                value={service.schemaDraft}
                onChange={handleTextareaChange}
                onKeyDown={handleTextareaKeyDown}
                onBlur={handleFormat}
                onScroll={syncScroll}
                ref={textareaRef}
                spellCheck={false}
              />
            </div>
          </div>
          {typeSuggestions.length > 0 && (
            <div className='flex flex-wrap items-center gap-2 text-xs'>
              <span className='text-muted-foreground'>Autocomplete:</span>
              {typeSuggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  className='rounded-md border border-border bg-muted/60 px-2 py-1 text-foreground transition hover:border-foreground/40 hover:bg-muted/80'
                  onClick={() => applyTypeSuggestion(suggestion)}
                  type='button'
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
          <div className='flex items-center gap-2 text-xs text-muted-foreground'>
            <Lock className='size-3.5' />
            Field type updates are blocked. Remove and re-create a field to
            change its type.
          </div>
        </div>

        <div className='rounded-lg border border-border/60 bg-card/80 p-3'>
          <ChangeSummary
            summary={service.changeSummary}
            fieldCount={currentFieldCount}
          />
        </div>
      </CardContent>
    </Card>
  )
}
