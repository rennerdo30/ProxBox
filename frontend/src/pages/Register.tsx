import { isAxiosError } from 'axios'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { APP_NAME } from '../lib/constants'
import Alert from '../components/Alert'
import AuthLayout from '../components/AuthLayout'

const MIN_PASSWORD_LENGTH = 8

export default function Register() {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const { register } = useAuth()
  const navigate = useNavigate()

  const passwordMismatch =
    passwordConfirm.length > 0 && password !== passwordConfirm

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== passwordConfirm) {
      setError('The two passwords do not match.')
      return
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(
        `Your password must be at least ${MIN_PASSWORD_LENGTH} characters long.`,
      )
      return
    }

    setIsLoading(true)

    try {
      await register({
        username,
        email,
        password,
        first_name: firstName || undefined,
        last_name: lastName || undefined,
      })

      navigate('/login', {
        state: { message: 'Your account was created. You can sign in now.' },
      })
    } catch (err) {
      console.error(err)
      setError(
        (isAxiosError(err) && typeof err.response?.data?.detail === 'string'
          ? err.response.data.detail
          : '') || 'Failed to create the account. Please try again.',
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthLayout
      title="Create an account"
      description={`Register to start spinning up throwaway VMs with ${APP_NAME}.`}
      footer={
        <p className="text-muted-foreground">
          Already have an account?{' '}
          <Link to="/login" className="link">
            Sign in
          </Link>
        </p>
      }
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        {error && <Alert>{error}</Alert>}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="field">
            <label htmlFor="firstName" className="label">
              First name{' '}
              <span className="text-muted-foreground">(optional)</span>
            </label>
            <input
              id="firstName"
              name="firstName"
              type="text"
              className="input"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              autoComplete="given-name"
            />
          </div>

          <div className="field">
            <label htmlFor="lastName" className="label">
              Last name{' '}
              <span className="text-muted-foreground">(optional)</span>
            </label>
            <input
              id="lastName"
              name="lastName"
              type="text"
              className="input"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              autoComplete="family-name"
            />
          </div>
        </div>

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
            required
          />
        </div>

        <div className="field">
          <label htmlFor="email" className="label">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            autoCapitalize="none"
            required
          />
        </div>

        <div className="field">
          <label htmlFor="password" className="label">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            minLength={MIN_PASSWORD_LENGTH}
            aria-describedby="password-hint"
            required
          />
          <p id="password-hint" className="field-hint">
            At least {MIN_PASSWORD_LENGTH} characters.
          </p>
        </div>

        <div className="field">
          <label htmlFor="passwordConfirm" className="label">
            Confirm password
          </label>
          <input
            id="passwordConfirm"
            name="passwordConfirm"
            type="password"
            className="input"
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            autoComplete="new-password"
            aria-invalid={passwordMismatch}
            aria-describedby={
              passwordMismatch ? 'password-confirm-error' : undefined
            }
            required
          />
          {passwordMismatch && (
            <p
              id="password-confirm-error"
              className="text-xs font-medium text-destructive"
            >
              The two passwords do not match.
            </p>
          )}
        </div>

        <button
          type="submit"
          className="btn btn-primary w-full"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <span className="spinner h-4 w-4" aria-hidden="true" />
              Creating account
            </>
          ) : (
            'Create account'
          )}
        </button>
      </form>
    </AuthLayout>
  )
}
