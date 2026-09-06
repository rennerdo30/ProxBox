import { ReactNode } from 'react'
import Alert from './Alert'
import Spinner from './Spinner'

interface Props {
  title: string
  children: ReactNode
  loading?: boolean
  error?: string
  reload?: () => void
  actions?: ReactNode
}
export default function ResourcePage({
  title,
  children,
  loading,
  error,
  reload,
  actions,
}: Props) {
  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{title}</h1>
        <div className="flex flex-wrap gap-2">
          {actions}
          {reload && (
            <button
              className="btn btn-secondary"
              onClick={reload}
              disabled={loading}
            >
              Refresh
            </button>
          )}
        </div>
      </div>
      {error && <Alert>{error}</Alert>}
      {loading ? <Spinner label="Loading information" /> : children}
    </section>
  )
}
export function Pagination({
  page,
  count,
  onChange,
}: {
  page: number
  count: number
  onChange: (page: number) => void
}) {
  return (
    <nav aria-label="Pagination" className="flex items-center gap-4">
      <button
        className="btn btn-secondary"
        disabled={page === 0}
        onClick={() => onChange(page - 1)}
      >
        Previous
      </button>
      <span>Page {page + 1}</span>
      <button
        className="btn btn-secondary"
        disabled={count < 50}
        onClick={() => onChange(page + 1)}
      >
        Next
      </button>
    </nav>
  )
}
