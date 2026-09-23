"use client"

import { useState, useTransition } from "react"
import { useRealtimeRun } from "@trigger.dev/react-hooks"
import { PlayIcon } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { runWorkflowAction } from "@/feature/workflows/actions"
import type { helloWorldTask } from "@/trigger/example"

type RunHandle = Awaited<ReturnType<typeof runWorkflowAction>>

export function RightSidebar() {
  const [handle, setHandle] = useState<RunHandle | null>(null)
  const [isPending, startTransition] = useTransition()

  const { run, error } = useRealtimeRun<typeof helloWorldTask>(handle?.runId, {
    accessToken: handle?.publicAccessToken,
    enabled: !!handle,
    skipColumns: ["payload"],
    onComplete: (run, error) => {
      if (error || !run.isSuccess) {
        toast.error("Workflow run failed")
      } else {
        toast.success(run.output?.message ?? "Workflow run completed")
      }
    },
  })

  const isRunning = isPending || (!!handle && !run?.isCompleted && !error)

  const handleRun = () => {
    startTransition(async () => {
      setHandle(await runWorkflowAction())
    })
  }

  return (
    <div className="flex size-full flex-col gap-3 p-2">
      <Button onClick={handleRun} disabled={isRunning}>
        {isRunning ? <Spinner /> : <PlayIcon />}
        Run
      </Button>
      {handle && (
        <div className="flex flex-col gap-2 rounded-md border p-3 text-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">Status</span>
            <Badge
              variant={
                run?.isFailed ? "destructive" : run?.isSuccess ? "default" : "secondary"
              }
            >
              {run?.status ?? "PENDING"}
            </Badge>
          </div>
          <div className="truncate font-mono text-xs text-muted-foreground">
            {handle.runId}
          </div>
          {run?.output && <p>{run.output.message}</p>}
          {error && <p className="text-destructive">{error.message}</p>}
        </div>
      )}
    </div>
  )
}
