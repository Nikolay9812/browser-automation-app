import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import { Canvas } from "@/features/workflows/components/canvas"
import { ConsolePanel } from "@/features/workflows/components/console-panel"
import { RightSidebar } from "@/features/workflows/components/right-sidebar"

export function WorkflowShell({ workflowId }: { workflowId: string }) {
  return (
    <ResizablePanelGroup
      id={`workflow-shell-${workflowId}`}
      orientation="horizontal"
      className="size-full"
    >
      <ResizablePanel minSize="30rem">
        <ResizablePanelGroup orientation="vertical">
          <ResizablePanel minSize="18rem">
            <Canvas />
          </ResizablePanel>
          <ResizableHandle />
          <ResizablePanel defaultSize="8rem" minSize="6rem">
            <ConsolePanel />
          </ResizablePanel>
        </ResizablePanelGroup>
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel defaultSize="16rem" minSize="14rem" maxSize="36rem">
        <RightSidebar workflowId={workflowId} />
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}
