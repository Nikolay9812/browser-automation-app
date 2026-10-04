"use client"

import { useRef, useState, useTransition } from "react"
import { useReactFlow, useStore } from "@xyflow/react"
import { Lock, MoreHorizontal, Play, Trash2 } from "lucide-react"
import { toast } from "sonner"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ResizablePanel } from "@/components/ui/resizable"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

import { deleteWorkflowAction, runWorkflowAction } from "@/features/workflows/actions"
import { NodeIcon } from "@/features/workflows/components/node-icon"
import { useProPlan } from "@/features/workflows/hooks/use-pro-plan"
import {
  useUpstreamConnections,
  type UpstreamConnection,
} from "@/features/workflows/hooks/use-upstream-connections"
import { validateGraph } from "@/features/workflows/lib/validate-graph"
import {
  nodeRegistry,
  type NodeDefinition,
  type NodeField,
  type NodeType,
  type StepNodeKind,
  type StepNodeType,
} from "@/features/workflows/nodes/node-registry"

// This file builds up to the RightSidebar component exported at the bottom: a
// header with workflow actions (delete, run), then two tabs — a Toolbar for
// adding nodes and an Editor for tweaking the selected node. Each helper below is
// defined just above the block that uses it.

// ---------------------------------------------------------------------------
// Shared pieces — used by both the Toolbar and the Editor.
// ---------------------------------------------------------------------------

// A titled, scrollable panel. Each tab renders its content inside one.
function Section({
  title,
  icon,
  children,
}: {
  title: string
  icon?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-2 border-y border-border bg-card px-3 py-1.5 text-sm font-semibold">
        {icon}
        {title}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Editor tab — edits the fields of the selected node.
// ---------------------------------------------------------------------------

type FieldElement = HTMLInputElement | HTMLTextAreaElement

// A single editor field for a node property. Renders a multi-line textarea when
// the field opts in via `multiline`, otherwise a single-line input. `onSelect`
// reports every caret move so the Inspector knows where to insert tokens.
function Field({
  field,
  value,
  onChange,
  onSelect,
  ref,
}: {
  field: NodeField
  value: string
  onChange: (value: string) => void
  onSelect: (el: FieldElement) => void
  ref: (el: FieldElement | null) => void
}) {
  if (field.multiline) {
    return (
      <Textarea
        ref={ref}
        id={field.key}
        value={value}
        placeholder={field.placeholder}
        onChange={(e) => onChange(e.target.value)}
        onSelect={(e) => onSelect(e.currentTarget)}
      />
    )
  }

  return (
    <Input
      ref={ref}
      id={field.key}
      value={value}
      placeholder={field.placeholder}
      onChange={(e) => onChange(e.target.value)}
      onSelect={(e) => onSelect(e.currentTarget)}
    />
  )
}

// Upstream outputs as clickable chips. Clicking one inserts its token into a
// field; mousedown is swallowed so the field being edited keeps focus.
function Connections({
  connections,
  onInsert,
}: {
  connections: UpstreamConnection[]
  onInsert: (token: string) => void
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs">Connections</Label>
      <div className="flex flex-wrap gap-1.5">
        {connections.map((c) => (
          <button
            key={c.token}
            type="button"
            title={c.token}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onInsert(c.token)}
            className="flex items-center gap-1.5 rounded-md border border-border bg-card py-0.5 pr-2 pl-0.5 text-xs transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <NodeIcon type={c.type} className="size-4 rounded-sm [&_svg]:size-2.5" />
            {c.label}
          </button>
        ))}
      </div>
    </div>
  )
}

// The Editor tab: one input per field on the selected node, or an empty state.
// Mounted per node (keyed by id), so the last-edited field resets on reselect.
function Inspector({ node }: { node: StepNodeType | undefined }) {
  const { updateNodeData } = useReactFlow<StepNodeType>()
  const connections = useUpstreamConnections(node?.id)
  // The last-edited field and its caret. Refs, since moving the caret
  // shouldn't re-render.
  const fieldRefs = useRef<Record<string, FieldElement | null>>({})
  const caret = useRef<{ key: string; start: number; end: number } | null>(null)

  if (!node) {
    return (
      <Section title="Editor">
        <p className="p-3 text-sm text-muted-foreground">No node selected</p>
      </Section>
    )
  }

  const { type, title, values } = node.data
  const def: NodeDefinition = nodeRegistry[type]

  // Put `token` at the caret of the last-edited field, replacing any selected
  // text — or at the end of the first field if none has been touched yet.
  const insert = (token: string) => {
    const key = caret.current?.key ?? def.fields[0].key
    const current = values[key] ?? ""
    const start = caret.current?.start ?? current.length
    const end = caret.current?.end ?? current.length
    const at = start + token.length

    updateNodeData(node.id, {
      values: {
        ...values,
        [key]: current.slice(0, start) + token + current.slice(end),
      },
    })
    caret.current = { key, start: at, end: at }

    // Once the new value renders, return focus with the caret after the token.
    requestAnimationFrame(() => {
      const el = fieldRefs.current[key]
      el?.focus()
      el?.setSelectionRange(at, at)
    })
  }

  return (
    <Section title={title} icon={<NodeIcon type={type} />}>
      <div className="flex flex-col gap-3 p-3">
        {def.fields.length === 0 ? (
          <p className="text-xs text-muted-foreground">No properties</p>
        ) : (
          def.fields.map((field) => (
            <div key={field.key} className="flex flex-col gap-1.5">
              <Label htmlFor={field.key} className="text-xs">
                {field.label}
                {field.required && <span className="text-destructive">*</span>}
              </Label>
              <Field
                ref={(el) => {
                  fieldRefs.current[field.key] = el
                }}
                field={field}
                value={values[field.key] ?? ""}
                onChange={(value) => {
                  updateNodeData(node.id, {
                    values: { ...values, [field.key]: value },
                  })
                }}
                onSelect={(el) => {
                  caret.current = {
                    key: field.key,
                    start: el.selectionStart ?? 0,
                    end: el.selectionEnd ?? 0,
                  }
                }}
              />
            </div>
          ))
        )}
        {connections.length > 0 && def.fields.length > 0 && (
          <Connections connections={connections} onInsert={insert} />
        )}
      </div>
    </Section>
  )
}

// ---------------------------------------------------------------------------
// Toolbar tab — adds nodes to the canvas, grouped by kind.
// ---------------------------------------------------------------------------

// The Toolbar's groups, one accordion section per node kind.
const sections: { kind: StepNodeKind; label: string }[] = [
  { kind: "trigger", label: "Triggers" },
  { kind: "action", label: "Actions" },
]

// Every node type from the registry, filtered into the groups below.
const definitions: NodeDefinition[] = Object.values(nodeRegistry)

// The Toolbar tab: a button per node type that adds it to the canvas. Premium
// nodes are locked for orgs without Pro — clicking one goes to upgrade instead.
function Palette() {
  // The shared React Flow store (lifted to a provider above the canvas and this
  // sidebar) lets us read the current nodes/viewport and add to them from here.
  const { getNodes, getViewport, addNodes } = useReactFlow<StepNodeType>()
  const { isLoaded, isPro, upgrade } = useProPlan()
  // The pane's measured size, used to find the center of the current view.
  const width = useStore((s) => s.width)
  const height = useStore((s) => s.height)

  const add = (type: NodeType) => {
    const def = nodeRegistry[type]
    const nodes = getNodes()

    // Only one trigger is allowed — a workflow has a single entry point.
    if (def.kind === "trigger" && nodes.some((n) => n.data.kind === "trigger")) {
      toast.error("A workflow can only have one trigger.")
      return
    }

    // Number nodes of the same type (e.g. "Open URL 1", "Open URL 2") so
    // duplicates stay easy to tell apart.
    const count = nodes.filter((n) => n.data.type === type).length
    const title = `${def.label} ${count + 1}`

    // Drop the node in the middle of the current view. The viewport transform
    // maps a flow point p to the screen as p * zoom + {x, y}, so the pane center
    // in flow coordinates is (center - offset) / zoom.
    const { x, y, zoom } = getViewport()
    const position = {
      x: (width / 2 - x) / zoom,
      y: (height / 2 - y) / zoom,
    }

    addNodes({
      id: crypto.randomUUID(),
      type: "step",
      position,
      data: { type, kind: def.kind, title, values: {} },
    })
  }

  return (
    <Section title="Toolbar">
      <Accordion
        type="multiple"
        defaultValue={sections.map((s) => s.kind)}
        className="px-3 py-2"
      >
        {sections.map((section) => (
          <AccordionItem
            key={section.kind}
            value={section.kind}
            className="not-last:border-b-0"
          >
            <AccordionTrigger className="py-2 text-xs font-medium text-muted-foreground hover:no-underline">
              {section.label}
            </AccordionTrigger>
            <AccordionContent className="flex flex-col gap-0.5">
              {definitions
                .filter((def) => def.kind === section.kind)
                .map((def) => {
                  // Held as disabled, not locked, until Clerk loads, so Pro
                  // orgs don't see the lock flash on.
                  const locked = def.premium && isLoaded && !isPro
                  return (
                    <Button
                      key={def.type}
                      variant="ghost"
                      disabled={def.premium && !isLoaded}
                      title={locked ? "Upgrade to Pro to use this node" : undefined}
                      onClick={() => (locked ? upgrade() : add(def.type as NodeType))}
                      className="justify-start gap-2.5 px-1.5 text-xs"
                    >
                      <NodeIcon type={def.type as NodeType} />
                      <span className={cn(locked && "text-muted-foreground")}>
                        {def.label}
                      </span>
                      {locked && (
                        <span className="ml-auto flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
                          <Lock className="size-3" />
                          Pro
                        </span>
                      )}
                    </Button>
                  )
                })}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </Section>
  )
}

// ---------------------------------------------------------------------------
// Header — workflow-level actions shown above the tabs.
// ---------------------------------------------------------------------------

// The "..." menu for workflow-level actions.
function ActionsMenu({ workflowId }: { workflowId: string }) {
  const [isPending, startTransition] = useTransition()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="icon" variant="ghost">
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-48">
        <DropdownMenuItem
          variant="destructive"
          disabled={isPending}
          className="text-xs [&_svg:not([class*='size-'])]:size-3.5"
          onSelect={(e) => {
            // Keep the menu mounted while the delete runs so the disabled state
            // stays visible. Running inside a transition lets the router handle
            // the action's redirect home on success.
            e.preventDefault()
            startTransition(async () => {
              await deleteWorkflowAction(workflowId)
            })
          }}
        >
          <Trash2 />
          Delete workflow
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Kicks off a run of the current workflow.
function RunButton({ workflowId }: { workflowId: string }) {
  const { getNodes, getEdges } = useReactFlow<StepNodeType>()
  const [isPending, startTransition] = useTransition()

  return (
    <Button
      size="sm"
      variant="secondary"
      disabled={isPending}
      onClick={() => {
        // TODO: validate the graph and run the workflow (toggle to Stop while running).
        const graph = { nodes: getNodes(), edges: getEdges() }
        const problems = validateGraph(graph)
        if (problems.length > 0) {
          toast.error(problems[0])
          return
        }

        startTransition(async () => {
          await runWorkflowAction({ id: workflowId, graph })
        })
      }}
    >
      <Play fill="primary" />
      Run
    </Button>
  )
}

// ---------------------------------------------------------------------------
// The sidebar itself — header on top, then the Toolbar / Editor tabs.
// ---------------------------------------------------------------------------

export function RightSidebar({ workflowId }: { workflowId: string }) {
  const [tab, setTab] = useState("toolbar")

  // TODO: read the currently selected node from React Flow.
  const selected = useStore((s) => s.nodes.find((n) => n.selected)) as StepNodeType | undefined

  // TODO: auto-switch to the Editor tab when the selection changes.
  const [prevSelectedId, setPrevSelectedId] = useState(selected?.id)
  if (selected && selected.id !== prevSelectedId) {
    setPrevSelectedId(selected.id)
    setTab("editor")
  }

  return (
    <ResizablePanel
      className="bg-background"
      defaultSize="16rem"
      minSize="14rem"
      maxSize="36rem"
      groupResizeBehavior="preserve-pixel-size"
    >
      <Tabs value={tab} onValueChange={setTab} className="size-full gap-0">
        <div className="flex items-center justify-between border-b border-border p-2">
          <ActionsMenu workflowId={workflowId} />
          <RunButton workflowId={workflowId} />
        </div>
        <TabsList className="m-2 w-fit bg-background">
          <TabsTrigger
            value="toolbar"
            className="flex-none rounded-sm data-active:bg-accent! data-active:text-accent-foreground! data-active:shadow-none! dark:data-active:border-transparent!"
          >
            Toolbar
          </TabsTrigger>
          <TabsTrigger
            value="editor"
            className="flex-none rounded-sm data-active:bg-accent! data-active:text-accent-foreground! data-active:shadow-none! dark:data-active:border-transparent!"
          >
            Editor
          </TabsTrigger>
        </TabsList>
        <TabsContent value="toolbar" className="flex min-h-0 flex-col">
          <Palette />
        </TabsContent>
        <TabsContent value="editor" className="flex min-h-0 flex-col">
          <Inspector key={selected?.id} node={selected} />
        </TabsContent>
      </Tabs>
    </ResizablePanel>
  )
}