import {
  Position,
  useNodes,
  useReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react"
import { Trash2Icon } from "lucide-react"
import { useContext } from "react"
import { BaseHandle } from "~/components/base-handle"
import { BaseNode } from "~/components/base-node"
import { Button } from "~/components/ui/button"
import {
  getCanonicalSeatOrder,
  getSeatHandleId,
  getSeatsPerSide,
  MIN_TABLE_SIZE,
  type SeatingChartNode,
  type TableNodeData,
} from "~/routes/classrooms/seating-chart.state"
import { LockedContext } from "./context"

const SIDE_TO_POSITION = {
  top: Position.Top,
  right: Position.Right,
  bottom: Position.Bottom,
  left: Position.Left,
} as const

export function TableNode({
  id,
  selected,
  width,
  height,
}: NodeProps<Node<TableNodeData, "table">>) {
  const locked = useContext(LockedContext)
  const nodes = useNodes<SeatingChartNode>()
  const { setNodes, setEdges, getEdges } = useReactFlow<
    SeatingChartNode,
    Edge
  >()

  const index = nodes
    .filter((n) => n.type === "table")
    .findIndex((n) => n.id === id)

  const showSelectedUi = !!selected && !locked
  const w = width ?? MIN_TABLE_SIZE
  const h = height ?? MIN_TABLE_SIZE
  const { seatsPerRow, seatsPerCol } = getSeatsPerSide(w, h)
  const seatOrder = getCanonicalSeatOrder(seatsPerRow, seatsPerCol)

  function handleRemoveTable() {
    const connectedStudentIds = new Set(
      getEdges()
        .filter((e) => e.source === id)
        .map((e) => e.target)
    )
    setNodes((nds) =>
      nds.filter(
        (n) =>
          n.id !== id &&
          !(n.type === "student" && connectedStudentIds.has(n.id))
      )
    )
    setEdges((eds) => eds.filter((e) => e.source !== id))
  }

  return (
    <BaseNode
      style={{ width: w, height: h }}
      className="cursor-grab touch-none select-none active:cursor-grabbing"
    >
      {seatOrder.map(({ side, indexInSide }) => {
        const handleId = getSeatHandleId(id, side, indexInSide)
        return (
          <BaseHandle
            key={handleId}
            type="source"
            position={SIDE_TO_POSITION[side]}
            id={handleId}
          />
        )
      })}

      <div className="flex h-full items-center justify-center text-sm font-medium">
        Table {index + 1}
      </div>

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
