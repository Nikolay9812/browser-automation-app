"use client"

import { useState } from "react"

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"

import { InspectorPanel } from "@/features/workflows/components/inspector-panel"
import {
  LogsPanel,
  type StepSelection,
} from "@/features/workflows/components/logs-panel"
import { useWorkflowRuns } from "@/features/workflows/components/workflow-runs-provider"

// The console under the canvas: the runs list, plus the selected step's result
// beside it.
export function ConsolePanel() {
  const runs = useWorkflowRuns()
  const [selected, setSelected] = useState<StepSelection | null>(null)

  // Clicking the selected step again deselects it.
  const toggle = (selection: StepSelection) =>
    setSelected((current) =>
      current?.runId === selection.runId &&
      current.nodeId === selection.nodeId
        ? null
        : selection
    )

  // Looked up from the live runs on every render, so the inspector follows a
  // running step through to its result.
  const selectedRun = selected && runs.find((run) => run.id === selected.runId)
  const selectedStep = selectedRun?.steps.find(
    (step) => step.nodeId === selected?.nodeId
  )

  return (
    <div className="flex size-full min-h-0 flex-col">
      <div className="border-b border-border bg-card px-3 py-1.5 text-sm font-semibold">
        Logs
      </div>
      {/* Stable panel ids let the group re-lay itself out as the inspector
          mounts and unmounts with the selection. */}
      <ResizablePanelGroup orientation="horizontal" className="min-h-0 flex-1">
        <ResizablePanel id="logs" minSize="12rem" className="overflow-y-auto">
          <LogsPanel runs={runs} selected={selected} onSelect={toggle} />
        </ResizablePanel>
        {selectedRun && selectedStep && (
          <>
            <ResizableHandle />
            <ResizablePanel
              id="inspector"
              defaultSize="50"
              minSize="12rem"
              className="flex flex-col"
            >
              <InspectorPanel
                step={selectedStep}
                isLive={selectedRun.isLive}
              />
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
    </div>
  )
}
