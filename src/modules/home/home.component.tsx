import { getHomeService } from './home.service'

const HomeComponent = async () => {
  const service = await getHomeService()

  return <div>{service.t('welcome')}</div>
}

export default HomeComponent
