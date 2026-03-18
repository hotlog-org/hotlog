'use client'

import {
  type AppAbility,
  buildAbility,
  type PermissionString,
} from '@/shared/utils'
import { atom, useAtom } from 'jotai'

type PermissionStrings = PermissionString[]

const abilityAtom = atom<AppAbility>(buildAbility([]))

export function useAbility() {
  const [ability, setAbility] = useAtom(abilityAtom)

  function buildAbilityFromString(permissionStrings: PermissionStrings): void {
    setAbility(buildAbility(permissionStrings))
  }

  return { ability, buildAbilityFromString }
}
