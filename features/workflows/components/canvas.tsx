"use client"

import { useCallback, useState, useSyncExternalStore } from "react"
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Controls,
  ReactFlow,
  ConnectionLineType,
  type Edge,
  type OnConnect,
  type OnEdgesChange,
  type OnNodesChange,
  NodeTypes,
} from "@xyflow/react"
import { useTheme } from "next-themes"

import { StepNode } from "@/features/workflows/components/step-node"
import type { StepNodeType } from "@/features/workflows/nodes/node-registry"

import "@xyflow/react/dist/style.css"

const nodeTypes: NodeTypes = { step: StepNode }

const initialNodes: StepNodeType[] = [
  {
    id: "start",
    type: "step",
    position: { x: 0, y: 0 },
    data: { type: "start", kind: "trigger", title: "Start", values: {} },
  },
]

const initialEdges: Edge[] = []

const subscribe = () => () => {}

export function Canvas() {
  const { resolvedTheme } = useTheme()
  // false on the server and during hydration, true once mounted on the client
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  )
  const [nodes, setNodes] = useState(initialNodes)
  const [edges, setEdges] = useState(initialEdges)

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => setNodes((snapshot) => applyNodeChanges(changes, snapshot)),
    []
  )
  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => setEdges((snapshot) => applyEdgeChanges(changes, snapshot)),
    []
  )
  const onConnect: OnConnect = useCallback(
    (params) => setEdges((snapshot) => addEdge(params, snapshot)),
    []
  )

  return (
    <div className="size-full">
      <ReactFlow
      nodeTypes={nodeTypes}
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        colorMode={mounted && resolvedTheme === "dark" ? "dark" : "light"}
        fitView
        connectionLineType={ConnectionLineType.SmoothStep}
        connectionLineStyle={{ stroke: "var(--border)" }}
        defaultEdgeOptions={{
          type: "smoothstep",
          style: { stroke: "var(--border)" },
        }}
        style={
          {
            "--xy-background-color": "var(--background)",
            "--xy-edge-stroke-width": 2,
            "--xy-connectionline-stroke-width": 2,
          } as React.CSSProperties
        }
        maxZoom={1}
      >
        <Controls />
      </ReactFlow>
    </div>
  )
}
