"use client"

import { useRef, useState } from "react"
import styles from "./home.module.css"

type Props = {
  translations: Record<string, string>
}

export default function HomeClient({ translations }: Props) {
  const [animate, setAnimate] = useState(false)
  const blackSectionRef = useRef<HTMLDivElement | null>(null)

  const t = (key: string) => translations[key] ?? key

  const handleGetStarted = () => {
    blackSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    setAnimate(true)
  }

  return (
    <>
      <section className={styles.section}>
        <h1 className={styles.homeTitle}>{t("welcome")}</h1>
        <button className={styles.getStartedButton} onClick={handleGetStarted}>
          {t("getStarted")}
        </button>
      </section>

      <div
        ref={blackSectionRef}
        className={`${styles.blackSection} ${animate ? styles.slideDownActive : ""}`}
      >
        <h2 className={styles.blackSectionTitle}>{t("blackSectionTitle")}</h2>
        <p className={styles.blackSectionText}>{t("blackSectionText")}</p>
      </div>
    </>
  )
}
