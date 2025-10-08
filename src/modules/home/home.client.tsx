"use client"

import { cn } from "@/shared/utils/shadcn.utils"
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
      <section className={cn('min-h-screen flex flex-col justify-center items-center px-6 py-12 text-center', styles.section)}>
        <h1 className={cn('text-[3.2rem] font-black mb-4 tracking-[1.5px]', styles.homeTitle)}>
          {t("welcome")}
        </h1>
        <button className='px-10 py-3 text-2xl font-bold text-white bg-[#2C112B] 
          rounded-full shadow-md shadow-[#FF6C401F] transition-transform duration-300 ease-in-out 
          hover:scale-105 hover:shadow-lg hover:shadow-[#FF6C402E] focus:scale-105 focus:shadow-lg focus:shadow-[#FF6C402E]' 
          onClick={handleGetStarted}>
          {t("getStarted")}
        </button>
      </section>

      <div
        ref={blackSectionRef}
        className={cn('min-h-screen flex flex-col justify-center items-center text-white', styles.blackSection,
        animate ? styles.slideDownActive : "")}
        >
        <h2 className={'text-[2.2rem] font-extrabold mb-4 tracking-wide'}>{t("blackSectionTitle")}</h2>
        <p className={'text-[1.2rem] opacity-85'}>{t("blackSectionText")}</p>
      </div>
    </>
  )
}
