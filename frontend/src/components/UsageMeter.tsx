import { IconType } from 'react-icons'
import { PERCENT, USAGE_CRITICAL_RATIO, USAGE_WARNING_RATIO } from '../lib/constants'
import { cn } from '../lib/utils'

interface UsageMeterProps {
  label: string
  /** Utilisation as a ratio between 0 and 1. */
  ratio: number
  icon: IconType
}

const percentFormatter = new Intl.NumberFormat(undefined, {
  style: 'percent',
  maximumFractionDigits: 0,
})

function barClassName(ratio: number) {
  if (ratio >= USAGE_CRITICAL_RATIO) return 'bg-destructive'
  if (ratio >= USAGE_WARNING_RATIO) return 'bg-warning'
  return 'bg-primary'
}

/** Single cluster resource gauge (CPU, memory, disk). */
export default function UsageMeter({ label, ratio, icon: Icon }: UsageMeterProps) {
  const safeRatio = Number.isFinite(ratio) ? Math.min(Math.max(ratio, 0), 1) : 0
  const formatted = percentFormatter.format(safeRatio)

  return (
    <div className="card p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Icon className="h-4 w-4" aria-hidden="true" />
          {label}
        </div>
        <span className="text-xl font-semibold tabular-nums tracking-tight">{formatted}</span>
      </div>

      <div
        className="meter-track mt-3"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={PERCENT}
        aria-valuenow={Math.round(safeRatio * PERCENT)}
        aria-valuetext={formatted}
      >
        <div
          className={cn('meter-bar', barClassName(safeRatio))}
          style={{ width: `${safeRatio * PERCENT}%` }}
        />
      </div>
    </div>
  )
}
