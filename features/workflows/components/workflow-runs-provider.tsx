"use client"

import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useEffectEvent,
  useMemo,
  useState,
} from "react"
import type { RealtimeRun as AnyTaskRealtimeRun } from "@trigger.dev/sdk"
import { useApiClient } from "@trigger.dev/react-hooks"

import type {
  RunStep,
  runWorkflowTask,
} from "@/features/workflows/tasks/run-workflow"

type RealtimeRun = AnyTaskRealtimeRun<typeof runWorkflowTask>

// The run types the API client is typed by, read back off the task's run shape.
type WorkflowRunTypes = Pick<RealtimeRun, "taskIdentifier" | "payload"> & {
  output: NonNullable<RealtimeRun["output"]>
}

// One run of this workflow, flattened to what the canvas and console read.
export type WorkflowRun = Pick<
  RealtimeRun,
  "id" | "status" | "createdAt" | "startedAt" | "finishedAt"
> & {
  // Still queued or executing.
  isLive: boolean
  steps: RunStep[]
  // The Browserbase session the run drove, for replaying its recording. Set
  // only once the run has finished successfully and a step opened a browser.
  sessionId?: string
  // Why the run failed, when it failed outside a step (e.g. a cycle in the graph).
  error?: string
}

const WorkflowRunsContext = createContext<WorkflowRun[] | null>(null)

// A finished run's output is authoritative; until then the live metadata is all
// there is.
function toWorkflowRun(run: RealtimeRun): WorkflowRun {
  return {
    id: run.id,
    status: run.status,
    createdAt: run.createdAt,
    startedAt: run.startedAt,
    finishedAt: run.finishedAt,
    isLive: run.isQueued || run.isExecuting,
    steps:
      run.output?.steps ?? (run.metadata?.steps as RunStep[] | undefined) ?? [],
    sessionId: run.output?.sessionId,
    error: run.error?.message,
  }
}

// One realtime subscription to every run of this workflow (tagged
// `workflow:<id>` when triggered), shared by everything on the canvas.
//
// Subscribes directly rather than through useRealtimeRunsWithTag: that hook
// merges each update into a copy of its runs that only catches up after a
// render, so a burst of updates (the initial snapshot of several runs arrives
// within milliseconds) keeps only the last run it saw.
export function WorkflowRunsProvider({
  workflowId,
  accessToken,
  children,
}: {
  workflowId: string
  accessToken: string
  children: ReactNode
}) {
  const tag = `workflow:${workflowId}`
  const apiClient = useApiClient({ accessToken })
  const [runsById, setRunsById] = useState<ReadonlyMap<string, RealtimeRun>>(
    () => new Map()
  )

  // An effect event because useApiClient hands back a new client every render;
  // the subscription only needs to restart when the tag or token changes.
  const subscribe = useEffectEvent(async (signal: AbortSignal) => {
    if (!apiClient) return
    const subscription = apiClient.subscribeToRunsWithTag<WorkflowRunTypes>(
      tag,
      { skipColumns: ["payload"] },
      { signal }
    )
    for await (const run of subscription) {
      // Functional update, so every run in a burst lands on the latest map.
      setRunsById((current) => new Map(current).set(run.id, run))
    }
  })

  useEffect(() => {
    const controller = new AbortController()
    subscribe(controller.signal).catch((error: unknown) => {
      if (controller.signal.aborted) return
      console.error("Workflow runs subscription failed", error)
    })
    return () => controller.abort()
  }, [tag, accessToken])

  // Newest first.
  const workflowRuns = useMemo(
    () =>
      Array.from(runsById.values(), toWorkflowRun).sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
      ),
    [runsById]
  )

  return (
    <WorkflowRunsContext.Provider value={workflowRuns}>
      {children}
    </WorkflowRunsContext.Provider>
  )
}

// Every run of this workflow with its steps, newest first.
export function useWorkflowRuns(): WorkflowRun[] {
  const runs = useContext(WorkflowRunsContext)
  if (!runs) {
    throw new Error("useWorkflowRuns must be used within WorkflowRunsProvider")
  }
  return runs
}

// The most recent run's steps, and whether that run is still queued or
// executing.
export function useLatestRunSteps(): { steps: RunStep[]; isLive: boolean } {
  const [latest] = useWorkflowRuns()
  return useMemo(
    () => ({ steps: latest?.steps ?? [], isLive: latest?.isLive ?? false }),
    [latest]
  )
}
