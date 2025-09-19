'use client'

import { QueryClientProvider } from '@tanstack/react-query'
import { FC, ReactNode } from 'react'
import { queryClient } from './api.service'

interface IProps {
  children: ReactNode
}

const ApiProvider: FC<Readonly<IProps>> = (props) => {
  const { children } = props

  const getQueryClient = queryClient()

  return (
    <QueryClientProvider client={getQueryClient}>
      {children}
    </QueryClientProvider>
  )
}

export default ApiProvider
