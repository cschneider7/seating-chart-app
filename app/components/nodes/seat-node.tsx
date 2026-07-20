import type { Node, NodeProps } from "@xyflow/react"
import { BaseNode } from "~/components/base-node"
import { SEAT_NODE_SIZE, type SeatNodeData } from "~/lib/seating-chart-utils"

export function SeatNode({}: NodeProps<Node<SeatNodeData, "seat">>) {
  return (
    <BaseNode
      className="pointer-events-none border-dashed bg-muted/40 hover:ring-0"
      style={{ width: SEAT_NODE_SIZE, height: SEAT_NODE_SIZE }}
    />
  )
}
