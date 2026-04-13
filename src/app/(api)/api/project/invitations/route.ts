import { type NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

import { envClient } from '@/config/env'
import { envServer } from '@/config/env/env.server'
import { createClient } from '@/lib/supabase/server'
import type { IApiErrorResponse } from '@/shared/api/interface'

const resend = envServer.RESEND_API_KEY
  ? new Resend(envServer.RESEND_API_KEY)
  : null

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get('project_id')

  if (!projectId) {
    return NextResponse.json<IApiErrorResponse>(
      { error: { message: 'project_id is required' } },
      { status: 400 },
    )
  }

  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json<IApiErrorResponse>(
      { error: { message: 'Unauthorized' } },
      { status: 401 },
    )
  }

  const { data: invitations, error } = await supabase
    .from('invitations' as never)
    .select('id, project_id, email, role_id, invited_by, token, status, created_at, expires_at' as '*')
    .eq('project_id', projectId)
    .eq('status', 'pending')

  if (error) {
    return NextResponse.json<IApiErrorResponse>(
      { error: { message: error.message } },
      { status: 500 },
    )
  }

  const mapped = ((invitations ?? []) as Record<string, unknown>[]).map(
    (inv) => ({
      id: inv.id as string,
      projectId: inv.project_id as string,
      email: inv.email as string,
      roleId: (inv.role_id as string) ?? null,
      invitedBy: inv.invited_by as string,
      token: inv.token as string,
      status: inv.status as string,
      createdAt: inv.created_at as string,
      expiresAt: inv.expires_at as string,
    }),
  )

  return NextResponse.json({ data: mapped })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json<IApiErrorResponse>(
      { error: { message: 'Unauthorized' } },
      { status: 401 },
    )
  }

  const body = await request.json()
  const { project_id, email, role_id } = body

  if (!project_id || !email) {
    return NextResponse.json<IApiErrorResponse>(
      { error: { message: 'project_id and email are required' } },
      { status: 400 },
    )
  }

  // Check if this email is already a project member
  const { data: emailRows } = await supabase.rpc(
    'get_project_member_emails' as never,
    { p_project_id: project_id } as never,
  )

  const existingEmails = (
    (emailRows ?? []) as { email: string }[]
  ).map((r) => r.email.toLowerCase())

  if (existingEmails.includes(email.toLowerCase())) {
    return NextResponse.json<IApiErrorResponse>(
      { error: { message: 'This user is already a project member' } },
      { status: 409 },
    )
  }

  // Create invitation
  const insertData: Record<string, unknown> = {
    project_id,
    email: email.toLowerCase(),
    invited_by: user.id,
  }
  if (role_id) {
    insertData.role_id = role_id
  }

  const { data: invitation, error } = await supabase
    .from('invitations' as never)
    .insert(insertData as never)
    .select('id, token, email, project_id, role_id' as '*')
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json<IApiErrorResponse>(
        { error: { message: 'An invitation is already pending for this email' } },
        { status: 409 },
      )
    }
    return NextResponse.json<IApiErrorResponse>(
      { error: { message: error.message } },
      { status: 500 },
    )
  }

  const inv = invitation as Record<string, unknown>

  // Get project name for the email
  const { data: project } = await supabase
    .from('projects')
    .select('name')
    .eq('id', project_id)
    .single()

  const projectName = project?.name ?? 'a project'
  const inviterEmail = user.email ?? 'A teammate'
  const acceptUrl = `${envClient.NEXT_PUBLIC_CLIENT_WEB_URL}/en/invite/accept?token=${inv.token}`

  // Send invitation email via Resend
  try {
    await resend?.emails.send({
      from: 'Hotlog <noreply@support.hotlog.org>',
      to: [email],
      subject: `You're invited to join ${projectName} on Hotlog`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
          <h2 style="color: #f5f5f5; margin-bottom: 8px;">You've been invited</h2>
          <p style="color: #a0a0a0; font-size: 15px; line-height: 1.5;">
            ${inviterEmail} invited you to join <strong>${projectName}</strong> on Hotlog.
          </p>
          <a href="${acceptUrl}" style="display: inline-block; margin-top: 24px; padding: 12px 28px; background: #6366f1; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 500; font-size: 14px;">
            Accept Invitation
          </a>
          <p style="color: #707070; font-size: 13px; margin-top: 32px;">
            This invitation expires in 7 days. If you didn't expect this, you can ignore this email.
          </p>
        </div>
      `,
      text: `${inviterEmail} invited you to join ${projectName} on Hotlog. Accept the invitation: ${acceptUrl}`,
    })
  } catch {
    // Email sending failure should not block invitation creation
    console.error('Failed to send invitation email')
  }

  return NextResponse.json(
    {
      data: {
        id: inv.id,
        email: inv.email,
        projectId: inv.project_id,
        roleId: inv.role_id ?? null,
        token: inv.token,
      },
    },
    { status: 201 },
  )
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const invitationId = searchParams.get('invitation_id')

  if (!invitationId) {
    return NextResponse.json<IApiErrorResponse>(
      { error: { message: 'invitation_id is required' } },
      { status: 400 },
    )
  }

  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json<IApiErrorResponse>(
      { error: { message: 'Unauthorized' } },
      { status: 401 },
    )
  }

  // Revoke by setting status
  const { error } = await supabase
    .from('invitations' as never)
    .update({ status: 'revoked' } as never)
    .eq('id', invitationId)
    .eq('status', 'pending')

  if (error) {
    return NextResponse.json<IApiErrorResponse>(
      { error: { message: error.message } },
      { status: 500 },
    )
  }

  return NextResponse.json({ data: { id: invitationId } })
}
