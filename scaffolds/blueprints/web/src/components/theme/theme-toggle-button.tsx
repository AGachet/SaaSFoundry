import { Moon, Sun } from 'lucide-react'

import { useTheme } from '@/components/theme/theme-provider'
import { Button } from '@/components/ui/shadcn/button'

export function ThemeToggleButton() {
  const { theme, setTheme } = useTheme()

  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)

  return (
    <Button variant="ghost" size="icon" className="fixed right-4 top-4 z-50" onClick={() => setTheme(isDark ? 'light' : 'dark')}>
      <Sun className="size-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute size-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
