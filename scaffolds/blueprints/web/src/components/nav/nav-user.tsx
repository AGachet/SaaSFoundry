/**
 * Resources
 */
import { BadgeCheck, ChevronsUpDown, LogOut } from 'lucide-react'

/**
 * Theme
 */
import { ThemeToggle } from '@/components/theme/theme-toggle'

/**
 * Dependencies
 */
import { useSignOut } from '@/hooks/api/auth/mutations/useSignOut'
import { useMe } from '@/hooks/api/auth/queries/useMe'
import { useModuleAccess } from '@/hooks/auth/useModuleAccess'
import { getInitials } from '@/utils/format'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

/**
 * Components
 */
import { Avatar } from '@/components/ui/custom/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/shadcn/dropdown-menu'
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from '@/components/ui/shadcn/sidebar'

/**
 * React declaration
 */
export function NavUser() {
  const { isMobile } = useSidebar()
  const { submit: signOut } = useSignOut()
  const { data: user } = useMe()
  const { t: tNav } = useTranslation('nav')
  const { hasModuleAccess } = useModuleAccess()

  if (!user || !user.people) return null

  const userName = `${user.people.firstname || ''} ${user.people.lastname || ''}`
  const initials = getInitials(user.people.firstname, user.people.lastname)

  const renderUserInfo = () => (
    <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
      <Avatar initials={initials} bgColor="bg-primary/15" textColor="text-primary" size="sm" />
      <div className="grid flex-1 text-left text-sm leading-tight">
        <span className="truncate font-semibold">{userName}</span>
        <span className="truncate text-xs">{user.email}</span>
      </div>
    </div>
  )

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
              <Avatar initials={initials} bgColor="bg-primary/15" textColor="text-primary" size="sm" />
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{userName}</span>
                <span className="truncate text-xs">{user.email}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg" side={isMobile ? 'bottom' : 'right'} align="end" sideOffset={4}>
            <DropdownMenuLabel className="p-0 font-normal">{renderUserInfo()}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              {hasModuleAccess('ACCOUNT_ADMINISTRATION') && (
                <DropdownMenuItem asChild className="cursor-pointer">
                  <Link to="/account?tab=overview">
                    <BadgeCheck className="mr-2 size-5" />
                    {tNav('user-navigation.tk_account-management_')}
                  </Link>
                </DropdownMenuItem>
              )}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <ThemeToggle />
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => signOut()} className="cursor-pointer">
              <LogOut className="mr-2 size-5" />
              {tNav('user-navigation.tk_signout_')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
