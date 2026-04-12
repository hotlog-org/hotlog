'use client'

import { useRef, useState } from 'react'
import { ArrowLeft as LucideArrowLeft } from 'lucide-react'
import {
  FilterAddIcon,
  Search01Icon,
  SearchList01Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import { useIsMobile } from '@/shared/hooks/use-mobile'
import { Button } from '@/shared/ui/button'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/shared/ui/drawer'
import { ExpandableSearch } from '@/shared/ui/expandable-search'
import { Separator } from '@/shared/ui/separator'
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

function FilterBody({
  filterMenu,
  t,
  valueInputRef,
  draftClauses,
  setDraftClauses,
  hasContent,
  setHasContent,
  handleApply,
}: {
  filterMenu: FilterMenuState
  t: TFunction
  valueInputRef: React.RefObject<ValueTokenInputHandle | null>
  draftClauses: ValueClause[]
  setDraftClauses: (c: ValueClause[]) => void
  hasContent: boolean
  setHasContent: (v: boolean) => void
  handleApply: () => void
}) {
  return (
    <div className='space-y-3'>
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
                <button
                  type='button'
                  key={schema.id}
                  className='flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-accent'
                  onClick={() => filterMenu.selectSchema(schema.id)}
                >
                  {schema.name}
                  {filterMenu.schemaHasFilters(schema.id) && (
                    <span className='bg-amber-400 size-2 rounded-full' />
                  )}
                </button>
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
          <Separator />
          <div className='max-h-64 space-y-1 overflow-y-auto'>
            {filterMenu.fields.length === 0 ? (
              <p className='px-2 py-1 text-xs text-muted-foreground'>
                {t('filter.noFields')}
              </p>
            ) : (
              filterMenu.fields.map(({ field, hasFilter }) => (
                <button
                  type='button'
                  key={field.key}
                  className='flex w-full items-center justify-between gap-2 rounded-md px-2 py-2 text-sm hover:bg-accent'
                  onClick={() => filterMenu.selectField(field.key)}
                >
                  <span className='flex items-center gap-2'>
                    <HugeiconsIcon icon={Search01Icon} className='size-4' />
                    {field.label}
                    {hasFilter && (
                      <span className='bg-amber-400 size-2 rounded-full' />
                    )}
                  </span>
                  <span className='text-[10px] uppercase text-muted-foreground'>
                    {field.type}
                  </span>
                </button>
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
    </div>
  )
}

export function EventsExtraComponent(props: EventsExtraComponentProps) {
  const { t, query, onQueryChange, filterMenu } = props
  const isMobile = useIsMobile()
  const [draftClauses, setDraftClauses] = useState<ValueClause[]>([])
  const [hasContent, setHasContent] = useState(false)
  const valueInputRef = useRef<ValueTokenInputHandle | null>(null)

  const handleApply = () => {
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

  const filterBodyProps = {
    filterMenu,
    t,
    valueInputRef,
    draftClauses,
    setDraftClauses,
    hasContent,
    setHasContent,
    handleApply,
  }

  return (
    <div className='flex items-center gap-2'>
      {isMobile ? (
        <>
          <Button
            variant='outline'
            size='sm'
            className='h-9'
            onClick={() => filterMenu.openChange(true)}
          >
            <HugeiconsIcon icon={FilterAddIcon} className='size-4' />
          </Button>
          <Drawer
            open={filterMenu.open}
            onOpenChange={(open) => filterMenu.openChange(open)}
            direction='bottom'
          >
            <DrawerContent className='max-h-[85vh]'>
              <DrawerHeader className='text-left'>
                <DrawerTitle>{t('filter.button')}</DrawerTitle>
              </DrawerHeader>
              <div className='overflow-y-auto px-4 pb-4'>
                <FilterBody {...filterBodyProps} />
              </div>
            </DrawerContent>
          </Drawer>
        </>
      ) : (
        <Menubar
          className='h-9 border-border bg-transparent p-0 shadow-none'
          value={filterMenu.open ? 'filter' : ''}
          onValueChange={(v) => filterMenu.openChange(v === 'filter')}
        >
          <MenubarMenu value='filter'>
            <MenubarTrigger className='h-full gap-2 rounded-md border border-border bg-card px-3 data-[state=open]:bg-muted'>
              <HugeiconsIcon icon={FilterAddIcon} className='size-4' />
              {t('filter.button')}
            </MenubarTrigger>
            <MenubarContent className='w-96 space-y-3 p-3' sideOffset={8} align='end'>
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
      )}

      <ExpandableSearch
        value={query}
        onChange={onQueryChange}
        placeholder={t('extra.searchPlaceholder')}
      />
    </div>
  )
}
