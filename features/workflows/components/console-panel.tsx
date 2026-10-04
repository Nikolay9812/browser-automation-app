"use client"

import { useState } from "react"

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"

import {
  InspectorPanel,
  type InspectorTarget,
} from "@/features/workflows/components/inspector-panel"
import {
  hasReplay,
  isSameSelection,
  LogsPanel,
  type ConsoleSelection,
} from "@/features/workflows/components/logs-panel"
import {
  useWorkflowRuns,
  type WorkflowRun,
} from "@/features/workflows/components/workflow-runs-provider"

// What the selection points at in the current runs, or null once it no longer
// resolves (the step or recording isn't there).
function resolveTarget(
  runs: WorkflowRun[],
  selected: ConsoleSelection | null
): InspectorTarget | null {
  const run = selected && runs.find((run) => run.id === selected.runId)
  if (!run) return null
  if (selected.type === "replay") {
    return hasReplay(run) ? { type: "replay", sessionId: run.sessionId } : null
  }
  const step = run.steps.find((step) => step.nodeId === selected.nodeId)
  return step ? { type: "step", step, isLive: run.isLive } : null
}

// The console under the canvas: the runs list, plus the selected step's result
// or run's recording beside it.
export function ConsolePanel() {
  const runs = useWorkflowRuns()
  // One selection at a time, whether a step or a run's replay.
  const [selected, setSelected] = useState<ConsoleSelection | null>(null)

  // Clicking the selected row again deselects it.
  const toggle = (selection: ConsoleSelection) =>
    setSelected((current) =>
      current && isSameSelection(current, selection) ? null : selection
    )

  // Looked up from the live runs on every render, so the inspector follows a
  // running step through to its result.
  const target = resolveTarget(runs, selected)

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
        {target && (
          <>
            <ResizableHandle />
            <ResizablePanel
              id="inspector"
              defaultSize="50"
              minSize="12rem"
              className="flex flex-col"
            >
              <InspectorPanel target={target} />
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
    </div>
  )
}
