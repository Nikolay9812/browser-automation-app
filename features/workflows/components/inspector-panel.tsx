"use client"

import { PlayIcon } from "lucide-react"
import prettyMs from "pretty-ms"

import { NodeIcon } from "@/features/workflows/components/node-icon"
import { SessionReplay } from "@/features/workflows/components/session-replay"
import { nodeRegistry } from "@/features/workflows/nodes/node-registry"
import type { RunStep } from "@/features/workflows/tasks/run-workflow"

// What the output pane shows: one step's result, or a whole run's recording.
export type InspectorTarget =
  | { type: "step"; step: RunStep; isLive: boolean }
  | { type: "replay"; sessionId: string }

// Why there's no output or error to show, by where the step got to.
function emptyNote(step: RunStep, isLive: boolean) {
  if (step.status === "pending") {
    return isLive ? "This step hasn't started yet." : "This step never ran."
  }
  if (step.status === "running") {
    return isLive ? "This step is still running." : "This step never finished."
  }
  return "This step produced no output."
}

// The selected step's header: icon, title, and how long it took.
function StepHeader({ step }: { step: RunStep }) {
  const hasIcon = step.nodeType in nodeRegistry
  return (
    <>
      {hasIcon && (
        <NodeIcon
          type={step.nodeType}
          className="size-5 rounded-sm [&_svg]:size-3"
        />
      )}
      <span className="truncate font-semibold">
        {step.title ?? step.nodeId}
      </span>
      {step.durationMs !== undefined && (
        <span className="ml-auto shrink-0 text-muted-foreground tabular-nums">
          {prettyMs(step.durationMs)}
        </span>
      )}
    </>
  )
}

// The selected step's result: its error if it failed, its output as formatted
// JSON if it produced one, or a short note when there's nothing to show.
function StepResult({ step, isLive }: { step: RunStep; isLive: boolean }) {
  if (step.status === "failed") {
    return (
      <pre className="font-mono text-xs wrap-break-word whitespace-pre-wrap text-destructive">
        {step.error ?? "This step failed without an error message."}
      </pre>
    )
  }
  if (step.output !== undefined) {
    return (
      <>
        {step.outputTruncated && (
          <p className="mb-2 text-xs text-muted-foreground">
            The output was too large to keep in full, so only its start is
            shown.
          </p>
        )}
        <pre className="font-mono text-xs wrap-break-word whitespace-pre-wrap">
          {/* A truncated output is already a clipped JSON string. */}
          {step.outputTruncated
            ? String(step.output)
            : JSON.stringify(step.output, null, 2)}
        </pre>
      </>
    )
  }
  return (
    <p className="text-xs text-muted-foreground">{emptyNote(step, isLive)}</p>
  )
}

// The output pane beside the logs: a step's result, or the run's recording
// when its replay row is selected.
export function InspectorPanel({ target }: { target: InspectorTarget }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-2 border-b border-border px-3 py-1.5 text-xs">
        {target.type === "step" ? (
          <StepHeader step={target.step} />
        ) : (
          <>
            <span className="flex size-5 shrink-0 items-center justify-center rounded-sm bg-muted">
              <PlayIcon className="size-3" />
            </span>
            <span className="truncate font-semibold">Replay</span>
          </>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-3">
        {target.type === "step" ? (
          <StepResult step={target.step} isLive={target.isLive} />
        ) : (
          <SessionReplay sessionId={target.sessionId} />
        )}
      </div>
    </div>
  )
}
