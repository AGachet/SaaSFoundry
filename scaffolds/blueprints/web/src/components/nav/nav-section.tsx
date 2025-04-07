/**
 * Dependencies
 */
import { useTranslation } from 'react-i18next'

/**
 * Components
 */
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/shadcn/collapsible'
import { SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarMenuSub, SidebarMenuSubButton, SidebarMenuSubItem } from '@/components/ui/shadcn/sidebar'

/**
 * Icons
 */
import { ChevronRight } from 'lucide-react'

/**
 * TS Types
 */
import type { LucideIcon } from 'lucide-react'

export type NavSectionItem = {
  title: string
  url?: string
  icon?: LucideIcon
  isActive?: boolean
  subItems?: {
    title: string
    url: string
  }[]
}

interface NavSectionProps {
  section: {
    title: string
    items: NavSectionItem[]
  }
}

/**
 * React declaration
 */
export const NavSection = ({ section }: NavSectionProps) => {
  const { t } = useTranslation('nav')

  const renderSubItems = (item: NavSectionItem) => (
    <SidebarMenuSub>
      {item.subItems?.map((subItem) => (
        <SidebarMenuSubItem key={`${item.title}-${subItem.title}`}>
          <SidebarMenuSubButton asChild>
            <a href={subItem.url}>
              <span>{t(subItem.title)}</span>
            </a>
          </SidebarMenuSubButton>
        </SidebarMenuSubItem>
      ))}
    </SidebarMenuSub>
  )

  const renderCollapsibleItem = (item: NavSectionItem) => (
    <Collapsible key={item.title} asChild defaultOpen={item.isActive} className="group/collapsible">
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton tooltip={t(item.title)}>
            {item.icon && <item.icon />}
            <span>{t(item.title)}</span>
            <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>{renderSubItems(item)}</CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  )

  const renderSimpleItem = (item: NavSectionItem) => (
    <SidebarMenuButton key={item.title} asChild>
      <a href={item.url}>
        {item.icon && <item.icon />}
        <span>{t(item.title)}</span>
      </a>
    </SidebarMenuButton>
  )

  return (
    <SidebarGroup>
      <SidebarGroupLabel>{t(section.title)}</SidebarGroupLabel>
      <SidebarMenu>{section.items.map((item) => (item.subItems ? renderCollapsibleItem(item) : renderSimpleItem(item)))}</SidebarMenu>
    </SidebarGroup>
  )
}
