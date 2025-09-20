import HomeClient from "./home.client"
import { getHomeService } from "./home.service"

export default async function HomeComponent() {
  const service = await getHomeService()
  const translations = {
    welcome: service.t("welcome"),
    getStarted: service.t("getStarted"),
    blackSectionTitle: service.t("blackSectionTitle"),
    blackSectionText: service.t("blackSectionText"),
  }
  return <HomeClient translations={translations} />
}
