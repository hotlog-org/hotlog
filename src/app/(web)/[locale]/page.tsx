'use client'

import { Link, useRouter } from '@/i18n/navigation'
import { authClient } from '@/lib/better-auth'
import AuthHeader from '@/modules/auth-shared/auth-header'
import { AreaChart, BarChart, DonutChart, HeatmapChart, LineChart, PieChart, type BaseChartData, type HeatmapData, type TimeSeriesData } from '@/shared/charts'
import { useAuth } from '@/shared/hooks'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader } from '@/shared/ui/card'
import { cn } from '@/shared/utils/shadcn.utils'
import { Activity, BarChart3, Loader2, LogIn, LogOut, ShieldCheck, UserCheck } from 'lucide-react'
import { useState } from 'react'

export default function RootPage() {
  const { isLogged, user, isLoading } = useAuth()
  const [showDevInfo, setShowDevInfo] = useState(false)
  const router = useRouter()

  const handleSignOut = async () => {
    await authClient.signOut()
    router.push('/')
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-16 h-16 text-primary animate-spin" />
          <p className="text-muted-foreground text-lg">Loading your profile...</p>
        </div>
      </div>
    )
  }

  // Marketing page for visitors (not logged in)
  if (!isLogged) {
    return (
      <div className="min-h-screen relative bg-[radial-gradient(80%_60%_at_100%_0%,hsl(var(--foreground)/0.06)_0%,transparent_60%),radial-gradient(60%_50%_at_0%_100%,hsl(var(--foreground)/0.05)_0%,transparent_60%)]">
        <AuthHeader />
        {/* Top-right auth actions */}
        <div className="absolute top-4 right-4 flex items-center gap-2">
          <Button asChild size="sm" variant="ghost">
            <Link href="/sign-in">Sign In</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/sign-up">Sign Up</Link>
          </Button>
        </div>

        {/* Subtle grid overlay */}
        <div className="pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]">
          <div className="h-full w-full bg-[linear-gradient(to_right,hsl(var(--foreground)/0.04)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--foreground)/0.04)_1px,transparent_1px)] bg-[size:32px_32px]" />
        </div>

        {/* Hero */}
        <div className="relative mx-auto max-w-5xl px-6 pt-28 pb-16 sm:pt-36">
          <div className="max-w-3xl mx-auto text-center">
            <div className="mb-3 inline-flex items-center gap-2 text-sm tracking-widest text-foreground/80">
              <span className="font-semibold">HOTLOG</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-semibold tracking-tight leading-[1.1]">
              API Monitoring & Version Management
            </h1>
            <p className="mt-5 text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
              A centralized platform to track performance, visualize usage, manage versions, and keep production systems stable. Understand latency, availability, errors, traffic patterns, and client behavior in one place.
            </p>
            <div className="mt-8 flex items-center justify-center gap-3">
              <Button asChild size="sm">
                <Link href="/sign-up">Get started</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href="/sign-in">I already have an account</Link>
              </Button>
            </div>
          </div>

          {/* Hero visual (real charts, colorful) */}
          <div className="mt-14 grid grid-cols-2 sm:grid-cols-3 gap-5 max-w-4xl mx-auto">
            {(() => {
              const ts: TimeSeriesData[] = Array.from({ length: 12 }).map((_, i) => ({
                date: new Date(Date.now() - (11 - i) * 24 * 60 * 60 * 1000),
                value: 120 + Math.round(Math.sin(i / 2) * 40) + i * 2,
              }))
              const status: BaseChartData[] = [
                { name: '2xx', value: 72 },
                { name: '4xx', value: 18 },
                { name: '5xx', value: 10 },
              ]
              const hm: HeatmapData[] = Array.from({ length: 7 * 6 }).map((_, idx) => ({
                x: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][idx % 7],
                y: ['00:00','04:00','08:00','12:00','16:00','20:00'][Math.floor(idx / 7)],
                value: 10 + ((idx * 7) % 50),
              }))
              return (
                <>
                  <div className="rounded-md border border-border/60 bg-background/70 backdrop-blur-sm p-3">
                    <LineChart data={ts} height={280} className="[&_*]:!select-none" />
                  </div>
                  <div className="rounded-md border border-border/60 bg-background/70 backdrop-blur-sm p-3">
                    <BarChart data={status} isTimeSeries={false} height={280} className="[&_*]:!select-none" />
                  </div>
                  <div className="rounded-md border border-border/60 bg-background/70 backdrop-blur-sm p-3">
                    <DonutChart data={status} height={280} className="[&_*]:!select-none" />
                  </div>
                  <div className="rounded-md border border-border/60 bg-background/70 backdrop-blur-sm p-3 col-span-2 sm:col-span-1">
                    <HeatmapChart data={hm} height={280} className="[&_*]:!select-none" />
                  </div>
                  <div className="rounded-md border border-border/60 bg-background/70 backdrop-blur-sm p-3">
                    <AreaChart data={ts} height={280} className="[&_*]:!select-none" />
                  </div>
                  <div className="rounded-md border border-border/60 bg-background/70 backdrop-blur-sm p-3">
                    <PieChart data={status} height={280} className="[&_*]:!select-none" />
                  </div>
                </>
              )
            })()}
          </div>
        </div>

        {/* Features */}
        <div className="relative mx-auto max-w-5xl px-6 pb-24">
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="border border-border/60 bg-background/70 backdrop-blur-sm hover:shadow-md hover:ring-1 hover:ring-foreground/10 transition-all">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-foreground/80" />
                  <h3 className="text-lg font-medium">Monitor external APIs</h3>
                </div>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Track latency, throughput, and status codes from the services you depend on.
              </CardContent>
            </Card>
            <Card className="border border-border/60 bg-background/70 backdrop-blur-sm hover:shadow-md hover:ring-1 hover:ring-foreground/10 transition-all">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-foreground/80" />
                  <h3 className="text-lg font-medium">Visualize traffic</h3>
                </div>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                See requests by day with clean graphs that make patterns obvious at a glance.
              </CardContent>
            </Card>
            <Card className="border border-border/60 bg-background/70 backdrop-blur-sm hover:shadow-md hover:ring-1 hover:ring-foreground/10 transition-all">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-foreground/80" />
                  <h3 className="text-lg font-medium">Surface user errors</h3>
                </div>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Identify failing endpoints and error spikes before they impact your customers.
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Built for teams */}
        <div className="relative mx-auto max-w-5xl px-6 pb-16">
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="border border-border/60 bg-background/70 backdrop-blur-sm hover:shadow-md hover:ring-1 hover:ring-foreground/10 transition-all">
              <CardHeader className="pb-3"><h3 className="text-lg font-medium">Built for observability</h3></CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Track latency and uptime in real time, compare versions across releases, and see how clients interact with each endpoint. Configure alerts for high latency, error spikes, or availability drops.
              </CardContent>
            </Card>
            <Card className="border border-border/60 bg-background/70 backdrop-blur-sm hover:shadow-md hover:ring-1 hover:ring-foreground/10 transition-all">
              <CardHeader className="pb-3"><h3 className="text-lg font-medium">Version lifecycle</h3></CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Release new versions with confidence, deprecate old ones gradually, and guide users with migration insights. Automatically detect breaking changes and maintain a stable API over time.
              </CardContent>
            </Card>
          </div>
        </div>

        {/* CTA band */}
        <div className="relative mx-auto max-w-5xl px-6 pb-20">
          <div className="rounded-xl border border-border/60 bg-[linear-gradient(to_right,hsl(var(--foreground)/0.035),transparent),linear-gradient(to_left,hsl(var(--foreground)/0.035),transparent)] p-6 md:p-8 text-center">
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">Start observing what matters</h2>
            <p className="mt-2 text-sm md:text-base text-muted-foreground">See requests, spot errors, and ship fixes faster with confidence.</p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <Button asChild size="sm"><Link href="/sign-up">Create account</Link></Button>
              <Button asChild size="sm" variant="outline"><Link href="/sign-in">Sign in</Link></Button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative mx-auto max-w-5xl px-6 pb-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rotate-90" aria-hidden>
                <svg width="12" height="12" viewBox="0 0 24 24"><path d="M12 3L2.5 20h19L12 3z" fill="none" stroke="currentColor" strokeWidth="1.2"/></svg>
              </span>
              <span>© {new Date().getFullYear()} Hotlog</span>
            </div>
            <div className="flex items-center gap-4">
              <a className="hover:text-foreground" href="#">Docs</a>
              <a className="hover:text-foreground" href="#">Status</a>
              <a className="hover:text-foreground" href="#">Privacy</a>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Profile area for logged-in users
  return (
    <div className="min-h-screen flex items-center justify-center p-6 md:p-8 bg-background">
      <div className="w-full max-w-xl space-y-6">
        {/* Profile Card */}
        <Card className="relative overflow-hidden border shadow-sm">
          {/* Accent gradient overlay */}
          <div className="absolute inset-0 pointer-events-none" />
          
          <CardHeader className="relative pb-6">
            {/* Avatar */}
            <div className="flex justify-center mb-4">
              <div className="relative">
                <div className="w-24 h-24 rounded-full overflow-hidden border bg-muted/30">
                  <img
                    src="/static/default_avatar.png"
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className={cn(
                  "absolute -bottom-2 -right-2 rounded-full p-1.5 shadow-sm",
                  isLogged ? "bg-green-500" : "bg-destructive"
                )}>
                  <UserCheck className="w-4 h-4 text-white" />
                </div>
              </div>
            </div>

            {/* Name & Email */}
            <div className="text-center space-y-1.5">
              <h1 className="text-2xl md:text-3xl font-semibold text-foreground tracking-tight">
                {user?.name || 'Guest User'}
              </h1>
              <p className="text-sm text-muted-foreground">
                {user?.email || 'No email available'}
              </p>
            </div>
          </CardHeader>

          <CardContent className="relative space-y-5">
            {/* Status Badge */}
            <div className="flex justify-center">
              <div className={cn(
                "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs",
                isLogged 
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" 
                  : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
              )}>
                {isLogged ? (
                  <>
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Active Session</span>
                  </>
                ) : (
                  <>
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Not Authenticated</span>
                  </>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {isLogged && (
                <Button
                  asChild
                  size="sm"
                  variant="default"
                >
                  <Link href="/dashboard">
                    Dashboard
                  </Link>
                </Button>
              )}
              {!isLogged && (
                <Button
                  asChild
                  size="sm"
                  variant="secondary"
                >
                  <Link href="/sign-in">
                    Sign In
                  </Link>
                </Button>
              )}
              {isLogged && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleSignOut}
                >
                  Sign Out
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Developer Info - Collapsible */}
        <div className="flex justify-center">
          <button
            onClick={() => setShowDevInfo(!showDevInfo)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-md hover:bg-muted/40"
          >
            {showDevInfo ? 'Hide' : 'Show'} Developer Info
          </button>
        </div>

        {showDevInfo && (
          <Card className="border-dashed">
            <CardHeader>
              <p className="text-sm font-medium">User Object (Dev)</p>
            </CardHeader>
            <CardContent>
              <pre className="text-xs text-muted-foreground whitespace-pre-wrap break-words overflow-x-auto bg-muted/40 p-3 rounded-md max-h-80 overflow-y-auto">
                {JSON.stringify(user, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
