'use client'

import { useTranslations } from 'next-intl'

export const useDashboardSidebarContentService = () => {
  const t = useTranslations('modules.dashboard.sidebar')

  // Mock dashboards data - will be replaced with real data from API
  const dashboards = [
    {
      id: '1',
      name: 'Website Analytics',
      color: '#3b82f6',
    },
    {
      id: '2',
      name: 'Mobile App',
      color: '#8b5cf6',
    },
    {
      id: '3',
      name: 'API Monitoring',
      color: '#10b981',
    },
    {
      id: '4',
      name: 'User Behavior',
      color: '#f59e0b',
    },
  ]

  return {
    t,
    dashboards,
  }
}
