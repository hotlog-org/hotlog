'use client'

import { Link } from '@/i18n/navigation'
import {
  AreaChart,
  BarChart,
  DonutChart,
  HeatmapChart,
  LineChart,
  PieChart,
} from '@/shared/charts'
import { useAuth } from '@/shared/hooks'
import { Button } from '@/shared/ui/button'
import { Card } from '@/shared/ui/card'
import {
  Activity01Icon,
  Analytics01Icon,
  BarChartIcon,
  Settings01Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  HeatmapCell,
  StatusSlice,
  TimePoint,
} from '../../landing.client.service'

interface LandingProps {
  t: (key: string) => string
  dateRange?: { from?: Date; to?: Date }
  setDateRange: (d?: { from?: Date; to?: Date }) => void
  timeSeries: TimePoint[]
  status: StatusSlice[]
  heatmap: HeatmapCell[]
}

export default function LandingComponent({
  t,
  timeSeries,
  status,
  heatmap,
}: LandingProps) {
  const { isLogged } = useAuth()

  return (
    <div className='min-h-screen relative bg-[radial-gradient(80%_60%_at_100%_0%,theme(colors.foreground)/0.06_0%,transparent_60%),radial-gradient(60%_50%_at_0%_100%,theme(colors.foreground)/0.05_0%,transparent_60%)] bg-background/30'>
      <div className='absolute top-6 right-6 flex items-center gap-2 z-10'>
        {isLogged ? (
          <Button asChild size='sm'>
            <Link href='/dashboard'>
              {t('dashboard.goTo') ?? 'Go to Dashboard'}
            </Link>
          </Button>
        ) : (
          <>
            <Button asChild size='sm' variant='ghost'>
              <Link href='/sign-in'>{t('cta.signIn') ?? 'Sign In'}</Link>
            </Button>
            <Button asChild size='sm'>
              <Link href='/sign-up'>{t('cta.getStarted') ?? 'Sign Up'}</Link>
            </Button>
          </>
        )}
      </div>

      <main className='relative'>
        <section className='mx-auto max-w-6xl px-6 pt-28 pb-20'>
          <header className='max-w-3xl mx-auto text-center'>
            <div className='mb-4 inline-flex items-center gap-3 text-lg tracking-wider text-foreground/90 font-bold'>
              <span>HOTLOG</span>
            </div>

            <h1 className='text-4xl md:text-6xl font-semibold tracking-tight leading-[1.05]'>
              {t('hero.title') ?? 'API Monitoring & Version Management'}
            </h1>

            <p className='mt-5 text-base md:text-lg text-muted-foreground max-w-2xl mx-auto'>
              {t('hero.description') ??
                'A centralized platform to track performance, visualize usage, manage versions, and keep production systems stable.'}
            </p>

            <div className='mt-8 flex items-center justify-center gap-3'>
              <Button asChild size='sm'>
                <Link href='/sign-up'>
                  {t('cta.getStarted') ?? 'Get started'}
                </Link>
              </Button>
              <Button asChild size='sm' variant='outline'>
                <Link href='/sign-in'>
                  {t('cta.signIn') ?? 'I already have an account'}
                </Link>
              </Button>
            </div>
          </header>
        </section>

        {/* Features Section */}
        <section className='py-20 px-6'>
          <div className='mx-auto max-w-6xl'>
            <div className='text-center mb-16'>
              <h2 className='text-3xl md:text-4xl font-semibold tracking-tight mb-4'>
                {t('features.title')}
              </h2>
              {/* <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                {t('features.description')}
              </p> */}
            </div>

            <div className='grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto'>
              <Card className='group p-8 border bg-background/60 hover:bg-background/90 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 hover:-translate-y-1'>
                <div className='flex flex-col items-start gap-6'>
                  <div className='relative p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 group-hover:from-primary/30 group-hover:to-primary/20 transition-all duration-300'>
                    <HugeiconsIcon
                      icon={Activity01Icon}
                      className='size-8 text-primary group-hover:scale-110 transition-transform duration-300'
                    />
                    <div className='absolute inset-0 rounded-xl bg-blue-400/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm'></div>
                  </div>
                  <div className='space-y-3'>
                    <h3 className='text-2xl font-bold group-hover:text-primary transition-colors duration-300'>
                      {t('features.realTimeMonitoring.title')}
                    </h3>
                    <p className='text-muted-foreground leading-relaxed'>
                      {t('features.realTimeMonitoring.description')}
                    </p>
                  </div>
                </div>
              </Card>

              <Card className='group p-8 border bg-background/60 hover:bg-background/90 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 hover:-translate-y-1'>
                <div className='flex flex-col items-start gap-6'>
                  <div className='relative p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 group-hover:from-primary/30 group-hover:to-primary/20 transition-all duration-300'>
                    <HugeiconsIcon
                      icon={Analytics01Icon}
                      className='size-8 text-primary group-hover:scale-110 transition-transform duration-300'
                    />
                    <div className='absolute inset-0 rounded-xl bg-green-400/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm'></div>
                  </div>
                  <div className='space-y-3'>
                    <h3 className='text-2xl font-bold group-hover:text-primary transition-colors duration-300'>
                      {t('features.advancedAnalytics.title')}
                    </h3>
                    <p className='text-muted-foreground leading-relaxed'>
                      {t('features.advancedAnalytics.description')}
                    </p>
                  </div>
                </div>
              </Card>

              <Card className='group p-8 border bg-background/60 hover:bg-background/90 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 hover:-translate-y-1'>
                <div className='flex flex-col items-start gap-6'>
                  <div className='relative p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 group-hover:from-primary/30 group-hover:to-primary/20 transition-all duration-300'>
                    <HugeiconsIcon
                      icon={BarChartIcon}
                      className='size-8 text-primary group-hover:scale-110 transition-transform duration-300'
                    />
                    <div className='absolute inset-0 rounded-xl bg-purple-400/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm'></div>
                  </div>
                  <div className='space-y-3'>
                    <h3 className='text-2xl font-bold group-hover:text-primary transition-colors duration-300'>
                      {t('features.visualDashboards.title')}
                    </h3>
                    <p className='text-muted-foreground leading-relaxed'>
                      {t('features.visualDashboards.description')}
                    </p>
                  </div>
                </div>
              </Card>

              <Card className='group p-8 border bg-background/60 hover:bg-background/90 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 hover:-translate-y-1'>
                <div className='flex flex-col items-start gap-6'>
                  <div className='relative p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 group-hover:from-primary/30 group-hover:to-primary/20 transition-all duration-300'>
                    <HugeiconsIcon
                      icon={Settings01Icon}
                      className='size-8 text-primary group-hover:scale-110 transition-transform duration-300'
                    />
                    <div className='absolute inset-0 rounded-xl bg-orange-400/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm'></div>
                  </div>
                  <div className='space-y-3'>
                    <h3 className='text-2xl font-bold group-hover:text-primary transition-colors duration-300'>
                      {t('features.easyIntegration.title')}
                    </h3>
                    <p className='text-muted-foreground leading-relaxed'>
                      {t('features.easyIntegration.description')}
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className='py-20 px-6'>
          <div className='mx-auto max-w-6xl'>
            <div className='text-center mb-16'>
              <h2 className='text-3xl md:text-4xl font-semibold tracking-tight mb-4'>
                {t('howItWorks.title')}
              </h2>
              <p className='text-lg text-muted-foreground max-w-2xl mx-auto'>
                {t('howItWorks.description')}
              </p>
            </div>

            <div className='relative max-w-4xl mx-auto'>
              {/* Connecting line for desktop */}
              <div className='hidden lg:block absolute top-8 left-1/2 transform -translate-x-1/2 w-2/3 h-0.5 bg-gradient-to-r from-primary/20 via-primary/40 to-primary/20'></div>

              <div className='grid grid-cols-1 lg:grid-cols-3 gap-8'>
                <div className='text-center group'>
                  <div className='relative mb-8'>
                    <div className='w-16 h-16 mx-auto rounded-full bg-gradient-to-t from-gray-800 to-gray-700 flex items-center justify-center text-white font-light text-xl mb-4 shadow-lg transition-all duration-500 group-hover:scale-125 group-hover:shadow-2xl group-hover:shadow-gray-600/60 group-hover:rotate-6 group-hover:brightness-110 cursor-pointer'>
                      1
                    </div>
                  </div>
                  <h3 className='text-xl font-semibold mb-4 transition-colors group-hover:text-primary'>
                    {t('howItWorks.step1.title')}
                  </h3>
                  <p className='text-muted-foreground'>
                    {t('howItWorks.step1.description')}
                  </p>
                </div>

                <div className='text-center group'>
                  <div className='relative mb-8'>
                    <div className='w-16 h-16 mx-auto rounded-full bg-gradient-to-t from-gray-700 to-gray-600 flex items-center justify-center text-white font-light text-xl mb-4 shadow-lg transition-all duration-500 group-hover:scale-125 group-hover:shadow-2xl group-hover:shadow-gray-500/60 group-hover:-rotate-6 group-hover:brightness-110 cursor-pointer'>
                      2
                    </div>
                  </div>
                  <h3 className='text-xl font-semibold mb-4 transition-colors group-hover:text-primary'>
                    {t('howItWorks.step2.title')}
                  </h3>
                  <p className='text-muted-foreground'>
                    {t('howItWorks.step2.description')}
                  </p>
                </div>

                <div className='text-center group'>
                  <div className='relative mb-8'>
                    <div className='w-16 h-16 mx-auto rounded-full bg-gradient-to-t from-gray-600 to-gray-500 flex items-center justify-center text-white font-light text-xl mb-4 shadow-lg transition-all duration-500 group-hover:scale-125 group-hover:shadow-2xl group-hover:shadow-gray-400/60 group-hover:rotate-12 group-hover:brightness-110 cursor-pointer'>
                      3
                    </div>
                  </div>
                  <h3 className='text-xl font-semibold mb-4 transition-colors group-hover:text-primary'>
                    {t('howItWorks.step3.title')}
                  </h3>
                  <p className='text-muted-foreground'>
                    {t('howItWorks.step3.description')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Charts/Visualizations Section */}
        <section className='py-20 px-6'>
          <div className='mx-auto max-w-6xl'>
            <div className='text-center mb-16'>
              <h2 className='text-3xl md:text-4xl font-semibold tracking-tight mb-4'>
                {t('visualizations.title')}
              </h2>
              <p className='text-lg text-muted-foreground max-w-2xl mx-auto'>
                {t('visualizations.description')}
              </p>
            </div>

            <div className='grid grid-cols-2 sm:grid-cols-3 gap-5 max-w-4xl mx-auto'>
              <Card className='rounded-md border p-3 bg-background/70'>
                <LineChart
                  data={timeSeries}
                  height={260}
                  className='[&_*]:!select-none'
                />
              </Card>

              <Card className='rounded-md border p-3 bg-background/70'>
                <BarChart
                  data={status}
                  isTimeSeries={false}
                  height={260}
                  className='[&_*]:!select-none'
                />
              </Card>

              <Card className='rounded-md border p-3 bg-background/70'>
                <DonutChart
                  data={status}
                  height={260}
                  className='[&_*]:!select-none'
                />
              </Card>

              <Card className='rounded-md border p-3 bg-background/70 col-span-2 sm:col-span-1'>
                <HeatmapChart
                  data={heatmap}
                  height={260}
                  className='[&_*]:!select-none'
                />
              </Card>

              <Card className='rounded-md border p-3 bg-background/70'>
                <AreaChart
                  data={timeSeries}
                  height={260}
                  className='[&_*]:!select-none'
                />
              </Card>

              <Card className='rounded-md border p-3 bg-background/70'>
                <PieChart
                  data={status}
                  height={260}
                  className='[&_*]:!select-none'
                />
              </Card>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className='py-20 px-6'>
          <div className='mx-auto max-w-6xl'>
            <div className='text-center mb-16'>
              <h2 className='text-3xl md:text-4xl font-semibold tracking-tight mb-4'>
                {t('stats.title')}
              </h2>
              <p className='text-lg text-muted-foreground max-w-2xl mx-auto'>
                {t('stats.description')}
              </p>
            </div>

            <div className='grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto'>
              <div className='text-center'>
                <div className='text-3xl md:text-4xl font-bold text-primary mb-2'>
                  99.9%
                </div>
                <div className='text-sm text-muted-foreground'>
                  {t('stats.uptime')}
                </div>
              </div>
              <div className='text-center'>
                <div className='text-3xl md:text-4xl font-bold text-primary mb-2'>
                  ~~M+
                </div>
                <div className='text-sm text-muted-foreground'>
                  {t('stats.requestsMonitored')}
                </div>
              </div>
              <div className='text-center'>
                <div className='text-3xl md:text-4xl font-bold text-primary mb-2'>
                  50ms
                </div>
                <div className='text-sm text-muted-foreground'>
                  {t('stats.averageResponse')}
                </div>
              </div>
              <div className='text-center'>
                <div className='text-3xl md:text-4xl font-bold text-primary mb-2'>
                  24/7
                </div>
                <div className='text-sm text-muted-foreground'>
                  {t('stats.monitoring')}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className='py-24 px-6'>
          <div className='mx-auto max-w-4xl'>
            {/* Minimal decorative elements */}
            <div className='relative'>
              <div className='absolute -top-4 left-1/2 transform -translate-x-1/2 w-240 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent'></div>
            </div>

            <div className='text-center py-1 px-8 relative'>
              {/* Delicate typography */}
              <h2 className='text-3xl md:text-3xl font-light tracking-tight mb-6 text-foreground/80 leading-tight'>
                {t('cta.band.title') ?? 'Start observing what matters'}
              </h2>

              {/* Minimal buttons */}
              <div className='flex flex-col sm:flex-row items-center justify-center gap-4'>
                <Button
                  asChild
                  variant='ghost'
                  className='px-8 py-3 text-sm font-medium hover:bg-primary/5 transition-all duration-300 border border-primary/10 hover:border-primary/20 group'
                >
                  <Link href='/sign-up' className='flex items-center gap-2'>
                    <span>{t('cta.getStarted') ?? 'Get Started'}</span>
                    <span className='text-xs opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all duration-300'>
                      →
                    </span>
                  </Link>
                </Button>

                <Button
                  asChild
                  variant='ghost'
                  className='px-8 py-3 text-sm font-medium hover:bg-primary/5 transition-all duration-300 group'
                >
                  <Link href='/sign-in' className='flex items-center gap-2'>
                    <span>{t('cta.signIn') ?? 'Sign In'}</span>
                    <span className='text-xs opacity-30 group-hover:opacity-60 group-hover:translate-x-0.5 transition-all duration-300'>
                      →
                    </span>
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
