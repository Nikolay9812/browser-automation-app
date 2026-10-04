"use server"

import { auth } from "@clerk/nextjs/server"
import * as Sentry from "@sentry/nextjs"
import { runs, tasks } from "@trigger.dev/sdk"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import type { runWorkflowTask } from "@/features/workflows/tasks/run-workflow"

import { liveblocks } from "@/lib/liveblocks"
import {
  createWorkflow,
  deleteWorkflow,
  saveWorkflowGraph,
} from "@/features/workflows/data"
import { validateGraph } from "@/features/workflows/lib/validate-graph"
import {
  nodeRegistry,
  type NodeDefinition,
} from "@/features/workflows/nodes/node-registry"
import { WorkflowGraph } from "@/lib/db/schema"

export async function createWorkflowAction(name: string) {
  const { userId, orgId } = await auth()

  if (!orgId) {
    throw new Error("No active organization")
  }

  const workflow = await createWorkflow(orgId, name)

  Sentry.logger.info("Workflow created", {
    "workflow.id": workflow.id,
    "org.id": orgId,
    "user.id": userId ?? "unknown",
  })

  revalidatePath("/workflows", "layout")
  redirect(`/workflows/${workflow.id}`)
}

export async function deleteWorkflowAction(id: string) {
  const { userId, orgId } = await auth()

  if (!orgId) {
    throw new Error("No active organization")
  }

  const workflow = await deleteWorkflow(orgId, id)

  if (!workflow) {
    Sentry.logger.warn("Workflow delete found no workflow", {
      "workflow.id": id,
      "org.id": orgId,
    })
    throw new Error("Workflow not found")
  }

  // The workflow id doubles as its Liveblocks room id — clean it up too.
  await liveblocks.deleteRoom(id)

  Sentry.logger.info("Workflow deleted", {
    "workflow.id": id,
    "org.id": orgId,
    "user.id": userId ?? "unknown",
  })

  revalidatePath("/workflows", "layout")
  redirect("/")
}

export async function runWorkflowAction({
  id,
  graph,
}: {
  id: string
  graph: WorkflowGraph
}) {
  const { userId, orgId, has } = await auth()

  if (!orgId) {
    throw new Error("No active organization")
  }

  // Premium nodes (the Agent) need the Pro plan. The toolbar only hides them,
  // and a downgraded org can still have some on its canvas, so enforce it here
  // before the graph is saved for the run task. The task itself has no auth
  // context to check against. The `org:` scope matches only the org's plan.
  const usesPremium = graph.nodes.some((node) => {
    // The graph comes from the client, so its node types aren't guaranteed to
    // be in the registry.
    const def: NodeDefinition | undefined = nodeRegistry[node.data.type]
    return def?.premium
  })
  if (usesPremium && !has({ plan: "org:pro" })) {
    Sentry.logger.warn("Workflow run blocked: premium nodes without Pro plan", {
      "workflow.id": id,
      "org.id": orgId,
      "user.id": userId ?? "unknown",
    })
    throw new Error("Agent nodes require the Pro plan")
  }

  // The client validates before running, so a rejection here means the two
  // disagree or the request bypassed the UI. saveWorkflowGraph throws on it.
  const problems = validateGraph(graph)
  if (problems.length > 0) {
    Sentry.logger.warn("Workflow run rejected: invalid graph", {
      "workflow.id": id,
      "workflow.problem_count": problems.length,
      "workflow.first_problem": problems[0],
      "org.id": orgId,
    })
  }

  await saveWorkflowGraph({ orgId, id, graph })

  const handle = await tasks.trigger<typeof runWorkflowTask>(
    "run-workflow",
    {
      workflowId: id,
      orgId,
    },
    { tags: [`workflow:${id}`] }
  )

  Sentry.logger.info("Workflow run triggered", {
    "workflow.id": id,
    "workflow.run.id": handle.id,
    "workflow.node_count": graph.nodes.length,
    "workflow.edge_count": graph.edges.length,
    "workflow.uses_premium": usesPremium,
    "org.id": orgId,
    "user.id": userId ?? "unknown",
  })

  return handle
}

export async function cancelWorkflowRunAction(runId: string) {
  const { userId, orgId } = await auth()
  if (!orgId) throw new Error("No active organization")
  await runs.cancel(runId)

  Sentry.logger.info("Workflow run cancelled", {
    "workflow.run.id": runId,
    "org.id": orgId,
    "user.id": userId ?? "unknown",
  })
}
