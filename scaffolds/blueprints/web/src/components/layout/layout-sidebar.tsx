/**
 * Resources
 */
import { cn } from '@/utils/ui'

/**
 * Dependencies
 */
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

/**
 * Components
 */
import { Button } from '@/components/ui/shadcn/button'
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarRail, useSidebar } from '@/components/ui/shadcn/sidebar'

import { NavSection } from '@/components/nav/nav-section'
import { NavUser } from '@/components/nav/nav-user'

/**
 * Icons
 */
import { Car, ChartNoAxesCombined, ClipboardList, ContactRound, HandCoins, Handshake, Package, ShoppingBag, Users } from 'lucide-react'

/**
 * TS Types
 */
import type { NavSectionItem } from '@/components/nav/nav-section'
import type { ComponentProps } from 'react'

import { Logo } from '@/components/ui/custom/logo'

type NavigationItem = {
  title: string
  items: NavSectionItem[]
}

type SideBarConfig = {
  navigation: NavigationItem[]
}

/**
 * Config
 */
const data: SideBarConfig = {
  navigation: [
    {
      title: 'main-navigation.tk_menu-group_',
      items: [
        {
          title: 'main-navigation.tk_summary_',
          url: '#',
          icon: ClipboardList,
          isActive: true
        },
        {
          title: 'main-navigation.tk_feature-1_',
          url: '#',
          icon: Package,
          isActive: true
        },
        {
          title: 'main-navigation.tk_feature-2_',
          url: '#',
          icon: Handshake,
          isActive: true
        }
      ]
    },
    {
      title: 'main-navigation.tk_menu-group_',
      items: [
        {
          title: 'main-navigation.tk_summary_',
          url: '#',
          icon: ClipboardList,
          isActive: true
        },
        {
          title: 'main-navigation.tk_feature-1_',
          url: '#',
          icon: Users,
          isActive: true
        },
        {
          title: 'main-navigation.tk_feature-2_',
          url: '#',
          icon: ContactRound,
          isActive: true
        }
      ]
    },
    {
      title: 'main-navigation.tk_menu-group_',
      items: [
        {
          title: 'main-navigation.tk_feature-1_',
          url: '#',
          icon: ShoppingBag,
          isActive: true
        },
        {
          title: 'main-navigation.tk_feature-2_',
          url: '#',
          icon: HandCoins,
          isActive: true
        },
        {
          title: 'main-navigation.tk_feature-3_',
          url: '#',
          icon: Car,
          isActive: true,
          subItems: [
            {
              title: 'main-navigation.tk_sub-feature-1_',
              url: '#'
            },
            {
              title: 'main-navigation.tk_sub-feature-2_',
              url: '#'
            },
            {
              title: 'main-navigation.tk_sub-feature-3_',
              url: '#'
            }
          ]
        }
      ]
    }
  ]
}

/**
 * React declaration
 */
export const LayoutSidebar = ({ ...props }: ComponentProps<typeof Sidebar>) => {
  const { state } = useSidebar()
  const { t: tNav } = useTranslation('nav')
  const isCollapsed = state === 'collapsed'
  const navigate = useNavigate()

  const buttonClassName = cn(
    'mt-6 flex items-center gap-2 font-semibold transition-all duration-200',
    'rounded-sm shadow-none',
    'bg-gradient-to-r from-orange-400 to-orange-600 text-white',
    'hover:from-orange-500 hover:to-orange-700 hover:scale-[1.03]',
    isCollapsed ? 'mx-2 overflow-hidden text-xs justify-center' : 'mx-3 px-4 py-2 text-base justify-start'
  )

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <Logo className={!isCollapsed ? 'cursor-pointer px-4 pt-2' : 'cursor-pointer'} isLong={!isCollapsed} onClick={() => navigate('/dashboard')} />
      </SidebarHeader>
      <SidebarContent>
        <Button className={buttonClassName} onClick={() => navigate('/dashboard')} tabIndex={0} aria-label={tNav('main-navigation.tk_dashboard_')}>
          <ChartNoAxesCombined className="size-5 shrink-0 cursor-pointer" />
          {!isCollapsed && <span className="ml-2 truncate">{tNav('main-navigation.tk_dashboard_')}</span>}
        </Button>
        {data.navigation.map((section, index) => (
          <NavSection key={`nav-section-${index}`} section={section} />
        ))}
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
