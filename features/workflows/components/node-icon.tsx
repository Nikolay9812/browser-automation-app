import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"

import {
  nodeRegistry,
  type NodeType,
} from "@/features/workflows/nodes/node-registry"

// The accent-colored icon chip, mirroring the node on the canvas. While
// `running`, a spinner takes the icon's place inside the chip.
export function NodeIcon({
  type,
  running = false,
  className,
}: {
  type: NodeType
  running?: boolean
  className?: string
}) {
  const def = nodeRegistry[type]
  const Icon = def.icon
  return (
    <span
      className={cn(
        "flex size-6 shrink-0 items-center justify-center rounded-md",
        def.accent,
        className
      )}
    >
      {running ? (
        <Spinner className="size-3.5" />
      ) : (
        <Icon className="size-3.5" />
      )}
    </span>
  )
}
