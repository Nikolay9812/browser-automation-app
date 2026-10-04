import toposort from "toposort"
import { logger, metadata, task } from "@trigger.dev/sdk"
import { Stagehand } from "@browserbasehq/stagehand"
import { nodeExecutors } from "@/features/workflows/nodes/node-executors"
import {
  interpolate,
  type NodeOutputs,
} from "@/features/workflows/lib/interpolate"
import { getWorkflow } from "@/features/workflows/data"
import type { NodeType } from "@/features/workflows/nodes/node-registry"

// Plain JSON, the only shape run metadata can carry.
export type Json =
  string | number | boolean | null | Json[] | { [key: string]: Json }

// One entry per node the run will execute, published to the run's metadata under
// "steps" so the canvas can show each node's live status and the console can show
// what each step did. The node's type and title are snapshotted so past runs still
// render after the node is renamed or deleted.
export type RunStep = {
  nodeId: string
  nodeType: NodeType
  title: string
  status: "pending" | "running" | "done" | "failed"
  // Epoch ms, set when the step starts running.
  startedAt?: number
  // Set once the step finishes, whether done or failed.
  durationMs?: number
  // What the executor returned, as JSON, set when the step is done.
  output?: Json
  // True when the output was too large for run metadata, in which case `output`
  // holds its clipped JSON string instead of the real value.
  outputTruncated?: boolean
  // The thrown error's message, set when the step failed.
  error?: string
}

// Run metadata is capped at 256KB and the SDK throws past it, so one oversized
// output must not take down the whole run.
const MAX_OUTPUT_CHARS = 16_000

// Round-trips the output through JSON so the step holds exactly what the console
// will receive, clipping it when it's too big to publish.
function toStepOutput(
  output: unknown
): Pick<RunStep, "output" | "outputTruncated"> {
  const json = JSON.stringify(output)
  if (json === undefined) return {}
  if (json.length > MAX_OUTPUT_CHARS) {
    return { output: json.slice(0, MAX_OUTPUT_CHARS), outputTruncated: true }
  }
  return { output: JSON.parse(json) as Json }
}

// The Trigger.dev task the Run button fires. It loads the saved graph, works out
// what order the nodes should run in, and walks them. For now each node just
// announces itself — real execution (per-node executors, live progress, browser
// sessions) gets layered on from here.
export const runWorkflowTask = task({
  id: "run-workflow",
  run: async ({ workflowId, orgId }: { workflowId: string; orgId: string }) => {
    const workflow = await getWorkflow(orgId, workflowId)
    if (!workflow?.graph) throw new Error(`Workflow ${workflowId} has no graph`)

    const { nodes, edges } = workflow.graph
    const byId = new Map(nodes.map((n) => [n.id, n]))

    // Run only connected nodes — anything touching an edge. Orphans dropped on
    // the canvas are skipped. toposort orders them and throws on a cycle.
    const connected = new Set(edges.flatMap((e) => [e.source, e.target]))
    const order = toposort
      .array(
        nodes.map((n) => n.id),
        edges.map((e) => [e.source, e.target])
      )
      .filter((id) => connected.has(id))

    logger.log(`Running workflow ${workflow.name}`, { steps: order.length })

    // Every step starts pending and is re-published on each change.
    const steps: RunStep[] = order.map((nodeId) => {
      const { type, title } = byId.get(nodeId)!.data
      return { nodeId, nodeType: type, title, status: "pending" }
    })
    const publishSteps = () =>
      metadata.set(
        "steps",
        steps.map((step) => ({ ...step }))
      )
    const updateStep = (index: number, patch: Partial<RunStep>) => {
      steps[index] = { ...steps[index], ...patch }
      publishSteps()
    }
    publishSteps()

    // The run owns one Browserbase session, opened lazily on the first browser step
    // and reused by every later one, so the recording spans the whole flow.
    // Stagehand reads the Gemini key from GEMINI_API_KEY (or
    // GOOGLE_GENERATIVE_AI_API_KEY).
    let stagehand: Stagehand | undefined
    // The session's id, kept so the run's recording can be replayed. Unset when
    // no step needed a browser.
    let sessionId: string | undefined
    const getStagehand = async () => {
      if (stagehand) return stagehand
      const instance = new Stagehand({
        env: "BROWSERBASE",
        apiKey: process.env.BROWSERBASE_API_KEY!,
        model: "google/gemini-2.5-flash",
        // Tags the session with its org so the replay route can check who may
        // watch it.
        browserbaseSessionCreateParams: { userMetadata: { orgId } },
      })
      await instance.init()
      stagehand = instance
      sessionId = instance.browserbaseSessionID
      return stagehand
    }

    // Each node's result, keyed by its id. Nodes run in dependency order, so
    // anything a node references has already landed here by its turn.
    const outputs: NodeOutputs = {}

    try {
      for (const [index, id] of order.entries()) {
        const node = byId.get(id)!
        logger.log(`Running step: ${node.data.title}`)
        const executor = nodeExecutors[node.data.type]
        // Nothing to execute — mark it done rather than leaving it pending.
        if (!executor) {
          updateStep(index, {
            status: "done",
            startedAt: Date.now(),
            durationMs: 0,
          })
          continue
        }

        // Flush now: otherwise "done" overwrites "running" before the
        // background flush ever pushes it, and the canvas never shows a spinner.
        const startedAt = Date.now()
        updateStep(index, { status: "running", startedAt })
        await metadata.flush()

        try {
          // Fill `{{ nodeId.path }}` placeholders with upstream outputs.
          const values = Object.fromEntries(
            Object.entries(node.data.values).map(([key, text]) => [
              key,
              interpolate({ text, outputs }),
            ])
          )
          outputs[id] = await executor({ values, getStagehand })
        } catch (error) {
          // A thrown run returns no output, so the flushed metadata is the only
          // way the failed state reaches the canvas.
          updateStep(index, {
            status: "failed",
            durationMs: Date.now() - startedAt,
            error: error instanceof Error ? error.message : String(error),
          })
          await metadata.flush()
          throw error
        }
        updateStep(index, {
          status: "done",
          durationMs: Date.now() - startedAt,
          ...toStepOutput(outputs[id]),
        })
      }
    } finally {
      // Ends the Browserbase session too, even when a step throws, so it
      // doesn't linger.
      await stagehand?.close()
    }

    // Returned so a successful run's finished state is guaranteed, even if the
    // last background flush hasn't landed. The session id rides along here
    // rather than in metadata: its recording is only ready once the session has
    // closed.
    return { steps, sessionId }
  },
})
