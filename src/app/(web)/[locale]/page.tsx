'use client'

import { Link } from '@/i18n/navigation'
import { useAuth } from '@/shared/hooks'
import { Loader2 } from 'lucide-react'

export default function RootPage() {
  const { isLogged, user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-neutral-950">
        <Loader2 className="w-10 h-10 text-red-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-neutral-950 p-6">
      {/* Profile Card */}
      <div className="relative w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl p-8">
        {/* Profile Image */}
        <div className="absolute top-5 right-5 w-16 h-16 rounded-full overflow-hidden border border-red-500">
          <img
            src="/static/default_avatar.png"
            alt="Profile"
            className="w-full h-full object-cover"
          />
        </div>

        {/* Name & Email */}
        <div className="text-center mt-4">
          <h1 className="text-2xl font-semibold text-white">
            {user?.name || 'Guest User'}
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            {user?.email || 'No email available'}
          </p>
        </div>

        {/* Status */}
        <p className="text-center mt-5 text-sm text-gray-400">
          Status:{' '}
          <span
            className={`font-medium ${
              isLogged ? 'text-green-400' : 'text-red-400'
            }`}
          >
            {isLogged ? 'Logged In' : 'Logged Out'}
          </span>
        </p>

        {/* Dashboard Button */}
        <div className="mt-7 flex justify-center">
          <Link
            href="/dashboard"
            className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>

      {/* Developer JSON Area */}
      <div className="mt-8 bg-neutral-900 border border-neutral-800 text-xs text-gray-400 p-4 rounded-lg w-115 max-w-2xl overflow-x-auto">
        <p className="text-red-500 font-semibold mb-2">User Object (Dev):</p>
        <pre className="whitespace-pre-wrap break-words">
          {JSON.stringify(user, null, 2)}
        </pre>
      </div>
    </div>
  )
}
