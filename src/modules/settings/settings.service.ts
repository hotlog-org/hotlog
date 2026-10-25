'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { useQueryClient } from '@tanstack/react-query'
import { usePathname, useRouter } from '@/i18n/navigation'
import { routing } from '@/i18n/routing'
import { ERoutes } from '@/config/routes'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/shared/hooks/use-auth'
import { useUserProjectsQuery } from '@/shared/api/user-project'
import { deleteProjectApi } from '@/shared/api/user-project/user-project.api'
import {
  EUserProjectKey,
  type IUserProjectDto,
  type IUserProjectsResponse,
} from '@/shared/api/interface'
import { useDashboardProject } from '@/shared/store/dashboard-project.store'
import { useModulesStore } from '@/modules/modules/modules.store'
import { deleteAccountApi, leaveProjectApi } from './settings.api'

export type SettingsTab = 'account' | 'language' | 'projects'
export type SettingsConfirmation =
  | { kind: 'account' }
  | { kind: 'leave' | 'delete'; project: IUserProjectDto }

export function useSettingsService(
  initialTab: SettingsTab,
  onClose: () => void,
) {
  const t = useTranslations('modules.dashboard.settings')
  const { user, isLoading: authLoading } = useAuth()
  const [supabase] = useState(createClient)
  const [sessionEnded, setSessionEnded] = useState(false)
  const projectsQuery = useUserProjectsQuery({
    enabled: Boolean(user) && !sessionEnded,
  })
  const projects = projectsQuery.data?.data ?? []
  const queryClient = useQueryClient()
  const selectedProjectId = useDashboardProject((s) => s.selectedProjectId)
  const router = useRouter()
  const pathname = usePathname()
  const locale = useLocale()
  const [tab, setTab] = useState(initialTab)
  const [name, setName] = useState(user?.name ?? '')
  const nameDirty = useRef(false)
  useEffect(() => {
    if (!nameDirty.current) setName(user?.name ?? '')
  }, [user?.name])
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmation, setConfirmation] = useState<SettingsConfirmation | null>(
    null,
  )
  const [confirmationText, setConfirmationText] = useState('')
  const [pending, setPending] = useState<
    'name' | 'leave' | 'delete' | 'account' | 'logout' | null
  >(null)
  const [languagePending, startLanguageTransition] = useTransition()
  const busy = useRef(false)
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])
  const isBusy = Boolean(pending) || languagePending
  const ownedProjects = projects.filter((project) => project.isCreator)
  const projectsReady =
    !projectsQuery.isPending &&
    !projectsQuery.isError &&
    !projectsQuery.isPlaceholderData

  const run = async (
    action: NonNullable<typeof pending>,
    work: () => Promise<void>,
  ) => {
    if (busy.current || languagePending || !user) return
    busy.current = true
    setPending(action)
    setError(null)
    setSaved(false)
    try {
      await work()
    } catch (err) {
      if (mounted.current)
        setError(err instanceof Error ? err.message : t('failed'))
    } finally {
      busy.current = false
      if (mounted.current) setPending(null)
    }
  }

  const updateName = (value: string) => {
    if (busy.current) return
    nameDirty.current = true
    setName(value)
    setSaved(false)
    setError(null)
  }
  const saveName = () =>
    run('name', async () => {
      const trimmed = name.trim()
      if (
        !trimmed ||
        trimmed.length > 80 ||
        /[\u0000-\u001f\u007f]/.test(trimmed)
      )
        throw new Error(t('nameInvalid'))
      const { data, error: updateError } = await supabase.auth.updateUser({
        data: { username: trimmed },
      })
      if (updateError) throw updateError
      if (data.user?.id !== user?.id) throw new Error(t('failed'))
      if (!mounted.current) return
      nameDirty.current = false
      setName(trimmed)
      setSaved(true)
    })

  const requestConfirmation = (value: SettingsConfirmation) => {
    if (busy.current || languagePending || !projectsReady) return
    if (value.kind === 'account' && ownedProjects.length) return
    if (value.kind !== 'account') {
      const project = projects.find((item) => item.id === value.project.id)
      if (
        !project ||
        (value.kind === 'leave'
          ? project.isCreator
          : !(project.canDelete ?? project.isCreator))
      )
        return
    }
    setError(null)
    setSaved(false)
    setConfirmationText('')
    setConfirmation(value)
  }
  const cancelConfirmation = () => {
    if (busy.current) return
    setConfirmation(null)
    setConfirmationText('')
    setError(null)
  }
  const expectedConfirmation =
    confirmation?.kind === 'account' ? user?.email : confirmation?.project.name
  const confirmationMatches = Boolean(
    expectedConfirmation && confirmationText === expectedConfirmation,
  )

  const confirmAction = async () => {
    const target = confirmation
    if (!target || !confirmationMatches || !projectsReady) return
    if (target.kind === 'account') {
      if (ownedProjects.length) return
      await run('account', async () => {
        await deleteAccountApi(confirmationText)
        if (!mounted.current) return
        setSessionEnded(true)
        // Deletion has been confirmed server-side. Local sign-out is cleanup,
        // not a reason to misleadingly report the completed deletion as failed.
        await supabase.auth.signOut({ scope: 'local' }).catch(() => {})
        await queryClient.cancelQueries()
        useDashboardProject.setState({ selectedProjectId: undefined })
        useModulesStore.setState({ selectedModuleId: null })
        router.replace(ERoutes.SIGN_IN)
        router.refresh()
        onClose()
        queryClient.clear()
      })
      return
    }
    const project = projects.find((item) => item.id === target.project.id)
    if (
      !project ||
      (target.kind === 'leave'
        ? project.isCreator
        : !(project.canDelete ?? project.isCreator))
    )
      return
    await run(target.kind, async () => {
      if (target.kind === 'leave') await leaveProjectApi(project.id)
      else await deleteProjectApi(project.id)
      if (!mounted.current) return
      // Cancel project reads before eviction; late responses must not repopulate
      // data for a membership that has just been removed.
      await queryClient.cancelQueries({
        predicate: (query) => query.queryKey.includes(project.id),
      })
      queryClient.removeQueries({
        predicate: (query) => query.queryKey.includes(project.id),
      })
      await queryClient.cancelQueries({
        queryKey: [EUserProjectKey.USER_PROJECTS_QUERY],
      })
      const latest = queryClient.getQueryData<IUserProjectsResponse>([
        EUserProjectKey.USER_PROJECTS_QUERY,
      ])
      const remaining = (latest?.data ?? projects).filter(
        (item) => item.id !== project.id,
      )
      queryClient.setQueryData<IUserProjectsResponse>(
        [EUserProjectKey.USER_PROJECTS_QUERY],
        { data: remaining },
      )
      if (useDashboardProject.getState().selectedProjectId === project.id) {
        useDashboardProject.setState({ selectedProjectId: remaining[0]?.id })
        useModulesStore.setState({ selectedModuleId: null })
        router.replace(ERoutes.DASHBOARD)
      }
      setConfirmation(null)
      setConfirmationText('')
      void queryClient.invalidateQueries({
        queryKey: [EUserProjectKey.USER_PROJECTS_QUERY],
      })
    })
  }

  const logout = () =>
    run('logout', async () => {
      const { error: logoutError } = await supabase.auth.signOut()
      if (logoutError) throw logoutError
      if (mounted.current) setSessionEnded(true)
      await queryClient.cancelQueries()
      useDashboardProject.setState({ selectedProjectId: undefined })
      useModulesStore.setState({ selectedModuleId: null })
      router.replace(ERoutes.BASE)
      router.refresh()
      onClose()
      queryClient.clear()
    })

  const switchProject = (project: IUserProjectDto) => {
    if (
      busy.current ||
      languagePending ||
      !projects.some((item) => item.id === project.id)
    )
      return
    useDashboardProject.setState({ selectedProjectId: project.id })
    useModulesStore.setState({ selectedModuleId: null })
    router.push(ERoutes.DASHBOARD)
    onClose()
  }
  const changeLanguage = (nextLocale: string) => {
    if (
      busy.current ||
      languagePending ||
      nextLocale === locale ||
      !routing.locales.some((value) => value === nextLocale)
    )
      return
    setError(null)
    startLanguageTransition(() => {
      router.replace(
        `${pathname}${window.location.search}${window.location.hash}`,
        { locale: nextLocale },
      )
    })
  }
  const close = () => {
    if (!busy.current && !languagePending) onClose()
  }
  const changeTab = (value: SettingsTab) => {
    if (busy.current || languagePending) return
    setTab(value)
    setError(null)
    setConfirmation(null)
    setConfirmationText('')
  }

  return {
    t,
    user,
    authLoading,
    tab,
    changeTab,
    name,
    updateName,
    saveName,
    logout,
    saved,
    error,
    projects,
    projectsLoading: projectsQuery.isPending,
    projectsError: projectsQuery.error?.message,
    projectsReady,
    ownedProjects,
    selectedProjectId,
    switchProject,
    requestConfirmation,
    confirmation,
    confirmationText,
    setConfirmationText: (value: string) => {
      if (!busy.current) setConfirmationText(value)
    },
    expectedConfirmation,
    confirmationMatches,
    cancelConfirmation,
    confirmAction,
    pending,
    isBusy,
    locale,
    changeLanguage,
    languagePending,
    close,
  }
}
