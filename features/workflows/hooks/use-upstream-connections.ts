import { useMemo } from "react"
import { useNodesData, useStore, type Edge } from "@xyflow/react"

import {
  nodeRegistry,
  type NodeType,
  type StepNodeType,
} from "@/features/workflows/nodes/node-registry"

// One output a node upstream of the selection produces, ready to drop into a
// field as a `{{ nodeId.path }}` placeholder (see lib/interpolate).
export type UpstreamConnection = {
  token: string
  label: string // e.g. "Open URL 1 · Title"
  type: NodeType // the source node's type, for its icon
}

// Every node that can reach `nodeId` by following edges backwards — parents,
// their parents, and so on. Breadth-first, so the nearest nodes come first.
function collectUpstreamIds(nodeId: string, edges: Edge[]): string[] {
  const seen = new Set<string>([nodeId])
  const queue = [nodeId]
  const ids: string[] = []

  while (queue.length) {
    const target = queue.shift()!
    for (const edge of edges) {
      if (edge.target !== target || seen.has(edge.source)) continue
      seen.add(edge.source)
      ids.push(edge.source)
      queue.push(edge.source)
    }
  }

  return ids
}

const sameIds = (a: string[], b: string[]) =>
  a.length === b.length && a.every((id, i) => id === b[i])

// The outputs of every node upstream of `nodeId`, for the field-insert picker.
// Re-computes as edges are connected or removed, and as upstream nodes are
// retitled — but not when nodes are dragged around.
export function useUpstreamConnections(
  nodeId: string | undefined
): UpstreamConnection[] {
  const upstreamIds = useStore(
    (s) => (nodeId ? collectUpstreamIds(nodeId, s.edges) : []),
    sameIds
  )
  const upstream = useNodesData<StepNodeType>(upstreamIds)

  return useMemo(
    () =>
      upstream.flatMap(({ id, data }) =>
        nodeRegistry[data.type].outputs.map((output) => ({
          token: `{{ ${id}.${output.path} }}`,
          label: `${data.title} · ${output.label}`,
          type: data.type,
        }))
      ),
    [upstream]
  )
}
