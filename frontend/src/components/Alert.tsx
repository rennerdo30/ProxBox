import { ReactNode } from 'react'
import { FiAlertCircle, FiCheckCircle } from 'react-icons/fi'
import { cn } from '../lib/utils'

type AlertVariant = 'error' | 'success'

interface AlertProps {
  variant?: AlertVariant
  children: ReactNode
  className?: string
}

const VARIANTS: Record<AlertVariant, { className: string; icon: typeof FiAlertCircle }> = {
  error: { className: 'alert-error', icon: FiAlertCircle },
  success: { className: 'alert-success', icon: FiCheckCircle },
}

/**
 * Inline status message. `role="alert"` makes it announced as soon as it is
 * rendered, which is what we want for submit failures.
 */
export default function Alert({ variant = 'error', children, className }: AlertProps) {
  const { className: variantClass, icon: Icon } = VARIANTS[variant]

  return (
    <div role="alert" className={cn('alert', variantClass, className)}>
      <Icon className="mt-px h-4 w-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}
