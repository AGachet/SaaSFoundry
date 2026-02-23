import { Moon, Sun } from 'lucide-react'

import { useTheme } from '@/components/theme/theme-provider'
import { DropdownMenuItem, DropdownMenuPortal, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger } from '@/components/ui/shadcn/dropdown-menu'
import { useTranslation } from 'react-i18next'

export function ThemeToggle() {
  const { setTheme, theme } = useTheme()
  const { t: tNav } = useTranslation('nav')

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger className="cursor-pointer">
        <Sun className="mr-2 size-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute mr-2 size-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        {tNav('user-navigation.tk_theme_')}
      </DropdownMenuSubTrigger>
      <DropdownMenuPortal>
        <DropdownMenuSubContent>
          <DropdownMenuItem onClick={() => setTheme('light')} className={`cursor-pointer ${theme === 'light' ? 'font-semibold' : ''}`}>
            <Sun className="mr-2 size-4" />
            {tNav('user-navigation.tk_theme-light_')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme('dark')} className={`cursor-pointer ${theme === 'dark' ? 'font-semibold' : ''}`}>
            <Moon className="mr-2 size-4" />
            {tNav('user-navigation.tk_theme-dark_')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme('system')} className={`cursor-pointer ${theme === 'system' ? 'font-semibold' : ''}`}>
            {tNav('user-navigation.tk_theme-system_')}
          </DropdownMenuItem>
        </DropdownMenuSubContent>
      </DropdownMenuPortal>
    </DropdownMenuSub>
  )
}
