"use client"

import prettyMs from "pretty-ms"

import { NodeIcon } from "@/features/workflows/components/node-icon"
import { nodeRegistry } from "@/features/workflows/nodes/node-registry"
import type { RunStep } from "@/features/workflows/tasks/run-workflow"

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

// The selected step's result: its error if it failed, its output as formatted
// JSON if it produced one, or a short note when there's nothing to show.
export function InspectorPanel({
  step,
  isLive,
}: {
  step: RunStep
  isLive: boolean
}) {
  const hasIcon = step.nodeType in nodeRegistry

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-2 border-b border-border px-3 py-1.5 text-xs">
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
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-3">
        {step.status === "failed" ? (
          <pre className="font-mono text-xs wrap-break-word whitespace-pre-wrap text-destructive">
            {step.error ?? "This step failed without an error message."}
          </pre>
        ) : step.output !== undefined ? (
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
        ) : (
          <p className="text-xs text-muted-foreground">
            {emptyNote(step, isLive)}
          </p>
        )}
      </div>
    </div>
  )
}
