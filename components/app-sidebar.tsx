"use client"

import * as React from "react"
import { OrganizationSwitcher, UserButton } from "@clerk/nextjs"
import { PlusIcon, WorkflowIcon } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar"

type Workflow = {
  id: string
  name: string
}

// Placeholder until workflows are loaded from the backend.
const WORKFLOWS: Workflow[] = [
  { id: "dominant-wasp", name: "dominant-wasp" },
  { id: "honest-reindeer", name: "honest-reindeer" },
  { id: "expected-llama", name: "expected-llama" },
  { id: "essential-ocelot", name: "essential-ocelot" },
  { id: "creepy-echidna", name: "creepy-echidna" },
  { id: "eastern-silkworm", name: "eastern-silkworm" },
  { id: "cultural-lion", name: "cultural-lion" },
  { id: "proud-weasel", name: "proud-weasel" },
  { id: "regional-bonobo", name: "regional-bonobo" },
]

function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [activeWorkflowId, setActiveWorkflowId] = React.useState<string | null>(
    null
  )

  return (
    <Sidebar variant="inset" collapsible="icon" {...props}>
      <SidebarHeader className="flex-row items-center justify-between gap-2 overflow-hidden group-data-[collapsible=icon]:justify-center">
        <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
          <OrganizationSwitcher
            hidePersonal
            afterCreateOrganizationUrl="/"
            afterSelectOrganizationUrl="/"
            appearance={{
              elements: {
                organizationSwitcherTrigger: "w-full max-w-full justify-start",
              },
            }}
          />
        </div>
        <SidebarTrigger className="shrink-0" />
      </SidebarHeader>

      <SidebarContent>
        <WorkflowList
          workflows={WORKFLOWS}
          activeWorkflowId={activeWorkflowId}
          onSelect={setActiveWorkflowId}
        />
      </SidebarContent>

      <SidebarFooter className="items-start group-data-[collapsible=icon]:items-center">
        <UserButton
          appearance={{ elements: { rootBox: "flex", userButtonTrigger: "p-0" } }}
        />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}

function WorkflowList({
  workflows,
  activeWorkflowId,
  onSelect,
}: {
  workflows: Workflow[]
  activeWorkflowId: string | null
  onSelect: (id: string) => void
}) {
  const { state, isMobile } = useSidebar()

  // Collapsed rail: the list folds into a single icon that opens a menu.
  if (state === "collapsed" && !isMobile) {
    return (
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton tooltip="Workflows">
                    <WorkflowIcon />
                    <span>Workflows</span>
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  side="right"
                  align="start"
                  className="min-w-56"
                >
                  <DropdownMenuItem>
                    <PlusIcon />
                    New workflow
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {workflows.map((workflow) => (
                    <DropdownMenuItem
                      key={workflow.id}
                      onSelect={() => onSelect(workflow.id)}
                    >
                      {workflow.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    )
  }

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Workflows</SidebarGroupLabel>
      <SidebarGroupAction title="New workflow">
        <PlusIcon />
        <span className="sr-only">New workflow</span>
      </SidebarGroupAction>
      <SidebarGroupContent>
        <SidebarMenu>
          {workflows.map((workflow) => (
            <SidebarMenuItem key={workflow.id}>
              <SidebarMenuButton
                isActive={workflow.id === activeWorkflowId}
                onClick={() => onSelect(workflow.id)}
              >
                <span>{workflow.name}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

export { AppSidebar }
