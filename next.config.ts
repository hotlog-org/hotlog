import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

// Disable Lightning CSS native binding to avoid missing binary on some builds
// Next falls back to PostCSS when optimizeCss is false.
const nextConfig: NextConfig = {
  experimental: {
    optimizeCss: false,
  },
}

const withNextIntl = createNextIntlPlugin()
export default withNextIntl(nextConfig)
