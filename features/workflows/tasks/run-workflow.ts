import toposort from "toposort"
import { logger, task } from "@trigger.dev/sdk"
import {
  browserbase,
  Stagehand,
  type StagehandBrowser,
} from "@browserbasehq/stagehand"
import { nodeExecutors } from "@/features/workflows/nodes/node-executors"
import { interpolate, type NodeOutputs } from "@/features/workflows/lib/interpolate"
import { getWorkflow } from "@/features/workflows/data"

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

    // The run owns one Browserbase session, opened lazily on the first browser step
    // and reused by every later one, so the recording spans the whole flow. The
    // LLM routes through Browserbase's Model Gateway (BROWSERBASE_API_KEY), so no
    // separate provider key is needed.
    let browser: StagehandBrowser | undefined
    let stagehand: Stagehand | undefined
    const getStagehand = async () => {
      if (stagehand) return stagehand
      browser = await browserbase.launch({
        apiKey: process.env.BROWSERBASE_API_KEY!,
      })
      stagehand = await Stagehand.create({
        browser,
        model: { modelName: "google/gemini-2.5-flash" },
      })
      return stagehand
    }

    // Close Stagehand before its browser, even when a step throws, so the
    // Browserbase session doesn't linger.
    // Each node's result, keyed by its id. Nodes run in dependency order, so
    // anything a node references has already landed here by its turn.
    const outputs: NodeOutputs = {}

    try {
      for (const id of order) {
        const node = byId.get(id)!
        logger.log(`Running step: ${node.data.title}`)
        // TODO: report each node's progress so the UI can watch the run live.
        const executor = nodeExecutors[node.data.type]
        if (!executor) continue

        // Fill `{{ nodeId.path }}` placeholders with upstream outputs.
        const values = Object.fromEntries(
          Object.entries(node.data.values).map(([key, text]) => [
            key,
            interpolate({ text, outputs }),
          ])
        )
        outputs[id] = await executor({ values, getStagehand })
      }
    } finally {
      await stagehand?.close()
      await browser?.close()
    }

    return { steps: order.length }
  },
})