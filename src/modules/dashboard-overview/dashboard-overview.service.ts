import type { TimeSeriesData } from '@/shared/charts'

export interface TeamMember {
  id: string
  name: string
  email: string
  role: 'Owner' | 'Admin' | 'Member' | 'Viewer'
}

export const useDashboardOverviewService = () => {
  // Mock time series data for API requests
  const getApiRequestsData = (): TimeSeriesData[] => {
    const data: TimeSeriesData[] = []
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 30)

    for (let i = 0; i < 30; i++) {
      const date = new Date(startDate)
      date.setDate(date.getDate() + i)

      data.push({
        date,
        value: Math.floor(Math.random() * 5000) + 1000,
        category: 'API Requests',
      })
    }
    return data
  }

  // Mock time series data for new records and identities
  const getNewRecordsAndIdentitiesData = (): TimeSeriesData[] => {
    const data: TimeSeriesData[] = []
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 30)

    for (let i = 0; i < 30; i++) {
      const date = new Date(startDate)
      date.setDate(date.getDate() + i)

      data.push({
        date,
        value: Math.floor(Math.random() * 200) + 50,
        category: 'New Records',
      })

      data.push({
        date,
        value: Math.floor(Math.random() * 100) + 20,
        category: 'New Identities',
      })
    }
    return data
  }

  // Mock API key
  const getApiKey = (): string => {
    return 'hl_sk_1234567890abcdefghijklmnopqrstuvwxyz'
  }

  // Mock team members data
  const getTeamMembers = (): TeamMember[] => [
    {
      id: '1',
      name: 'John Doe',
      email: 'john.doe@example.com',
      role: 'Owner',
    },
    {
      id: '2',
      name: 'Jane Smith',
      email: 'jane.smith@example.com',
      role: 'Admin',
    },
    {
      id: '3',
      name: 'Mike Johnson',
      email: 'mike.johnson@example.com',
      role: 'Member',
    },
    {
      id: '4',
      name: 'Sarah Williams',
      email: 'sarah.williams@example.com',
      role: 'Member',
    },
    {
      id: '5',
      name: 'Tom Brown',
      email: 'tom.brown@example.com',
      role: 'Viewer',
    },
  ]

  return {
    apiRequestsData: getApiRequestsData(),
    recordsAndIdentitiesData: getNewRecordsAndIdentitiesData(),
    apiKey: getApiKey(),
    teamMembers: getTeamMembers(),
  }
}
