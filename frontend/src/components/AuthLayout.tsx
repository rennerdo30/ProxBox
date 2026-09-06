import { ReactNode } from 'react'
import { APP_NAME, APP_TAGLINE } from '../lib/constants'
import ThemeToggle from './ThemeToggle'

interface AuthLayoutProps {
  title: string
  description: string
  children: ReactNode
  /** Secondary action shown under the card, e.g. a link to the other form. */
  footer: ReactNode
}

/** Shared shell for the unauthenticated pages (login, register). */
export default function AuthLayout({ title, description, children, footer }: AuthLayoutProps) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-4 py-10 sm:px-6">
      {/* Decorative wash behind the card. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-primary/10 to-transparent"
      />

      <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
        <ThemeToggle />
      </div>

      <main className="relative w-full max-w-md">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <img src="/logo.svg" alt={APP_NAME} className="h-12 w-12 rounded-xl shadow-sm" />
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>

        <div className="card p-5 shadow-md sm:p-6">{children}</div>

        <div className="mt-6 space-y-4 text-center text-sm">
          <div>{footer}</div>
          <p className="text-xs text-muted-foreground">{APP_TAGLINE}</p>
        </div>
      </main>
    </div>
  )
}
