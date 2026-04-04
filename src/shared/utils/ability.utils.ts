import {
  AbilityBuilder,
  createMongoAbility,
  type MongoAbility,
} from '@casl/ability'

export const APP_ACTIONS = ['create', 'read', 'update', 'delete'] as const

export const APP_SUBJECTS = [
  'all',
  'projects',
  'events',
  'schemas',
  'fields',
  'modules',
  'layouts',
  'components',
  'roles',
  'permissions',
  'users',
  'api_keys',
] as const

export type AppAction = (typeof APP_ACTIONS)[number]
export type AppSubject = (typeof APP_SUBJECTS)[number]
export type PermissionString = `${AppAction}:${AppSubject}`
export type AppAbility = MongoAbility<[AppAction, AppSubject]>

export const isAppAction = (value: string): value is AppAction =>
  APP_ACTIONS.includes(value as AppAction)

export const isAppSubject = (value: string): value is AppSubject =>
  APP_SUBJECTS.includes(value as AppSubject)

export const parsePermissionString = (
  permission: string,
): [AppAction, AppSubject] | null => {
  const [action, subject] = permission.split(':')

  if (!action || !subject || !isAppAction(action) || !isAppSubject(subject)) {
    return null
  }

  return [action, subject]
}

export const buildAbility = (
  permissionStrings: readonly string[] = [],
): AppAbility => {
  const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility)

  permissionStrings.forEach((permission) => {
    const parsedPermission = parsePermissionString(permission)

    if (parsedPermission) {
      const [action, subject] = parsedPermission
      can(action, subject)
    }
  })

  return build()
}

export const hasAbilityPermission = (
  ability: AppAbility,
  permission: string,
): boolean => {
  const parsedPermission = parsePermissionString(permission)

  if (!parsedPermission) {
    return false
  }

  return ability.can(...parsedPermission)
}
