import { cn } from '../lib/utils'

interface SpinnerProps {
  /** Extra classes, typically a size such as `h-8 w-8`. */
  className?: string
  /** Announced to screen readers while the spinner is visible. */
  label?: string
}

/**
 * Busy indicator. The visual ring is decorative; the label carries the meaning
 * for assistive technology.
 */
export default function Spinner({ className, label = 'Loading' }: SpinnerProps) {
  return (
    <span role="status" className="inline-flex items-center justify-center">
      <span className={cn('spinner h-5 w-5 text-primary', className)} aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </span>
  )
}
