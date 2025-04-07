/**
 * Resources
 */
import { Outlet } from 'react-router-dom'

/**
 * Components
 */
import { LayoutSidebar } from '@/components/layout/layout-sidebar'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/shadcn/breadcrumb'
import { Separator } from '@/components/ui/shadcn/separator'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/shadcn/sidebar'

/**
 * React declaration
 */
export const LayoutLogged = () => {
  const renderBreadcrumbItems = () => (
    <BreadcrumbList>
      <BreadcrumbItem className="hidden md:block">
        <BreadcrumbLink href="#">Building Your Application</BreadcrumbLink>
      </BreadcrumbItem>
      <BreadcrumbSeparator className="hidden md:block" />
      <BreadcrumbItem>
        <BreadcrumbPage>Data Fetching</BreadcrumbPage>
      </BreadcrumbItem>
    </BreadcrumbList>
  )

  const renderBreadcrumb = () => (
    <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
      <div className="flex items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Breadcrumb>{renderBreadcrumbItems()}</Breadcrumb>
      </div>
    </header>
  )

  return (
    <SidebarProvider>
      <LayoutSidebar />
      <SidebarInset>
        {renderBreadcrumb()}
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <main className="h-full">
            <Outlet />
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
