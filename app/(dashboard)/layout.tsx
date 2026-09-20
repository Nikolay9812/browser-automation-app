import { cookies } from "next/headers"

import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"

const SIDEBAR_COOKIE_NAME = "sidebar_state"

export default async function DashboardLayout(props: LayoutProps<"/">) {
  const cookieStore = await cookies()
  const defaultOpen = cookieStore.get(SIDEBAR_COOKIE_NAME)?.value !== "false"

  return (
    <TooltipProvider>
      <SidebarProvider defaultOpen={defaultOpen}>
        <AppSidebar />
        <SidebarInset>{props.children}</SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
