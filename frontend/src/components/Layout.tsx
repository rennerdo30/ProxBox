import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { FiGrid, FiLogOut, FiServer, FiSettings } from 'react-icons/fi'
import { useAuth } from '../hooks/useAuth'
import { APP_NAME, APP_TAGLINE, MAIN_CONTENT_ID } from '../lib/constants'
import { cn } from '../lib/utils'
import ThemeToggle from './ThemeToggle'

interface NavItem {
  to: string
  label: string
  icon: typeof FiGrid
  adminOnly?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: FiGrid },
  { to: '/vms', label: 'Virtual Machines', icon: FiServer },
  { to: '/admin', label: 'Admin', icon: FiSettings, adminOnly: true },
]

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const navItems = NAV_ITEMS.filter((item) => !item.adminOnly || user?.role === 'admin')
  const initial = (user?.first_name?.[0] ?? user?.username?.[0] ?? '?').toUpperCase()

  return (
    <div className="flex min-h-screen flex-col">
      <a href={`#${MAIN_CONTENT_ID}`} className="skip-link">
        Skip to main content
      </a>

      <header className="sticky top-0 z-20 border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="container flex flex-wrap items-center gap-x-6 gap-y-2 py-2.5 md:h-16 md:flex-nowrap md:py-0">
          <NavLink
            to="/"
            className="order-1 flex items-center gap-2 rounded-md text-lg font-semibold tracking-tight"
          >
            <img src="/logo.svg" alt="" aria-hidden="true" className="h-7 w-7 rounded-md" />
            <span>{APP_NAME}</span>
          </NavLink>

          <nav
            aria-label="Main navigation"
            className="order-3 -mx-1 w-full overflow-x-auto px-1 md:order-2 md:mx-0 md:w-auto md:overflow-visible md:px-0"
          >
            <ul className="flex items-center gap-1">
              {navItems.map(({ to, label, icon: Icon }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    end={to === '/'}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                      )
                    }
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    {label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          <div className="order-2 ml-auto flex items-center gap-1 sm:gap-2 md:order-3">
            <ThemeToggle />
            <div className="flex items-center gap-2 rounded-full border bg-card py-1 pl-1 pr-3">
              <span
                className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary"
                aria-hidden="true"
              >
                {initial}
              </span>
              <span className="max-w-[9rem] truncate text-sm font-medium">{user?.username}</span>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="btn btn-ghost btn-sm gap-2 text-muted-foreground hover:text-destructive"
            >
              <FiLogOut className="h-4 w-4" aria-hidden="true" />
              <span aria-hidden="true" className="hidden sm:inline">
                Log out
              </span>
              <span className="sr-only">Log out</span>
            </button>
          </div>
        </div>
      </header>

      <main id={MAIN_CONTENT_ID} className="flex-1 py-6 sm:py-8">
        <div className="container">
          <Outlet />
        </div>
      </main>

      <footer className="border-t py-6">
        <div className="container flex flex-col items-center gap-1 text-center text-xs text-muted-foreground sm:flex-row sm:justify-between sm:text-left">
          <p>
            {APP_NAME} &middot; {APP_TAGLINE}
          </p>
          <p>&copy; {new Date().getFullYear()}</p>
        </div>
      </footer>
    </div>
  )
}
