import { useReactFlow, type Node, type NodeProps } from "@xyflow/react"
import { Trash2Icon } from "lucide-react"
import { useContext } from "react"
import { BaseNode } from "~/components/base-node"
import { Button } from "~/components/ui/button"
import {
  MIN_TABLE_SIZE,
  type SeatingChartNode,
  type TableNodeData,
} from "~/lib/seating-chart-utils"
import { LockedContext } from "./context"

export function TableNode({
  id,
  selected,
  width,
  height,
}: NodeProps<Node<TableNodeData, "table">>) {
  const locked = useContext(LockedContext)
  const { setNodes } = useReactFlow<SeatingChartNode>()

  const showSelectedUi = !!selected && !locked
  const w = width ?? MIN_TABLE_SIZE
  const h = height ?? MIN_TABLE_SIZE

  function handleRemoveTable() {
    setNodes((nds) => {
      const seatIds = new Set(
        nds
          .filter((n) => n.type === "seat" && n.parentId === id)
          .map((n) => n.id)
      )
      return nds.filter((n) => {
        if (n.id === id) return false
        if (n.type === "seat" && n.parentId === id) return false
        if (n.type === "student" && n.parentId && seatIds.has(n.parentId))
          return false
        return true
      })
    })
  }

  return (
    <BaseNode
      style={{ width: w, height: h }}
      className="cursor-grab touch-none select-none active:cursor-grabbing"
    >
      {showSelectedUi ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="nodrag absolute -top-3 -right-3 z-10"
          onClick={handleRemoveTable}
        >
          <Trash2Icon />
        </Button>
      ) : null}
    </BaseNode>
  )
}
