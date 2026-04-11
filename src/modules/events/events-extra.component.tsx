'use client'

import { useRef, useState } from 'react'
import {
  ArrowLeft as LucideArrowLeft,
  Search as LucideSearch,
  X as LucideX,
} from 'lucide-react'
import {
  FilterAddIcon,
  Search01Icon,
  SearchList01Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarTrigger,
} from '@/shared/ui/menubar'

import type { FilterMenuState, TFunction } from './events.service'
import {
  ValueTokenInput,
  type ValueTokenInputHandle,
} from './fields/filter/value-token-input.component'
import type { ValueClause } from './fields/filter/value-clause-parser'

export interface EventsExtraComponentProps {
  t: TFunction
  query: string
  onQueryChange: (value: string) => void
  filterMenu: FilterMenuState
}

export function EventsExtraComponent(props: EventsExtraComponentProps) {
  const { t, query, onQueryChange, filterMenu } = props
  const [draftClauses, setDraftClauses] = useState<ValueClause[]>([])
  const [hasContent, setHasContent] = useState(false)
  const valueInputRef = useRef<ValueTokenInputHandle | null>(null)

  const handleApply = () => {
    // The parser keeps the clause list in sync with the visible badges,
    // so we just commit whatever's currently parsed.
    const finalClauses = valueInputRef.current?.getClauses() ?? draftClauses
    if (finalClauses.length === 0) return
    filterMenu.applyClauses(
      finalClauses.map((c) => ({
        operator: c.operator,
        values: c.values,
        quantifier: c.quantifier,
        keyPath: c.keyPath,
      })),
    )
    setDraftClauses([])
    setHasContent(false)
  }

  return (
    <div className='space-y-2'>
      <div className='flex flex-wrap items-end gap-3'>
        <Menubar className='h-9 border-border'>
          <MenubarMenu>
            <MenubarTrigger
              className='gap-2 hover:bg-transparent focus:bg-transparent'
              onClick={() => filterMenu.openChange(!filterMenu.open)}
            >
              <HugeiconsIcon icon={FilterAddIcon} className='size-4' />
              {t('filter.button')}
            </MenubarTrigger>
            <MenubarContent className='w-96 space-y-3 p-3'>
              {filterMenu.step === 'schema' && (
                <div className='space-y-2'>
                  <div className='flex items-center gap-2 text-sm font-medium'>
                    <HugeiconsIcon icon={SearchList01Icon} className='size-4' />
                    {t('filter.selectSchema')}
                  </div>
                  <div className='space-y-1'>
                    {filterMenu.schemas.length === 0 ? (
                      <p className='px-2 py-1 text-xs text-muted-foreground'>
                        {t('filter.noSchemas')}
                      </p>
                    ) : (
                      filterMenu.schemas.map((schema) => (
                        <MenubarItem
                          key={schema.id}
                          onSelect={(e) => {
                            e.preventDefault()
                            filterMenu.selectSchema(schema.id)
                          }}
                        >
                          <span className='flex items-center gap-2'>
                            {schema.name}
                            {filterMenu.schemaHasFilters(schema.id) && (
                              <span className='bg-amber-400 size-2 rounded-full' />
                            )}
                          </span>
                        </MenubarItem>
                      ))
                    )}
                  </div>
                </div>
              )}

              {filterMenu.step === 'field' && (
                <div className='space-y-2'>
                  <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-2'>
                      <Button
                        variant='ghost'
                        size='icon'
                        className='h-8 w-8'
                        onClick={filterMenu.back}
                      >
                        <LucideArrowLeft className='size-4' />
                      </Button>
                      <span className='text-sm font-medium'>
                        {filterMenu.draftSchemaName ?? t('filter.selectField')}
                      </span>
                    </div>
                    <Button
                      variant='ghost'
                      size='sm'
                      onClick={filterMenu.clearAll}
                    >
                      {t('filter.clearAll')}
                    </Button>
                  </div>
                  <MenubarSeparator />
                  <div className='max-h-64 space-y-1 overflow-y-auto'>
                    {filterMenu.fields.length === 0 ? (
                      <p className='px-2 py-1 text-xs text-muted-foreground'>
                        {t('filter.noFields')}
                      </p>
                    ) : (
                      filterMenu.fields.map(({ field, hasFilter }) => (
                        <MenubarItem
                          key={field.key}
                          onSelect={(e) => {
                            e.preventDefault()
                            filterMenu.selectField(field.key)
                          }}
                        >
                          <span className='flex w-full items-center justify-between gap-2'>
                            <span className='flex items-center gap-2'>
                              <HugeiconsIcon
                                icon={Search01Icon}
                                className='size-4'
                              />
                              {field.label}
                              {hasFilter && (
                                <span className='bg-amber-400 size-2 rounded-full' />
                              )}
                            </span>
                            <span className='text-[10px] uppercase text-muted-foreground'>
                              {field.type}
                            </span>
                          </span>
                        </MenubarItem>
                      ))
                    )}
                  </div>
                </div>
              )}

              {filterMenu.step === 'value' && filterMenu.draftField && (
                <div className='space-y-3'>
                  <div className='flex items-center gap-2'>
                    <Button
                      variant='ghost'
                      size='icon'
                      className='h-8 w-8'
                      onClick={filterMenu.back}
                    >
                      <LucideArrowLeft className='size-4' />
                    </Button>
                    <div className='flex flex-col'>
                      <span className='text-sm font-medium'>
                        {filterMenu.draftField.label}
                      </span>
                      <span className='text-[10px] uppercase text-muted-foreground'>
                        {filterMenu.draftField.type}
                      </span>
                    </div>
                  </div>

                  <ValueTokenInput
                    ref={valueInputRef}
                    fieldType={filterMenu.draftField.type}
                    enumValues={filterMenu.draftField.enumValues}
                    initialText={filterMenu.initialValueText}
                    placeholder={t('filter.valuePlaceholder')}
                    onClausesChange={setDraftClauses}
                    onHasContentChange={setHasContent}
                    t={(key) => t(key)}
                  />

                  <Button
                    onClick={(e) => {
                      e.preventDefault()
                      handleApply()
                    }}
                    // Apply is enabled when either the user has typed
                    // something OR there were existing filters being
                    // edited (so they can be cleared by emptying the
                    // input).
                    disabled={
                      !hasContent && filterMenu.initialValueText.length === 0
                    }
                    className='w-full'
                  >
                    {!hasContent && filterMenu.initialValueText.length > 0
                      ? t('filter.clearField')
                      : draftClauses.length > 1
                        ? t('filter.applyCount', {
                            count: draftClauses.length,
                          })
                        : t('filter.apply')}
                  </Button>
                </div>
              )}
            </MenubarContent>
          </MenubarMenu>
        </Menubar>

        <div className='relative w-64 sm:ml-auto sm:min-w-[240px]'>
          <LucideSearch className='text-muted-foreground absolute left-2 top-1/2 size-4 -translate-y-1/2' />
          <Input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder={t('extra.searchPlaceholder')}
            className='h-9 pl-8 pr-2'
          />
          {query ? (
            <button
              type='button'
              className='text-muted-foreground absolute right-2 top-1/2 -translate-y-1/2'
              onClick={() => onQueryChange('')}
            >
              <LucideX className='size-4' />
              <span className='sr-only'>{t('search.clear')}</span>
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
