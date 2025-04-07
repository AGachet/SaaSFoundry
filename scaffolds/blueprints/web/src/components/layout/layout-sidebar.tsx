/**
 * Resources
 */
import { cn } from '@/utils/ui'

/**
 * Dependencies
 */
import { useTranslation } from 'react-i18next'

/**
 * Components
 */
import { Button } from '@/components/ui/shadcn/button'
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarRail, useSidebar } from '@/components/ui/shadcn/sidebar'

import { TeamSwitcher } from '@/components/layout/team-switcher'
import { NavSection } from '@/components/nav/nav-section'
import { NavUser } from '@/components/nav/nav-user'

/**
 * Icons
 */
import { AudioWaveform, Building, ChartNoAxesCombined, ClipboardList, Command, ContactRound, GalleryVerticalEnd, Handshake, Package, ShoppingBag, Users } from 'lucide-react'

/**
 * TS Types
 */
import type { NavSectionItem } from '@/components/nav/nav-section'
import type { ComponentProps } from 'react'

type TeamItem = {
  name: string
  logo: React.ComponentType
  plan: string
}

type NavigationItem = {
  title: string
  items: NavSectionItem[]
}

type SideBarConfig = {
  // user: User
  teams: TeamItem[]
  navigation: NavigationItem[]
}

/**
 * Config
 */
const data: SideBarConfig = {
  teams: [
    {
      name: 'SaaSFoundry',
      logo: GalleryVerticalEnd,
      plan: 'Free version'
    },
    {
      name: 'Acme Corp.',
      logo: AudioWaveform,
      plan: 'Startup'
    },
    {
      name: 'Evil Corp.',
      logo: Command,
      plan: 'Free'
    }
  ],
  navigation: [
    {
      title: 'main-navigation.tk_features-group-1_',
      items: [
        {
          title: 'main-navigation.tk_feature-1_',
          url: '#',
          icon: ClipboardList,
          isActive: true
        },
        {
          title: 'main-navigation.tk_feature-2_',
          url: '#',
          icon: Package,
          isActive: true
        },
        {
          title: 'main-navigation.tk_feature-3_',
          url: '#',
          icon: Handshake,
          isActive: true
        }
      ]
    },
    {
      title: 'main-navigation.tk_features-group-2_',
      items: [
        {
          title: 'main-navigation.tk_feature-4_',
          url: '#',
          icon: ClipboardList,
          isActive: true
        },
        {
          title: 'main-navigation.tk_feature-5_',
          url: '#',
          icon: Users,
          isActive: true
        },
        {
          title: 'main-navigation.tk_feature-6_',
          url: '#',
          icon: ContactRound,
          isActive: true
        }
      ]
    },
    {
      title: 'main-navigation.tk_features-group-3_',
      items: [
        {
          title: 'main-navigation.tk_feature-7_',
          url: '#',
          icon: ClipboardList,
          isActive: true
        },
        {
          title: 'main-navigation.tk_feature-8_',
          url: '#',
          icon: Building,
          isActive: true
        },
        {
          title: 'main-navigation.tk_feature-9_',
          url: '#',
          icon: ShoppingBag,
          isActive: true
          // subItems: [
          //   {
          //     title: "Genesis",
          //     url: "#",
          //   },
          //   {
          //     title: "Explorer",
          //     url: "#",
          //   },
          //   {
          //     title: "Quantum",
          //     url: "#",
          //   },
          // ],
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
  const { t } = useTranslation('nav')
  const isCollapsed = state === 'collapsed'

  const buttonClassName = cn('mt-6', isCollapsed ? 'mx-2 overflow-hidden px-2 text-xs' : 'mx-6 text-base')

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <Button className={buttonClassName}>
          <ChartNoAxesCombined className="cursor-pointer" />
          {!isCollapsed && t('main-navigation.tk_dashboard_')}
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
