'use client'

import {
  BrushIcon,
  Delete02Icon,
  LeftToRightBlockQuoteIcon,
  TextAlignJustifyCenterIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import {
  AreaChart,
  BarChart,
  DonutChart,
  HeatmapChart,
  HistogramChart,
  LineChart,
  PieChart,
  ScatterChart,
  StackedBarChart,
  TimelineChart,
} from '@/shared/charts'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { cn } from '@/shared/utils/shadcn.utils'

import type {
  ModuleComponent,
  ModuleSchemaDefinition,
  ModuleVisualizationDefinition,
  TFunction,
} from '../../modules.interface'
import { useModulesViewService } from './modules-view.service'

export interface ModulesViewProps {
  components: ModuleComponent[]
  schemas: ModuleSchemaDefinition[]
  visualizations: ModuleVisualizationDefinition[]
  reorderEnabled: boolean
  onReorder: (fromId: string, toId: string) => void
  onEdit: (componentId: string) => void
  onDelete?: (componentId: string) => void
  onToggleSpan?: (componentId: string) => void
  t: TFunction
}

const renderText = (value: string | undefined, fallback: string) => (
  <p className='text-sm text-foreground'>{value || fallback}</p>
)

const renderChart = (
  component: ModuleComponent,
  preview: {
    kind: ModuleVisualizationDefinition['id']
    payload: unknown
  } | null,
) => {
  if (!preview) return null

  switch (preview.kind) {
    case 'line':
      return (
        <LineChart
          data={preview.payload as any}
          height={260}
          className='w-full'
        />
      )
    case 'area':
      return (
        <AreaChart
          data={preview.payload as any}
          height={260}
          className='w-full'
        />
      )
    case 'bar':
      return (
        <BarChart
          data={preview.payload as any}
          height={260}
          className='w-full'
        />
      )
    case 'stackedBar':
      return (
        <StackedBarChart
          data={preview.payload as any}
          height={260}
          className='w-full'
        />
      )
    case 'pie':
      return <PieChart data={preview.payload as any} height={240} />
    case 'donut':
      return <DonutChart data={preview.payload as any} height={240} />
    case 'scatter':
      return (
        <ScatterChart
          data={preview.payload as any}
          height={260}
          className='w-full'
        />
      )
    case 'heatmap':
      return <HeatmapChart data={preview.payload as any} height={260} />
    case 'histogram':
      return <HistogramChart data={preview.payload as any} height={240} />
    case 'timeline':
      return <TimelineChart data={preview.payload as any} height={240} />
    default:
      return null
  }
}

export const ModulesView = (props: ModulesViewProps) => {
  const service = useModulesViewService(props)

  if (props.components.length === 0) {
    return (
      <div className='rounded-lg border border-dashed border-border/70 bg-muted/40 p-6 text-center text-sm text-muted-foreground'>
        {props.t('empty')}
      </div>
    )
  }

  return (
    <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
      {service.items.map((item) => (
        <div
          key={item.component.id}
          draggable={props.reorderEnabled}
          onDragStart={(event) => {
            event.dataTransfer.setData('text/plain', item.component.id)
            service.handleDragStart(item.component.id)
          }}
          onDragOver={service.handleDragOver}
          onDrop={(event) => {
            event.preventDefault()
            service.handleDrop(item.component.id)
          }}
          onDragEnd={service.handleDragEnd}
          className={cn(
            'rounded-lg border border-border/80 bg-card/70 p-4 shadow-sm transition',
            item.component.span === 'full'
              ? 'col-span-1 sm:col-span-2'
              : 'col-span-1',
            props.reorderEnabled &&
              'cursor-grab border-dashed hover:border-primary',
            service.draggingId === item.component.id &&
              'border-primary/80 bg-accent/30',
          )}
        >
          <div className='space-y-2 rounded-md p-3'>
            {item.component.title ? (
              <p className='text-sm font-semibold text-foreground'>
                {item.component.title}
              </p>
            ) : null}
            {item.component.description ? (
              <p className='text-xs text-muted-foreground'>
                {item.component.description}
              </p>
            ) : null}

            <div className='overflow-hidden rounded-md border border-border/80 bg-card/40 p-4'>
              {renderChart(item.component, item.preview)}
            </div>
          </div>

          {props.reorderEnabled ? (
            <div className='w-full flex justify-end gap-3 pr-3'>
              {props.onToggleSpan ? (
                <Button
                  variant='outline'
                  size='icon'
                  onClick={() => props.onToggleSpan?.(item.component.id)}
                  aria-label={
                    item.component.span === 'half'
                      ? props.t('actions.fullWidth')
                      : props.t('actions.halfWidth')
                  }
                >
                  <HugeiconsIcon
                    icon={
                      item.component.span === 'half'
                        ? TextAlignJustifyCenterIcon
                        : LeftToRightBlockQuoteIcon
                    }
                    className='size-5'
                  />
                </Button>
              ) : null}
              <Button
                variant='outline'
                size='icon'
                onClick={() => props.onEdit(item.component.id)}
                aria-label={props.t('actions.edit')}
              >
                <HugeiconsIcon icon={BrushIcon} className='size-5' />
              </Button>
              {props.onDelete ? (
                <Button
                  variant='destructive'
                  size='icon'
                  onClick={() => props.onDelete?.(item.component.id)}
                  aria-label={props.t('actions.delete')}
                >
                  <HugeiconsIcon icon={Delete02Icon} className='size-5' />
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  )
}
