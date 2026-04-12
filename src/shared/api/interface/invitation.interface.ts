export enum EInvitationApi {
  INVITATIONS_API = 'project/invitations',
  ACCEPT_INVITATION_API = 'invite/accept',
}

export enum EInvitationKey {
  INVITATIONS_QUERY = 'invitations_query',
}

export interface IInvitationDto {
  id: string
  projectId: string
  email: string
  roleId: string | null
  invitedBy: string
  token: string
  status: string
  createdAt: string
  expiresAt: string
}

export interface IInvitationsResponse {
  data: IInvitationDto[]
}

export interface ICreateInvitationPayload {
  project_id: string
  email: string
  role_id?: string
}

export interface IRevokeInvitationPayload {
  invitation_id: string
}

export interface IAcceptInvitationPayload {
  token: string
}

export interface IAcceptInvitationResponse {
  data: {
    projectId: string
    alreadyMember: boolean
  }
}
