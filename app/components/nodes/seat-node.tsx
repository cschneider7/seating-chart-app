import type { Node, NodeProps } from "@xyflow/react"
import { BaseNode } from "~/components/base-node"
import { STUDENT_NODE_SIZE, type SeatNodeData } from "~/lib/seating-chart-utils"

export function SeatNode({}: NodeProps<Node<SeatNodeData, "seat">>) {
  return (
    <BaseNode
      className="pointer-events-none border-dashed bg-muted/40 hover:ring-0"
      style={{ width: STUDENT_NODE_SIZE, height: STUDENT_NODE_SIZE }}
    />
  )
}
