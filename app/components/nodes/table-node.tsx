import { useReactFlow, type Node, type NodeProps } from "@xyflow/react"
import { GripVerticalIcon, Trash2Icon } from "lucide-react"
import { useContext } from "react"
import { BaseNode, BaseNodeContent } from "~/components/base-node"
import { Button } from "~/components/ui/button"
import {
  TABLE_NODE_SIZE,
  type SeatingChartNode,
  type TableNodeData,
} from "~/lib/seating-chart-utils"
import { LockedContext } from "./context"

export function TableNode({
  id,
  data,
  selected,
}: NodeProps<Node<TableNodeData, "table">>) {
  const locked = useContext(LockedContext)
  const { setNodes } = useReactFlow<SeatingChartNode>()

  const showSelectedUi = !!selected && !locked

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
    <div>
      <BaseNode style={{ width: TABLE_NODE_SIZE, height: TABLE_NODE_SIZE }}>
        <BaseNodeContent>
          <div className="absolute -top-5 left-0 flex items-center text-xs">
            <GripVerticalIcon size={11} />
            <span>Table {data.table_number + 1}</span>
          </div>
          {showSelectedUi ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className="nodrag absolute -top-6 -right-1 z-10"
              onClick={handleRemoveTable}
            >
              <Trash2Icon />
            </Button>
          ) : null}
        </BaseNodeContent>
      </BaseNode>
    </div>
  )
}
