import LandingClient from '@/modules/landing/landing.client'
import { getLandingService } from '@/modules/landing/landing.service'

export default async function Page() {
  const service = await getLandingService()

  const translations = {
    'hero.title': service.t('hero.title'),
    'hero.description': service.t('hero.description'),
    'features.title': service.t('features.title'),
    'features.description': service.t('features.description'),
    'features.realTimeMonitoring.title': service.t(
      'features.realTimeMonitoring.title',
    ),
    'features.realTimeMonitoring.description': service.t(
      'features.realTimeMonitoring.description',
    ),
    'features.advancedAnalytics.title': service.t(
      'features.advancedAnalytics.title',
    ),
    'features.advancedAnalytics.description': service.t(
      'features.advancedAnalytics.description',
    ),
    'features.visualDashboards.title': service.t(
      'features.visualDashboards.title',
    ),
    'features.visualDashboards.description': service.t(
      'features.visualDashboards.description',
    ),
    'features.easyIntegration.title': service.t(
      'features.easyIntegration.title',
    ),
    'features.easyIntegration.description': service.t(
      'features.easyIntegration.description',
    ),
    'howItWorks.title': service.t('howItWorks.title'),
    'howItWorks.description': service.t('howItWorks.description'),
    'howItWorks.step1.title': service.t('howItWorks.step1.title'),
    'howItWorks.step1.description': service.t('howItWorks.step1.description'),
    'howItWorks.step2.title': service.t('howItWorks.step2.title'),
    'howItWorks.step2.description': service.t('howItWorks.step2.description'),
    'howItWorks.step3.title': service.t('howItWorks.step3.title'),
    'howItWorks.step3.description': service.t('howItWorks.step3.description'),
    'visualizations.title': service.t('visualizations.title'),
    'visualizations.description': service.t('visualizations.description'),
    'stats.title': service.t('stats.title'),
    'stats.description': service.t('stats.description'),
    'stats.uptime': service.t('stats.uptime'),
    'stats.requestsMonitored': service.t('stats.requestsMonitored'),
    'stats.averageResponse': service.t('stats.averageResponse'),
    'stats.monitoring': service.t('stats.monitoring'),
    'dashboard.goTo': service.t('dashboard.goTo'),
    'cta.getStarted': service.t('cta.getStarted'),
    'cta.signIn': service.t('cta.signIn'),
    'cta.band.title': service.t('cta.band.title'),
    'cta.band.desc': service.t('cta.band.desc'),
  }

  return <LandingClient translations={translations} />
}
