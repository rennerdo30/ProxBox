import { FiMoon, FiSun } from 'react-icons/fi'
import { useTheme } from '../hooks/useTheme'

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'
  const label = isDark ? 'Switch to light theme' : 'Switch to dark theme'

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="btn btn-ghost btn-icon text-muted-foreground hover:text-foreground"
      aria-label={label}
      title={label}
      aria-pressed={isDark}
    >
      {isDark ? (
        <FiSun className="h-[1.125rem] w-[1.125rem]" aria-hidden="true" />
      ) : (
        <FiMoon className="h-[1.125rem] w-[1.125rem]" aria-hidden="true" />
      )}
    </button>
  )
}
