'use client'

import { useEffect, useMemo, useState } from 'react'

type ParsedSchema = Record<string, string>

type FieldChange = {
  path: string
  type: string
}

type RenameChange = {
  from: string
  to: string
  type: string
}

type TypeConflict = {
  path: string
  from: string
  to: string
}

type InvalidTypeIssue = {
  path: string
  type: string
}

export type SchemaDefinition = {
  id: string
  name: string
  description: string
  schema: string
  updatedAt?: string
  version: string
}

export type SchemaChangeAnalysis = {
  additions: FieldChange[]
  deletions: FieldChange[]
  renames: RenameChange[]
  typeConflicts: TypeConflict[]
  parsedCurrent: ParsedSchema
}

const ALLOWED_TYPES = ['string', 'int', 'float', 'bool']

const defaultSchemaTemplate = `{
  name: String
  name_id: String

  lastname: String
  lastname_id: String

  age: Int
  age_id: Int
}`

const mockSchemas: SchemaDefinition[] = [
  {
    id: 'user_join',
    name: 'UserJoin',
    description: 'User joins a workspace session',
    version: 'v1.0.0',
    schema: `{
  JoinedAt: String
  UserID: String
  props: {
    plan: String
    device: String
  }
}`,
  },
  {
    id: 'user_left',
    name: 'UserLeft',
    description: 'User leaves the active session',
    version: 'v1.0.0',
    schema: `{
  LeftAt: String
  UserID: String
  reason: String
}`,
  },
  {
    id: 'app_start',
    name: 'AppStart',
    description: 'Client app start event',
    version: 'v1.2.0',
    schema: `{
  StartedAt: String
  appVersion: String
  props: {
    device: String
    locale: String
  }
}`,
  },
  {
    id: 'app_down',
    name: 'AppDown',
    description: 'Unexpected shutdown or crash',
    version: 'v1.0.1',
    schema: `{
  CrashedAt: String
  os: String
  build: String
  reason: String
}`,
  },
]

const parseSchemaText = (text: string): ParsedSchema => {
  const stack: string[] = []
  const fields: ParsedSchema = {}

  const lines = text.split('\n')
  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) continue
    if (line.startsWith('//')) continue

    if (line.startsWith('}')) {
      stack.pop()
      continue
    }

    const hasOpeningBrace = line.endsWith('{')
    const sanitized = hasOpeningBrace ? line.slice(0, -1).trim() : line

    const typedMatch = sanitized.match(
      /^([A-Za-z0-9_]+)\s*:\s*([A-Za-z0-9_\[\]<>]+)?/,
    )
    const bareMatch = sanitized.match(/^([A-Za-z0-9_]+)$/)

    if (!typedMatch && !bareMatch) continue

    const name = typedMatch ? typedMatch[1] : bareMatch?.[1]
    if (!name) continue

    const rawType =
      (typedMatch && typedMatch[2]) || (hasOpeningBrace ? 'object' : 'untyped')
    const path = stack.length ? `${stack.join('.')}.${name}` : name
    fields[path] = hasOpeningBrace ? 'object' : rawType

    if (hasOpeningBrace) {
      stack.push(path)
    }
  }

  return fields
}

const collectTypeErrors = (text: string): InvalidTypeIssue[] => {
  const stack: string[] = []
  const issues: InvalidTypeIssue[] = []
  const lines = text.split('\n')

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) continue
    if (line.startsWith('//')) continue

    if (line.startsWith('}')) {
      stack.pop()
      continue
    }

    const hasOpeningBrace = line.endsWith('{')
    const sanitized = hasOpeningBrace ? line.slice(0, -1).trim() : line
    const typedMatch = sanitized.match(
      /^([A-Za-z0-9_]+)\s*:\s*([A-Za-z0-9_\[\]<>]+)?/,
    )
    const bareMatch = sanitized.match(/^([A-Za-z0-9_]+)$/)
    if (!typedMatch && !bareMatch) continue

    const name = typedMatch ? typedMatch[1] : bareMatch?.[1]
    if (!name) continue

    const path = stack.length ? `${stack.join('.')}.${name}` : name

    if (hasOpeningBrace) {
      stack.push(path)
      continue
    }

    const rawType = typedMatch ? typedMatch[2] : undefined
    if (!rawType) {
      issues.push({ path, type: 'untyped' })
      continue
    }

    const normalized = rawType.toLowerCase()
    if (!ALLOWED_TYPES.includes(normalized)) {
      issues.push({ path, type: rawType })
    }
  }

  return issues
}

const analyzeSchemaChange = (
  baseText: string,
  nextText: string,
): SchemaChangeAnalysis => {
  const base = parseSchemaText(baseText)
  const current = parseSchemaText(nextText)

  const additions: FieldChange[] = []
  const deletions: FieldChange[] = []
  const typeConflicts: TypeConflict[] = []

  Object.entries(base).forEach(([path, type]) => {
    if (!(path in current)) {
      deletions.push({ path, type })
      return
    }

    if (current[path] !== type) {
      typeConflicts.push({ path, from: type, to: current[path] })
    }
  })

  Object.entries(current).forEach(([path, type]) => {
    if (!(path in base)) {
      additions.push({ path, type })
    }
  })

  const remainingAdds = [...additions]
  const remainingDeletes = [...deletions]
  const renames: RenameChange[] = []

  for (const add of additions) {
    const matchIndex = remainingDeletes.findIndex(
      (item) => item.type === add.type,
    )

    if (matchIndex !== -1) {
      const [removed] = remainingDeletes.splice(matchIndex, 1)
      renames.push({
        from: removed.path,
        to: add.path,
        type: add.type,
      })

      const addIndex = remainingAdds.findIndex((item) => item.path === add.path)
      if (addIndex !== -1) {
        remainingAdds.splice(addIndex, 1)
      }
    }
  }

  return {
    additions: remainingAdds,
    deletions: remainingDeletes,
    renames,
    typeConflicts,
    parsedCurrent: current,
  }
}

const buildEmptySchema = (
  index: number,
  customId?: string,
): SchemaDefinition => ({
  id: customId ?? `schema_${index}`,
  name: customId ? `New ${customId}` : `NewSchema${index}`,
  description: 'Draft schema created from the builder',
  version: 'v0.1.0',
  schema: defaultSchemaTemplate,
})

export const useSchemaBuilderService = (initialSchemaId?: string) => {
  const [schemas, setSchemas] = useState<SchemaDefinition[]>(() => {
    const base = [...mockSchemas]
    if (
      initialSchemaId &&
      !base.find((schema) => schema.id === initialSchemaId)
    ) {
      base.unshift(buildEmptySchema(base.length + 1, initialSchemaId))
    }
    return base
  })
  const [selectedSchemaId, setSelectedSchemaId] = useState(
    initialSchemaId ?? mockSchemas[0]?.id ?? '',
  )
  const [searchTerm, setSearchTerm] = useState('')
  const [baseSchemaText, setBaseSchemaText] = useState(
    mockSchemas[0]?.schema ?? defaultSchemaTemplate,
  )
  const [schemaDraft, setSchemaDraft] = useState(baseSchemaText)
  const [changeSummary, setChangeSummary] = useState<SchemaChangeAnalysis>(
    analyzeSchemaChange(baseSchemaText, baseSchemaText),
  )
  const [typeConflicts, setTypeConflicts] = useState<TypeConflict[]>([])
  const [typeErrors, setTypeErrors] = useState<InvalidTypeIssue[]>([])
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)

  const selectedSchema = useMemo(() => {
    const found = schemas.find((schema) => schema.id === selectedSchemaId)
    return found ?? schemas[0]
  }, [schemas, selectedSchemaId])

  const filteredSchemas = useMemo(
    () =>
      schemas.filter((schema) =>
        schema.name.toLowerCase().includes(searchTerm.toLowerCase()),
      ),
    [schemas, searchTerm],
  )

  useEffect(() => {
    if (!selectedSchema) return

    setBaseSchemaText(selectedSchema.schema)
    setSchemaDraft(selectedSchema.schema)
    setChangeSummary(
      analyzeSchemaChange(selectedSchema.schema, selectedSchema.schema),
    )
    setTypeConflicts([])
    setTypeErrors([])
  }, [selectedSchema?.id, selectedSchema?.schema])

  const handleSchemaChange = (value: string) => {
    const analysis = analyzeSchemaChange(baseSchemaText, value)
    const invalidTypes = collectTypeErrors(value)

    if (analysis.typeConflicts.length > 0) {
      setTypeConflicts(analysis.typeConflicts)
      return
    }

    setTypeConflicts([])
    setTypeErrors(invalidTypes)
    setSchemaDraft(value)
    setChangeSummary(analysis)
  }

  const handleSave = () => {
    if (!selectedSchema) return

    setSchemas((prev) =>
      prev.map((schema) =>
        schema.id === selectedSchema.id
          ? {
              ...schema,
              schema: schemaDraft,
              updatedAt: new Date().toISOString(),
            }
          : schema,
      ),
    )

    setBaseSchemaText(schemaDraft)
    setChangeSummary(analyzeSchemaChange(schemaDraft, schemaDraft))
    setTypeConflicts([])
    setLastSavedAt(new Date().toISOString())
  }

  const handleCreateSchema = () => {
    const draft = buildEmptySchema(schemas.length + 1)
    setSchemas((prev) => [draft, ...prev])
    setSelectedSchemaId(draft.id)
    setBaseSchemaText(draft.schema)
    setSchemaDraft(draft.schema)
    setChangeSummary(analyzeSchemaChange(draft.schema, draft.schema))
    setTypeConflicts([])
  }

  const handleDeleteSchema = () => {
    setSchemas((prev) => {
      const remaining = prev.filter((schema) => schema.id !== selectedSchemaId)
      const fallback = remaining[0] ?? buildEmptySchema(prev.length + 1)

      setSelectedSchemaId(fallback.id)
      setBaseSchemaText(fallback.schema)
      setSchemaDraft(fallback.schema)
      setChangeSummary(analyzeSchemaChange(fallback.schema, fallback.schema))
      setTypeConflicts([])
      setDeleteDialogOpen(false)

      return remaining.length ? remaining : [fallback]
    })
  }

  const hasUnsavedChanges =
    schemaDraft.trim() !== baseSchemaText.trim() ||
    changeSummary.additions.length > 0 ||
    changeSummary.deletions.length > 0 ||
    changeSummary.renames.length > 0

  return {
    schemas,
    filteredSchemas,
    selectedSchema,
    selectedSchemaId,
    setSelectedSchemaId,
    searchTerm,
    setSearchTerm,
    schemaDraft,
    handleSchemaChange,
    changeSummary,
    typeConflicts,
    handleSave,
    handleCreateSchema,
    handleDeleteSchema,
    deleteDialogOpen,
    setDeleteDialogOpen,
    hasUnsavedChanges,
    lastSavedAt,
    typeErrors,
  }
}

export {
  analyzeSchemaChange,
  parseSchemaText,
  defaultSchemaTemplate,
  ALLOWED_TYPES,
  collectTypeErrors,
  mockSchemas,
  buildEmptySchema,
}
