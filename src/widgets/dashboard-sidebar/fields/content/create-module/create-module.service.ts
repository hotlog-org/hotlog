'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'

import { useModulesStore } from '@/modules/modules/modules.store'
import type { DashboardSidebarCreateModuleProps } from './create-module.component'

export const useDashboardSidebarCreateModuleService = (
  _props: DashboardSidebarCreateModuleProps,
) => {
  const t = useTranslations('modules.dashboard.modules')
  const sidebarTranslations = useTranslations('modules.dashboard.sidebar')
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [color, setColor] = useState('#3b82f6')
  const addModule = useModulesStore((state) => state.addModule)
  const setSelectedModuleId = useModulesStore(
    (state) => state.setSelectedModuleId,
  )

  const handleSubmit = () => {
    if (!name.trim()) return
    const module = addModule({ name: name.trim(), color })
    setSelectedModuleId(module.id)
    setName('')
    setOpen(false)
  }

  return {
    t,
    buttonLabel: sidebarTranslations('groups.addNew'),
    open,
    setOpen,
    name,
    setName,
    color,
    setColor,
    handleSubmit,
  }
}

