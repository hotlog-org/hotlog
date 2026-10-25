'use client'

import { useId } from 'react'
import { Loading03Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Skeleton } from '@/shared/ui/skeleton'
import { Badge } from '@/shared/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { cn } from '@/shared/utils/shadcn.utils'
import { useSettingsService, type SettingsTab } from './settings.service'

const tabs: SettingsTab[] = ['account', 'language', 'projects']
const languages = [
  { value: 'en', label: 'English' },
  { value: 'ru', label: 'Русский' },
  { value: 'am', label: 'Հայերեն' },
]

function Spinner() {
  return (
    <HugeiconsIcon
      icon={Loading03Icon}
      className='size-4 animate-spin'
      aria-hidden='true'
    />
  )
}

export function SettingsDialog({
  initialTab = 'account',
  onClose,
  onCloseFocus,
}: {
  initialTab?: SettingsTab
  onClose: () => void
  onCloseFocus?: () => void
}) {
  const service = useSettingsService(initialTab, onClose)
  const id = useId()
  const t = service.t
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) service.close()
      }}
    >
      <DialogContent
        className='flex max-h-[85dvh] flex-col gap-5 overflow-hidden sm:max-w-3xl'
        onCloseAutoFocus={(event) => {
          if (onCloseFocus) {
            event.preventDefault()
            onCloseFocus()
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>
        <div className='grid min-h-0 gap-5 md:grid-cols-[140px_1fr]'>
          <div
            role='tablist'
            aria-label={t('title')}
            className='flex gap-1 md:flex-col'
            onKeyDown={(event) => {
              if (
                service.isBusy ||
                ![
                  'ArrowRight',
                  'ArrowLeft',
                  'ArrowUp',
                  'ArrowDown',
                  'Home',
                  'End',
                ].includes(event.key)
              )
                return
              event.preventDefault()
              const index = tabs.indexOf(service.tab)
              const next =
                event.key === 'Home'
                  ? 0
                  : event.key === 'End'
                    ? tabs.length - 1
                    : (index +
                        (['ArrowLeft', 'ArrowUp'].includes(event.key)
                          ? -1
                          : 1) +
                        tabs.length) %
                      tabs.length
              service.changeTab(tabs[next])
              event.currentTarget
                .querySelectorAll<HTMLButtonElement>('[role="tab"]')
                [next]?.focus()
            }}
          >
            {tabs.map((tab) => (
              <Button
                key={tab}
                role='tab'
                id={`${id}-${tab}`}
                aria-controls={`${id}-panel-${tab}`}
                aria-selected={service.tab === tab}
                tabIndex={service.tab === tab ? 0 : -1}
                variant={service.tab === tab ? 'secondary' : 'ghost'}
                disabled={service.isBusy}
                className='flex-1 justify-start md:flex-none'
                onClick={() => service.changeTab(tab)}
              >
                {t(`tabs.${tab}`)}
              </Button>
            ))}
          </div>
          <div
            role='tabpanel'
            id={`${id}-panel-${service.tab}`}
            aria-labelledby={`${id}-${service.tab}`}
            className='min-h-0 min-w-0 space-y-5 overflow-y-auto px-1 pb-1'
            tabIndex={0}
          >
            {service.error && (
              <p role='alert' className='text-sm text-destructive'>
                {service.error}
              </p>
            )}
            {service.tab === 'account' &&
              (service.authLoading ? (
                <Skeleton className='h-40 w-full' />
              ) : (
                <>
                  <form
                    className='space-y-4'
                    onSubmit={(event) => {
                      event.preventDefault()
                      void service.saveName()
                    }}
                  >
                    <h2 className='font-semibold'>{t('profile')}</h2>
                    <label className='block space-y-2 text-sm'>
                      <span>{t('displayName')}</span>
                      <Input
                        value={service.name}
                        onChange={(event) =>
                          service.updateName(event.target.value)
                        }
                        autoComplete='nickname'
                        maxLength={80}
                        disabled={service.isBusy}
                      />
                    </label>
                    <div className='space-y-1 text-sm'>
                      <p className='text-muted-foreground'>{t('email')}</p>
                      <p className='break-all'>{service.user?.email}</p>
                    </div>
                    <Button
                      type='submit'
                      disabled={
                        service.isBusy ||
                        !service.name.trim() ||
                        service.name.trim() === service.user?.name
                      }
                      aria-busy={service.pending === 'name'}
                    >
                      {service.pending === 'name' && <Spinner />}
                      {t(service.pending === 'name' ? 'saving' : 'save')}
                    </Button>
                    {service.saved && (
                      <p
                        role='status'
                        className='text-sm text-muted-foreground'
                      >
                        {t('nameSaved')}
                      </p>
                    )}
                  </form>
                  <div className='border-t pt-4'>
                    <Button
                      variant='outline'
                      disabled={service.isBusy}
                      aria-busy={service.pending === 'logout'}
                      onClick={() => void service.logout()}
                    >
                      {service.pending === 'logout' && <Spinner />}
                      {t(
                        service.pending === 'logout' ? 'loggingOut' : 'logout',
                      )}
                    </Button>
                  </div>
                  <section className='space-y-3 rounded-lg border border-destructive/30 p-4'>
                    <h2 className='font-semibold text-destructive'>
                      {t('deleteAccount')}
                    </h2>
                    <p className='text-sm text-muted-foreground'>
                      {t('deleteAccountDescription')}
                    </p>
                    {service.ownedProjects.length > 0 && (
                      <p className='text-sm'>
                        {t('ownedProjectsBlock', {
                          count: service.ownedProjects.length,
                        })}{' '}
                        <button
                          className='underline underline-offset-4'
                          disabled={service.isBusy}
                          onClick={() => service.changeTab('projects')}
                        >
                          {t('manageProjects')}
                        </button>
                      </p>
                    )}
                    {service.projectsError ? (
                      <p role='alert' className='text-sm text-destructive'>
                        {service.projectsError}
                      </p>
                    ) : !service.projectsReady ? (
                      <p className='text-sm text-muted-foreground'>
                        {t('ownershipChecking')}
                      </p>
                    ) : null}
                    <Button
                      variant='destructive'
                      disabled={
                        service.isBusy ||
                        !service.projectsReady ||
                        service.ownedProjects.length > 0 ||
                        !service.user?.email
                      }
                      onClick={() =>
                        service.requestConfirmation({ kind: 'account' })
                      }
                    >
                      {t('deleteAccount')}
                    </Button>
                  </section>
                </>
              ))}
            {service.tab === 'language' && (
              <section className='space-y-4'>
                <h2 className='font-semibold'>{t('language')}</h2>
                <p className='text-sm text-muted-foreground'>
                  {t('languageDescription')}
                </p>
                <label className='block space-y-2 text-sm'>
                  <span>{t('language')}</span>
                  <select
                    className='h-10 w-full rounded-md border bg-background px-3'
                    value={service.locale}
                    disabled={service.isBusy}
                    onChange={(event) =>
                      service.changeLanguage(event.target.value)
                    }
                  >
                    {languages.map((language) => (
                      <option key={language.value} value={language.value}>
                        {language.label}
                      </option>
                    ))}
                  </select>
                </label>
                {service.languagePending && (
                  <p role='status' className='flex items-center gap-2 text-sm'>
                    <Spinner />
                    {t('changingLanguage')}
                  </p>
                )}
              </section>
            )}
            {service.tab === 'projects' && (
              <section className='space-y-4'>
                <h2 className='font-semibold'>{t('yourProjects')}</h2>
                <p className='text-sm text-muted-foreground'>
                  {t('projectsDescription')}
                </p>
                {service.projectsError && (
                  <p role='alert' className='text-sm text-destructive'>
                    {service.projectsError}
                  </p>
                )}
                {service.projectsLoading ? (
                  <div
                    role='status'
                    aria-label={t('loadingProjects')}
                    className='space-y-3'
                  >
                    {[0, 1, 2].map((index) => (
                      <Skeleton key={index} className='h-24 w-full' />
                    ))}
                  </div>
                ) : service.projects.length === 0 && !service.projectsError ? (
                  <p className='text-sm text-muted-foreground'>
                    {t('noProjects')}
                  </p>
                ) : (
                  service.projects.map((project) => (
                    <div
                      key={project.id}
                      className={cn(
                        'space-y-3 rounded-lg border p-4',
                        service.selectedProjectId === project.id &&
                          'border-primary/40',
                      )}
                    >
                      <div className='flex flex-wrap items-center gap-2'>
                        <h3 className='min-w-0 break-all font-medium'>
                          {project.name}
                        </h3>
                        <Badge variant='secondary'>
                          {t(project.isCreator ? 'owner' : 'member')}
                        </Badge>
                        {service.selectedProjectId === project.id && (
                          <Badge variant='outline'>{t('current')}</Badge>
                        )}
                      </div>
                      <div className='flex flex-wrap gap-2'>
                        <Button
                          size='sm'
                          variant='outline'
                          disabled={service.isBusy}
                          onClick={() => service.switchProject(project)}
                        >
                          {t('openProject')}
                        </Button>
                        {!project.isCreator && (
                          <Button
                            size='sm'
                            variant='outline'
                            disabled={service.isBusy || !service.projectsReady}
                            onClick={() =>
                              service.requestConfirmation({
                                kind: 'leave',
                                project,
                              })
                            }
                          >
                            {t('leaveProject')}
                          </Button>
                        )}
                        {(project.canDelete ?? project.isCreator) && (
                          <Button
                            size='sm'
                            variant='outline'
                            className='text-destructive hover:text-destructive'
                            disabled={service.isBusy || !service.projectsReady}
                            onClick={() =>
                              service.requestConfirmation({
                                kind: 'delete',
                                project,
                              })
                            }
                          >
                            {t('deleteProject')}
                          </Button>
                        )}
                      </div>
                      {project.isCreator && (
                        <p className='text-xs text-muted-foreground'>
                          {t('ownerCannotLeave')}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </section>
            )}
            {service.confirmation && (
              <form
                key={`${service.confirmation.kind}-${service.confirmation.kind === 'account' ? 'account' : service.confirmation.project.id}`}
                className='space-y-3 rounded-lg border border-destructive/40 p-4'
                onSubmit={(event) => {
                  event.preventDefault()
                  void service.confirmAction()
                }}
              >
                <h3 className='font-medium'>
                  {t(
                    service.confirmation.kind === 'account'
                      ? 'deleteAccount'
                      : service.confirmation.kind === 'delete'
                        ? 'deleteProject'
                        : 'leaveProject',
                  )}
                </h3>
                <p className='text-sm text-muted-foreground'>
                  {t(
                    service.confirmation.kind === 'account'
                      ? 'accountConfirmDescription'
                      : service.confirmation.kind === 'delete'
                        ? 'projectDeleteDescription'
                        : 'projectLeaveDescription',
                  )}
                </p>
                <label className='block space-y-2 text-sm'>
                  <span>
                    {t('typeToConfirm', {
                      value: service.expectedConfirmation ?? '',
                    })}
                  </span>
                  <Input
                    autoFocus
                    autoComplete='off'
                    value={service.confirmationText}
                    disabled={service.isBusy}
                    onChange={(event) =>
                      service.setConfirmationText(event.target.value)
                    }
                  />
                </label>
                <div className='flex gap-2'>
                  <Button
                    type='button'
                    variant='outline'
                    disabled={service.isBusy}
                    onClick={service.cancelConfirmation}
                  >
                    {t('cancel')}
                  </Button>
                  <Button
                    type='submit'
                    variant='destructive'
                    disabled={
                      service.isBusy ||
                      !service.confirmationMatches ||
                      !service.projectsReady
                    }
                    aria-busy={Boolean(service.pending)}
                  >
                    {service.pending && <Spinner />}
                    {t(service.pending ? 'working' : 'confirm')}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
