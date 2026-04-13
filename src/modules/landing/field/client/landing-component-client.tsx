'use client'

import dynamic from 'next/dynamic'
import { Link } from '@/i18n/navigation'
import { useState, useEffect } from 'react'
import { useAuth } from '@/shared/hooks'
import { Button } from '@/shared/ui/button'
import { Card } from '@/shared/ui/card'
import {
  Activity01Icon,
  Analytics01Icon,
  BarChartIcon,
  Settings01Icon,
  ArrowRight01Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

const Dither = dynamic(() => import('@/shared/ui/dither/dither'), {
  ssr: false,
})
const PixelBlast = dynamic(() => import('@/shared/ui/pixel-blast/pixel-blast'), {
  ssr: false,
})
const Shuffle = dynamic(() => import('@/shared/ui/shuffle/shuffle'), {
  ssr: false,
})
const SplitText = dynamic(() => import('@/shared/ui/split-text/split-text'), {
  ssr: false,
})
const Radar = dynamic(() => import('@/shared/ui/radar/radar'), {
  ssr: false,
})

interface LandingProps {
  t: (key: string) => string
}

const features = [
  {
    icon: Activity01Icon,
    titleKey: 'features.realTimeMonitoring.title',
    descKey: 'features.realTimeMonitoring.description',
    glow: 'bg-blue-400/20',
  },
  {
    icon: Analytics01Icon,
    titleKey: 'features.advancedAnalytics.title',
    descKey: 'features.advancedAnalytics.description',
    glow: 'bg-green-400/20',
  },
  {
    icon: BarChartIcon,
    titleKey: 'features.visualDashboards.title',
    descKey: 'features.visualDashboards.description',
    glow: 'bg-purple-400/20',
  },
  {
    icon: Settings01Icon,
    titleKey: 'features.easyIntegration.title',
    descKey: 'features.easyIntegration.description',
    glow: 'bg-orange-400/20',
  },
]

const steps = [
  { num: '1', titleKey: 'howItWorks.step1.title', descKey: 'howItWorks.step1.description' },
  { num: '2', titleKey: 'howItWorks.step2.title', descKey: 'howItWorks.step2.description' },
  { num: '3', titleKey: 'howItWorks.step3.title', descKey: 'howItWorks.step3.description' },
]

export default function LandingComponent({ t }: LandingProps) {
  const { isLogged } = useAuth()
  const [showContent, setShowContent] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setShowContent(true), 1200)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className='min-h-screen bg-background'>
      {/* ── Hero Section ── */}
      <section className='relative h-dvh flex items-center justify-center overflow-hidden'>
        <div className='absolute inset-0'>
          <Dither
            waveColor={[0.9, 0.5, 0.3]}
            disableAnimation={false}
            enableMouseInteraction
            mouseRadius={0.3}
            colorNum={4.9}
            waveAmplitude={0.39}
            waveFrequency={1.9}
            waveSpeed={0.05}
          />
        </div>

        <div
          className={`relative z-10 mx-auto max-w-3xl px-6 text-center transition-all duration-1000 ease-out ${
            showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <div className='mb-4'>
            <Shuffle
              text='HOTLOG'
              className='text-lg tracking-wider text-white font-bold'
              shuffleDirection='right'
              duration={0.35}
              animationMode='evenodd'
              shuffleTimes={1}
              ease='power3.out'
              stagger={0.03}
              threshold={0.1}
              triggerOnce
              triggerOnHover
              respectReducedMotion
              tag='span'
            />
          </div>

          <SplitText
            text={t('hero.title')}
            className='text-4xl md:text-6xl font-semibold tracking-tight leading-[1.05] text-white drop-shadow-lg'
            delay={50}
            duration={1.25}
            ease='power3.out'
            splitType='chars'
            from={{ opacity: 0, y: 40 }}
            to={{ opacity: 1, y: 0 }}
            threshold={0.1}
            rootMargin='-100px'
            textAlign='center'
            tag='h1'
          />

          <p className='mt-5 text-base md:text-lg text-white/70 max-w-2xl mx-auto drop-shadow'>
            {t('hero.description')}
          </p>

          <div className='mt-8 flex items-center justify-center gap-3'>
            {isLogged ? (
              <Button asChild size='sm'>
                <Link href='/dashboard'>
                  {t('dashboard.goTo') ?? 'Open Dashboard'}
                </Link>
              </Button>
            ) : (
              <>
                <Button asChild size='sm'>
                  <Link href='/sign-up'>
                    {t('cta.getStarted') ?? 'Get Started'}
                  </Link>
                </Button>
                <Button asChild size='sm' variant='outline' className='border-white/20 text-white hover:bg-white/10'>
                  <Link href='/sign-in'>
                    {t('cta.signIn') ?? 'Sign In'}
                  </Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ── Features Section ── */}
      <section className='relative py-24 px-6 overflow-hidden'>
        <div className='absolute inset-0'>
          <PixelBlast
            variant='circle'
            pixelSize={6}
            color='#e9520a'
            patternScale={4.25}
            patternDensity={1.3}
            pixelSizeJitter={0.75}
            enableRipples
            rippleSpeed={0.4}
            rippleThickness={0.12}
            rippleIntensityScale={1.5}
            liquid={false}
            speed={2.35}
            edgeFade={0.33}
            transparent
          />
        </div>

        <div className='relative z-10 mx-auto max-w-6xl'>
          <div className='text-center mb-16'>
            <h2 className='text-3xl md:text-4xl font-semibold tracking-tight mb-4 text-white drop-shadow-lg'>
              {t('features.title')}
            </h2>
            <p className='text-lg text-white/60 max-w-2xl mx-auto drop-shadow'>
              {t('features.description')}
            </p>
          </div>

          <div className='grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto'>
            {features.map((feat) => (
              <Card
                key={feat.titleKey}
                className='p-8 border bg-card/60'
              >
                <div className='flex flex-col items-start gap-6'>
                  <div className='relative p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10'>
                    <HugeiconsIcon
                      icon={feat.icon}
                      className='size-8 text-primary'
                    />
                  </div>
                  <div className='space-y-3'>
                    <h3 className='text-2xl font-bold'>
                      {t(feat.titleKey)}
                    </h3>
                    <p className='text-muted-foreground leading-relaxed'>
                      {t(feat.descKey)}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works Section ── */}
      <section className='relative py-24 px-6 overflow-hidden'>
        <div className='absolute inset-0'>
          <Radar
            speed={0.2}
            scale={0.4}
            ringCount={15}
            spokeCount={9}
            ringThickness={0.02}
            spokeThickness={0.01}
            sweepSpeed={4.6}
            sweepWidth={2}
            sweepLobes={1}
            color='#f53a06'
            backgroundColor='#000000'
            falloff={2}
            brightness={1}
            enableMouseInteraction
            mouseInfluence={0.1}
          />
        </div>

        <div className='relative z-10 mx-auto max-w-6xl'>
          <div className='text-center mb-16'>
            <h2 className='text-3xl md:text-4xl font-semibold tracking-tight mb-4 text-white drop-shadow-lg'>
              {t('howItWorks.title')}
            </h2>
            <p className='text-lg text-white/60 max-w-2xl mx-auto drop-shadow'>
              {t('howItWorks.description')}
            </p>
          </div>

          <div className='relative max-w-4xl mx-auto'>
            <div className='hidden lg:block absolute top-8 left-1/2 transform -translate-x-1/2 w-2/3 h-0.5 bg-gradient-to-r from-orange-500/0 via-orange-500/30 to-orange-500/0' />

            <div className='grid grid-cols-1 lg:grid-cols-3 gap-8'>
              {steps.map((step, i) => (
                <div key={step.num} className='text-center group'>
                  <div className='relative mb-8'>
                    <div
                      className='w-16 h-16 mx-auto rounded-full border border-orange-400/30 bg-orange-950/40 backdrop-blur-sm flex items-center justify-center text-orange-300 font-semibold text-xl mb-4 shadow-[0_0_20px_rgba(234,88,12,0.15)]'
                    >
                      {step.num}
                    </div>
                  </div>
                  <h3 className='text-xl font-semibold mb-4 text-white transition-colors group-hover:text-orange-300 drop-shadow'>
                    {t(step.titleKey)}
                  </h3>
                  <p className='text-white/60 drop-shadow'>
                    {t(step.descKey)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA Section ── */}
      <section className='py-24 px-6 flex flex-col items-center justify-center gap-6'>
        <h2 className='text-3xl font-light tracking-tight text-foreground/80 text-center'>
          {t('cta.band.title') ?? 'Start observing what matters'}
        </h2>
        <Button asChild size='sm'>
          <Link href={isLogged ? '/dashboard' : '/sign-up'}>
            {isLogged ? (t('dashboard.goTo') ?? 'Open Dashboard') : (t('cta.getStarted') ?? 'Get Started')}
          </Link>
        </Button>
      </section>
    </div>
  )
}
