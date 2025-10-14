'use client'

import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'

export default function RazPage() {
  const [a, setA] = useState()

  useEffect(() => {
    ;(async () => {
      setInterval(() => {
        setA((prev) => {
          setA('' + Math.random().toString(36).substring(7, 12))
        })
      }, 1000)
    })()
  }, [])

  return (
    <div className='flex h-screen w-full items-center justify-center  '>
      {JSON.stringify(a) ?? (
        <div className='animate-pulse'>
          <div className='animate-bounce'>
            <Loader2 className='animate-spin' />
          </div>
        </div>
      )}
    </div>
  )
}
