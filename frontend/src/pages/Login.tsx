import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { FiEye, FiEyeOff } from 'react-icons/fi'
import { useAuth } from '../hooks/useAuth'
import { APP_NAME } from '../lib/constants'
import Alert from '../components/Alert'
import AuthLayout from '../components/AuthLayout'

interface LoginLocationState {
  message?: string
}

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Set by the register page after a successful sign-up.
  const flashMessage = (location.state as LoginLocationState | null)?.message

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      await login(username, password)
      navigate('/')
    } catch (err: any) {
      console.error(err)
      setError(err.response?.data?.detail || 'Failed to log in. Check your username and password.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthLayout
      title={`Sign in to ${APP_NAME}`}
      description="Enter your credentials to manage your virtual machines."
      footer={
        <p className="text-muted-foreground">
          Don&apos;t have an account?{' '}
          <Link to="/register" className="link">
            Create one
          </Link>
        </p>
      }
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        {flashMessage && <Alert variant="success">{flashMessage}</Alert>}
        {error && <Alert>{error}</Alert>}

        <div className="field">
          <label htmlFor="username" className="label">
            Username
          </label>
          <input
            id="username"
            name="username"
            type="text"
            className="input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            autoCapitalize="none"
            autoFocus
            required
            aria-invalid={Boolean(error)}
          />
        </div>

        <div className="field">
          <label htmlFor="password" className="label">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              className="input pr-11"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              aria-invalid={Boolean(error)}
            />
            <button
              type="button"
              onClick={() => setShowPassword((visible) => !visible)}
              className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-md text-muted-foreground transition-colors hover:text-foreground"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword}
            >
              {showPassword ? (
                <FiEyeOff className="h-4 w-4" aria-hidden="true" />
              ) : (
                <FiEye className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        <button type="submit" className="btn btn-primary w-full" disabled={isLoading}>
          {isLoading ? (
            <>
              <span className="spinner h-4 w-4" aria-hidden="true" />
              Signing in
            </>
          ) : (
            'Sign in'
          )}
        </button>
      </form>
    </AuthLayout>
  )
}
