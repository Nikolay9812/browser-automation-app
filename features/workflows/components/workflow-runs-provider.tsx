"use client"

import { createContext, ReactNode, useContext, useMemo } from "react"
import { useRealtimeRunsWithTag } from "@trigger.dev/react-hooks"

import type {
  RunStep,
  runWorkflowTask,
} from "@/features/workflows/tasks/run-workflow"

type WorkflowRun = ReturnType<
  typeof useRealtimeRunsWithTag<typeof runWorkflowTask>
>["runs"][number]

const WorkflowRunsContext = createContext<WorkflowRun[] | null>(null)

// One realtime subscription to every run of this workflow (tagged
// `workflow:<id>` when triggered), shared by everything on the canvas.
export function WorkflowRunsProvider({
  workflowId,
  accessToken,
  children,
}: {
  workflowId: string
  accessToken: string
  children: ReactNode
}) {
  const { runs } = useRealtimeRunsWithTag<typeof runWorkflowTask>(
    `workflow:${workflowId}`,
    { accessToken, skipColumns: ["payload"] }
  )

  return (
    <WorkflowRunsContext.Provider value={runs}>
      {children}
    </WorkflowRunsContext.Provider>
  )
}

// The most recent run's steps, and whether that run is still queued or
// executing. A finished run's output is authoritative; until then the live
// metadata is all there is.
export function useLatestRunSteps(): { steps: RunStep[]; isLive: boolean } {
  const runs = useContext(WorkflowRunsContext)
  if (!runs) {
    throw new Error("useLatestRunSteps must be used within WorkflowRunsProvider")
  }

  return useMemo(() => {
    const latest = runs.reduce<WorkflowRun | undefined>(
      (newest, run) =>
        !newest || run.createdAt > newest.createdAt ? run : newest,
      undefined
    )
    if (!latest) return { steps: [], isLive: false }

    const steps =
      latest.output?.steps ??
      (latest.metadata?.steps as RunStep[] | undefined) ??
      []
    return { steps, isLive: latest.isQueued || latest.isExecuting }
  }, [runs])
}
