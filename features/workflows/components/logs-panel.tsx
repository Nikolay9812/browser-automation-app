"use client"

import prettyMs from "pretty-ms"

import { cn } from "@/lib/utils"

import { NodeIcon } from "@/features/workflows/components/node-icon"
import type { WorkflowRun } from "@/features/workflows/components/workflow-runs-provider"
import { nodeRegistry } from "@/features/workflows/nodes/node-registry"
import type { RunStep } from "@/features/workflows/tasks/run-workflow"

// A step within a run, the unit the console selects.
export type StepSelection = { runId: string; nodeId: string }

// Trigger.dev's run statuses are SCREAMING_CASE ("COMPLETED", "TIMED_OUT").
function formatStatus(status: string) {
  const text = status.toLowerCase().replaceAll("_", " ")
  return text.charAt(0).toUpperCase() + text.slice(1)
}

// One step row: icon, title, and how long it took. Runs from before steps
// recorded their node type have no icon to show, so they get a blank chip.
function StepRow({
  step,
  isLive,
  isSelected,
  onClick,
}: {
  step: RunStep
  isLive: boolean
  isSelected: boolean
  onClick: () => void
}) {
  // A run that ended while a step was still "running" never finished it, so it
  // only spins while the run is live.
  const isRunning = step.status === "running" && isLive
  const isFailed = step.status === "failed"
  const neverRan = step.status === "pending"
  const hasIcon = step.nodeType in nodeRegistry

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isSelected}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-md px-1.5 py-1 text-left text-xs transition-colors hover:bg-accent hover:text-accent-foreground",
        isSelected && "bg-accent text-accent-foreground",
        isFailed && "text-destructive hover:text-destructive",
        neverRan && "opacity-50"
      )}
    >
      {hasIcon ? (
        <NodeIcon
          type={step.nodeType}
          running={isRunning}
          className={cn(isFailed && "bg-destructive text-white")}
        />
      ) : (
        <span className="size-6 shrink-0 rounded-md bg-muted" />
      )}
      <span className="truncate font-medium">{step.title ?? step.nodeId}</span>
      {step.durationMs !== undefined && (
        <span className="ml-auto shrink-0 text-muted-foreground tabular-nums">
          {prettyMs(step.durationMs)}
        </span>
      )}
    </button>
  )
}

// Every run of the workflow, newest first, each followed by its steps.
export function LogsPanel({
  runs,
  selected,
  onSelect,
}: {
  runs: WorkflowRun[]
  selected: StepSelection | null
  onSelect: (selection: StepSelection) => void
}) {
  if (runs.length === 0) {
    return <p className="p-3 text-sm text-muted-foreground">No runs yet</p>
  }

  return (
    <div className="flex flex-col gap-3 p-2">
      {runs.map((run) => (
        <section key={run.id} className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2 px-1.5 py-1 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">
              {formatStatus(run.status)}
            </span>
            <span>{run.createdAt.toLocaleString()}</span>
            {run.startedAt && run.finishedAt && (
              <span className="ml-auto tabular-nums">
                {prettyMs(run.finishedAt.getTime() - run.startedAt.getTime())}
              </span>
            )}
          </div>
          {run.error && !run.steps.some((s) => s.status === "failed") && (
            <p className="px-1.5 text-xs text-destructive">{run.error}</p>
          )}
          {run.steps.map((step) => (
            <StepRow
              key={step.nodeId}
              step={step}
              isLive={run.isLive}
              isSelected={
                selected?.runId === run.id && selected.nodeId === step.nodeId
              }
              onClick={() => onSelect({ runId: run.id, nodeId: step.nodeId })}
            />
          ))}
        </section>
      ))}
    </div>
  )
}
