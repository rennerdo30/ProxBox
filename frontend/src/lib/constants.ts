/** Shared UI constants. Keep literals used by more than one place in here. */

export const APP_NAME = 'ProxBox'
export const APP_TAGLINE = 'Discardable VM management for Proxmox VE'

/** localStorage key holding the user's explicit light/dark choice. */
export const THEME_STORAGE_KEY = 'proxbox:theme'

/** Class Tailwind's `darkMode: "class"` looks for on <html>. */
export const DARK_CLASS = 'dark'

/** How many virtual machines the dashboard's "recent" table shows. */
export const RECENT_VM_LIMIT = 5

/** Ratio (0..1) -> percent, for the cluster usage meters. */
export const PERCENT = 100

/** Usage ratios above these thresholds are surfaced as warning / critical. */
export const USAGE_WARNING_RATIO = 0.75
export const USAGE_CRITICAL_RATIO = 0.9

/** Anchor target of the "skip to content" link. */
export const MAIN_CONTENT_ID = 'main-content'
