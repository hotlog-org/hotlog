import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Anton App',
  description: 'Anton, your personal slave',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
