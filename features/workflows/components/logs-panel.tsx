"use client"

import { LockIcon, PlayIcon } from "lucide-react"
import prettyMs from "pretty-ms"

import { cn } from "@/lib/utils"

import { NodeIcon } from "@/features/workflows/components/node-icon"
import type { WorkflowRun } from "@/features/workflows/components/workflow-runs-provider"
import { useProPlan } from "@/features/workflows/hooks/use-pro-plan"
import { nodeRegistry } from "@/features/workflows/nodes/node-registry"
import type { RunStep } from "@/features/workflows/tasks/run-workflow"

// What the console has selected: one step of a run, or a whole run's replay.
export type ConsoleSelection =
  | { type: "step"; runId: string; nodeId: string }
  | { type: "replay"; runId: string }

export function isSameSelection(a: ConsoleSelection, b: ConsoleSelection) {
  if (a.type === "step" && b.type === "step") {
    return a.runId === b.runId && a.nodeId === b.nodeId
  }
  return a.type === b.type && a.runId === b.runId
}

// A run's recording exists only once the run has finished, and only when a
// step opened a browser.
export function hasReplay(
  run: WorkflowRun
): run is WorkflowRun & { sessionId: string } {
  return run.sessionId !== undefined && !run.isLive
}

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

// The row for a run's recording, styled like a step row but standing for the
// whole run. Replay is a Pro feature, so for other orgs the row is locked and
// clicking it goes to upgrade instead of opening the recording.
function ReplayRow({
  isSelected,
  onClick,
}: {
  isSelected: boolean
  onClick: () => void
}) {
  const { isLoaded, isPro, upgrade } = useProPlan()
  // Disabled, not locked, until Clerk loads, so Pro orgs don't see the lock
  // flash on.
  const locked = isLoaded && !isPro

  return (
    <button
      type="button"
      onClick={locked ? upgrade : onClick}
      disabled={!isLoaded}
      aria-pressed={isSelected}
      title={locked ? "Upgrade to Pro to watch replays" : undefined}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-md px-1.5 py-1 text-left text-xs transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50",
        isSelected && "bg-accent text-accent-foreground"
      )}
    >
      <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-muted">
        <PlayIcon className="size-3.5" />
      </span>
      <span
        className={cn(
          "truncate font-medium",
          locked && "text-muted-foreground"
        )}
      >
        Replay
      </span>
      {locked && (
        <span className="ml-auto flex shrink-0 items-center gap-1 text-[10px] font-medium text-muted-foreground">
          <LockIcon className="size-3" />
          Pro
        </span>
      )}
    </button>
  )
}

// Every run of the workflow, newest first, each followed by its steps and,
// once it has a recording, a row to replay it.
export function LogsPanel({
  runs,
  selected,
  onSelect,
}: {
  runs: WorkflowRun[]
  selected: ConsoleSelection | null
  onSelect: (selection: ConsoleSelection) => void
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
                selected?.type === "step" &&
                selected.runId === run.id &&
                selected.nodeId === step.nodeId
              }
              onClick={() =>
                onSelect({ type: "step", runId: run.id, nodeId: step.nodeId })
              }
            />
          ))}
          {hasReplay(run) && (
            <ReplayRow
              isSelected={
                selected?.type === "replay" && selected.runId === run.id
              }
              onClick={() => onSelect({ type: "replay", runId: run.id })}
            />
          )}
        </section>
      ))}
    </div>
  )
}
