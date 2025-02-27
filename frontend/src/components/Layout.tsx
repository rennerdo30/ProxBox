import { Link, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b bg-background shadow-sm">
        <div className="container flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2">
              <span className="text-xl font-bold">ProxBox</span>
            </Link>
            <nav className="hidden md:flex items-center gap-6">
              <Link
                to="/"
                className="text-sm font-medium transition-colors hover:text-primary"
              >
                Dashboard
              </Link>
              <Link
                to="/vms"
                className="text-sm font-medium transition-colors hover:text-primary"
              >
                Virtual Machines
              </Link>
              {user?.role === 'admin' && (
                <Link
                  to="/admin"
                  className="text-sm font-medium transition-colors hover:text-primary"
                >
                  Admin
                </Link>
              )}
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{user?.username}</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground">
                {user?.first_name?.[0] || user?.username[0].toUpperCase()}
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="text-sm font-medium text-destructive transition-colors hover:text-destructive/80"
            >
              Logout
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <div className="container mx-auto">
          <Outlet />
        </div>
      </main>
      <footer className="border-t py-4">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} ProxBox - Discardable VM Management
        </div>
      </footer>
    </div>
  )
}