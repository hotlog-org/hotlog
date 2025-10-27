'use client'

import { useDashboardOverviewService } from './dashboard-overview.service'
import { AnalyticsCharts } from './fields/analytics-charts'
import { SetupSection } from './fields/setup-section'
import { TeamMembersTable } from './fields/team-members-table'

export function DashboardOverviewComponent() {
  const service = useDashboardOverviewService()

  return (
    <div className='space-y-6'>
      {/* Analytics Charts */}
      <AnalyticsCharts
        apiRequestsData={service.apiRequestsData}
        recordsAndIdentitiesData={service.recordsAndIdentitiesData}
      />
      {/* Setup Section */}
      <SetupSection apiKey={service.apiKey} />
      {/* Team Members Table */}
      <TeamMembersTable teamMembers={service.teamMembers} />
    </div>
  )
}
