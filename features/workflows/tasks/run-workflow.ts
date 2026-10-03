import toposort from "toposort"
import { logger, metadata, task } from "@trigger.dev/sdk"
import { Stagehand } from "@browserbasehq/stagehand"
import { nodeExecutors } from "@/features/workflows/nodes/node-executors"
import {
  interpolate,
  type NodeOutputs,
} from "@/features/workflows/lib/interpolate"
import { getWorkflow } from "@/features/workflows/data"

// One entry per node the run will execute, published to the run's metadata under
// "steps" so the canvas can show each node's live status.
export type RunStep = {
  nodeId: string
  status: "pending" | "running" | "done" | "failed"
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

    // Every step starts pending and is re-published on each status change.
    const steps: RunStep[] = order.map((nodeId) => ({
      nodeId,
      status: "pending",
    }))
    const publishSteps = () =>
      metadata.set(
        "steps",
        steps.map((step) => ({ ...step }))
      )
    const setStatus = (index: number, status: RunStep["status"]) => {
      steps[index] = { ...steps[index], status }
      publishSteps()
    }
    publishSteps()

    // The run owns one Browserbase session, opened lazily on the first browser step
    // and reused by every later one, so the recording spans the whole flow.
    // Stagehand reads the Gemini key from GEMINI_API_KEY (or
    // GOOGLE_GENERATIVE_AI_API_KEY).
    let stagehand: Stagehand | undefined
    const getStagehand = async () => {
      if (stagehand) return stagehand
      const instance = new Stagehand({
        env: "BROWSERBASE",
        apiKey: process.env.BROWSERBASE_API_KEY!,
        model: "google/gemini-2.5-flash",
      })
      await instance.init()
      stagehand = instance
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
          setStatus(index, "done")
          continue
        }

        // Flush now: otherwise "done" overwrites "running" before the
        // background flush ever pushes it, and the canvas never shows a spinner.
        setStatus(index, "running")
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
          setStatus(index, "failed")
          await metadata.flush()
          throw error
        }
        setStatus(index, "done")
      }
    } finally {
      // Ends the Browserbase session too, even when a step throws, so it
      // doesn't linger.
      await stagehand?.close()
    }

    // Returned so a successful run's finished state is guaranteed, even if the
    // last background flush hasn't landed.
    return { steps }
  },
})
