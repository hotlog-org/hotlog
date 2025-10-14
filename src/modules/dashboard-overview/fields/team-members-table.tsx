'use client'

import { Button } from '@/shared/ui/button'
import { Card } from '@/shared/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/table'
import { Trash2, UserPlus } from 'lucide-react'
import type { TeamMember } from '../dashboard-overview.service'

interface TeamMembersTableProps {
  teamMembers: TeamMember[]
}

export function TeamMembersTable({ teamMembers }: TeamMembersTableProps) {
  const handleInvite = () => {
    // TODO: Implement invite functionality
  }

  const handleRemove = () => {
    // TODO: Implement remove functionality
  }

  return (
    <Card className='p-6'>
      <div className='mb-6 flex items-center justify-between'>
        <div>
          <h2 className='text-xl font-semibold'>Team Members</h2>
          <p className='text-sm text-muted-foreground'>
            Manage your team and their access
          </p>
        </div>
        <Button onClick={handleInvite}>
          <UserPlus className='mr-2 h-4 w-4' />
          Invite Member
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead className='text-right'>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {teamMembers.map((member) => (
            <TableRow key={member.id}>
              <TableCell className='font-medium'>{member.name}</TableCell>
              <TableCell>{member.email}</TableCell>
              <TableCell>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    member.role === 'Owner'
                      ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                      : member.role === 'Admin'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                        : member.role === 'Member'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                  }`}
                >
                  {member.role}
                </span>
              </TableCell>
              <TableCell className='text-right'>
                <Button
                  variant='ghost'
                  size='icon'
                  onClick={handleRemove}
                  disabled={member.role === 'Owner'}
                  className='h-8 w-8'
                >
                  <Trash2 className='h-4 w-4' />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  )
}
