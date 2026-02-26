'use client'

import { BrushIcon, Delete02Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import type { ComponentProps } from 'react'

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
  t: TFunction
}

type LineData = ComponentProps<typeof LineChart>['data']
type AreaData = ComponentProps<typeof AreaChart>['data']
type BarData = ComponentProps<typeof BarChart>['data']
type StackedBarData = ComponentProps<typeof StackedBarChart>['data']
type PieData = ComponentProps<typeof PieChart>['data']
type DonutData = ComponentProps<typeof DonutChart>['data']
type ScatterData = ComponentProps<typeof ScatterChart>['data']
type HeatmapData = ComponentProps<typeof HeatmapChart>['data']
type HistogramData = ComponentProps<typeof HistogramChart>['data']
type TimelineData = ComponentProps<typeof TimelineChart>['data']

const toChartData = <T,>(payload: unknown): T => payload as T

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
          data={toChartData<LineData>(preview.payload)}
          height={260}
          className='w-full'
        />
      )
    case 'area':
      return (
        <AreaChart
          data={toChartData<AreaData>(preview.payload)}
          height={260}
          className='w-full'
        />
      )
    case 'bar':
      return (
        <BarChart
          data={toChartData<BarData>(preview.payload)}
          height={260}
          className='w-full'
        />
      )
    case 'stackedBar':
      return (
        <StackedBarChart
          data={toChartData<StackedBarData>(preview.payload)}
          height={260}
          className='w-full'
        />
      )
    case 'pie':
      return (
        <PieChart data={toChartData<PieData>(preview.payload)} height={240} />
      )
    case 'donut':
      return (
        <DonutChart
          data={toChartData<DonutData>(preview.payload)}
          height={240}
        />
      )
    case 'scatter':
      return (
        <ScatterChart
          data={toChartData<ScatterData>(preview.payload)}
          height={260}
          className='w-full'
        />
      )
    case 'heatmap':
      return (
        <HeatmapChart
          data={toChartData<HeatmapData>(preview.payload)}
          height={260}
        />
      )
    case 'histogram':
      return (
        <HistogramChart
          data={toChartData<HistogramData>(preview.payload)}
          height={240}
        />
      )
    case 'timeline':
      return (
        <TimelineChart
          data={toChartData<TimelineData>(preview.payload)}
          height={240}
        />
      )
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
    <div className='grid grid-cols-1 gap-4'>
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
              <Button
                variant='outline'
                size='icon'
                onClick={() => props.onEdit(item.component.id)}
                aria-label={props.t('actions.edit')}
              >
                <HugeiconsIcon icon={BrushIcon} className='size-5' />
              </Button>
              <Button
                variant='destructive'
                size='icon'
                onClick={() => props.onDelete?.(item.component.id)}
                aria-label={props.t('actions.delete')}
                disabled={!props.onDelete}
              >
                <HugeiconsIcon icon={Delete02Icon} className='size-5' />
              </Button>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  )
}
