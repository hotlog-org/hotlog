'use client'

import {
  ArrowLeft as LucideArrowLeft,
  Search as LucideSearch,
  X as LucideX,
} from 'lucide-react'
import {
  Search01Icon,
  FilterAddIcon,
  SearchList01Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import { Button } from '@/shared/ui/button'
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarTrigger,
} from '@/shared/ui/menubar'
import { Input } from '@/shared/ui/input'
import {
  Field,
  FieldControl,
  FieldLabel,
  FieldMessage,
} from '@/shared/ui/field'

import type { EventsExtraComponentProps } from './events-extra.interface'
import { useEventsExtraService } from './events-extra.service'

export function EventsExtraComponent(props: EventsExtraComponentProps) {
  const service = useEventsExtraService(props)

  return (
    <div className=' space-y-2'>
      <div className='flex flex-wrap items-center gap-3'>
        <div className='relative w-64'>
          <LucideSearch className='text-muted-foreground absolute left-2 top-1/2 size-4 -translate-y-1/2' />
          <Input
            value={service.query}
            onChange={(e) => service.onQueryChange(e.target.value)}
            placeholder={service.t('extra.searchPlaceholder')}
            className='h-9 pl-8 pr-2'
          />
          {service.query ? (
            <button
              type='button'
              className='text-muted-foreground absolute right-2 top-1/2 -translate-y-1/2'
              onClick={() => service.onQueryChange('')}
            >
              <LucideX className='size-4' />
              <span className='sr-only'>{service.t('search.clear')}</span>
            </button>
          ) : null}
        </div>

        <Menubar className='h-9 border-border'>
          <MenubarMenu>
            <MenubarTrigger className='gap-2'>
              <HugeiconsIcon icon={FilterAddIcon} className='size-4' />
              {service.t('filter.button')}
            </MenubarTrigger>
            <MenubarContent className='w-80 space-y-3 p-3'>
              {service.filterMenu.step === 'schema' && (
                <div className='space-y-2'>
                  <div className='flex items-center gap-2 text-sm font-medium'>
                    <HugeiconsIcon icon={SearchList01Icon} className='size-4' />
                    {service.t('filter.selectSchema')}
                  </div>
                  <div className='space-y-1'>
                    {service.filterMenu.schemas.map((schema) => (
                      <MenubarItem
                        key={schema.id}
                        onSelect={(e) => {
                          e.preventDefault()
                          service.filterMenu.selectSchema(schema.id)
                        }}
                      >
                        <span className='flex items-center gap-2'>
                          {schema.name}
                          {service.filterMenu.schemaHasFilters(schema.id) && (
                            <span className='bg-amber-400 size-2 rounded-full' />
                          )}
                        </span>
                      </MenubarItem>
                    ))}
                  </div>
                </div>
              )}

              {service.filterMenu.step === 'field' && (
                <div className='space-y-2'>
                  <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-2'>
                      <Button
                        variant='ghost'
                        size='icon'
                        className='h-8 w-8'
                        onClick={service.filterMenu.back}
                      >
                        <LucideArrowLeft className='size-4' />
                      </Button>
                      <span className='text-sm font-medium'>
                        {service.draftSchemaName ??
                          service.t('filter.selectField')}
                      </span>
                    </div>
                    <Button
                      variant='ghost'
                      size='sm'
                      onClick={service.filterMenu.clearAll}
                    >
                      {service.t('filter.clearAll')}
                    </Button>
                  </div>
                  <MenubarSeparator />
                  <div className='max-h-64 space-y-1 overflow-y-auto'>
                    {service.filterMenu.fields.map(({ field, hasFilter }) => (
                      <MenubarItem
                        key={field.key}
                        onSelect={(e) => {
                          e.preventDefault()
                          service.filterMenu.selectField(field.key)
                        }}
                      >
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
                      </MenubarItem>
                    ))}
                  </div>
                </div>
              )}

              {service.filterMenu.step === 'value' && (
                <div className='space-y-3'>
                  <div className='flex items-center gap-2'>
                    <Button
                      variant='ghost'
                      size='icon'
                      className='h-8 w-8'
                      onClick={service.filterMenu.back}
                    >
                      <LucideArrowLeft className='size-4' />
                    </Button>
                    <span className='text-sm font-medium'>
                      {service.draftFieldLabel ??
                        service.t('filter.enterValue')}
                    </span>
                  </div>
                  <Field>
                    <FieldLabel>{service.t('filter.enterValue')}</FieldLabel>
                    <FieldControl>
                      <Input
                        autoFocus
                        value={service.filterMenu.draftValue}
                        onChange={(e) =>
                          service.handleValueChange(e.target.value)
                        }
                        placeholder={service.t('filter.valuePlaceholder')}
                      />
                    </FieldControl>
                    {service.valueError ? (
                      <FieldMessage state='error'>
                        {service.valueError}
                      </FieldMessage>
                    ) : null}
                  </Field>
                  <Button onClick={service.handleApply} className='w-full'>
                    {service.t('filter.apply')}
                  </Button>
                </div>
              )}
            </MenubarContent>
          </MenubarMenu>
        </Menubar>
      </div>

      {service.appliedFilters.length > 0 && (
        <div className='flex flex-wrap items-center gap-2'>
          {service.appliedFilters.map((filter) => {
            const schema = service.filterMenu.schemas.find(
              (s) => s.id === filter.schemaId,
            )
            const field = schema?.fields.find((f) => f.key === filter.fieldKey)
            return (
              <span
                key={`${filter.schemaId}-${filter.fieldKey}`}
                className='border-border text-muted-foreground inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs'
              >
                <span className='font-medium text-foreground'>
                  {schema?.name ?? filter.schemaId}
                </span>
                <span className='text-border'>/</span>
                <span>{field?.label ?? filter.fieldKey}</span>
                <span className='text-border'>=</span>
                <span className='text-foreground'>{filter.value}</span>
                <button
                  type='button'
                  onClick={() =>
                    service.removeFieldFilter(filter.schemaId, filter.fieldKey)
                  }
                  className='hover:text-foreground'
                >
                  <LucideX className='size-3.5' />
                </button>
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}
