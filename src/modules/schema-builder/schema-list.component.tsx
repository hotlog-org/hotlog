'use client'

import { ERoutes } from '@/config/routes'
import { Button } from '@/shared/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/ui/card'
import { Input } from '@/shared/ui/input'
import { ScrollArea } from '@/shared/ui/scroll-area'
import { cn } from '@/shared/utils/shadcn.utils'
import { Link } from '@/i18n/navigation'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { mockSchemas, parseSchemaText } from './schema-builder.service'

export const SchemaListComponent = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const router = useRouter()

  const filteredSchemas = useMemo(() => {
    const term = searchTerm.toLowerCase()
    return mockSchemas.filter(
      (schema) =>
        schema.name.toLowerCase().includes(term) ||
        schema.description.toLowerCase().includes(term),
    )
  }, [searchTerm])

  return (
    <div className='space-y-6'>
      <div className='flex flex-col gap-2'>
        <h1 className='text-3xl font-semibold'>Schemas</h1>
        <p className='text-muted-foreground max-w-2xl text-sm'>
          Search and open schema prompts. Edits happen on a dedicated page.
        </p>
      </div>

      <Card className='h-full border-dashed'>
        <CardHeader className='gap-3'>
          <div className='flex items-start justify-between gap-3'>
            <div>
              <CardTitle>Schema list</CardTitle>
              <CardDescription>
                Choose a schema to view and edit it in a dedicated page.
              </CardDescription>
            </div>
            <Button
              variant='secondary'
              size='sm'
              onClick={() => {
                const id = `schema_${Date.now()}`
                router.push(`${ERoutes.DASHBOARD_SCHEMA}/${id}`)
              }}
            >
              New schema
            </Button>
          </div>

          <div className='flex items-center gap-2'>
            <div className='relative flex-1'>
              <Input
                className='pl-3'
                placeholder='Search schemas...'
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {filteredSchemas.length === 0 ? (
            <div className='flex h-[320px] items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/20 text-sm text-muted-foreground'>
              No schemas match your search.
            </div>
          ) : (
            <ScrollArea className='h-[520px] pr-2'>
              <div className='flex flex-col gap-2'>
                {filteredSchemas.map((schema) => {
                  const fieldCount = Object.keys(
                    parseSchemaText(schema.schema),
                  ).length
                  return (
                    <div
                      key={schema.id}
                      className={cn(
                        'border-border/50 hover:border-foreground/30 hover:bg-muted/40 text-left rounded-lg border px-3 py-3 transition-colors',
                      )}
                    >
                      <div className='flex items-center justify-between gap-2'>
                        <div>
                          <p className='text-sm font-semibold'>{schema.name}</p>
                          <p className='text-xs text-muted-foreground'>
                            {schema.description}
                          </p>
                          <div className='mt-2 flex items-center gap-2 text-[11px] text-muted-foreground'>
                            <span className='rounded-sm bg-foreground/5 px-2 py-0.5 font-medium uppercase tracking-tight'>
                              {schema.version}
                            </span>
                            <span className='rounded-sm bg-foreground/5 px-2 py-0.5'>
                              {fieldCount} fields
                            </span>
                          </div>
                        </div>
                        <Link href={`${ERoutes.DASHBOARD_SCHEMA}/${schema.id}`}>
                          <Button
                            variant='secondary'
                            size='sm'
                            className='shrink-0'
                          >
                            Open
                          </Button>
                        </Link>
                      </div>
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
