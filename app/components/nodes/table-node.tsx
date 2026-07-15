import {
  Position,
  useEdges,
  useNodes,
  useReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react"
import { GripVerticalIcon, MinusIcon, PlusIcon, Trash2Icon } from "lucide-react"
import { useContext } from "react"
import { BaseHandle } from "~/components/base-handle"
import {
  BaseNode,
  BaseNodeContent,
  BaseNodeHeader,
  BaseNodeHeaderTitle,
} from "~/components/base-node"
import { Button } from "~/components/ui/button"
import { cn } from "~/lib/utils"
import { DragCandidateContext, LockedContext } from "./context"
import {
  getSeatId,
  MAX_SEAT_COUNT,
  MIN_SEAT_COUNT,
  parseSeatIndex,
  type SeatingChartNode,
  type TableNodeData,
} from "~/routes/classrooms/seating-chart.state"

export function TableNode({
  id,
  data,
}: NodeProps<Node<TableNodeData, "table">>) {
  const locked = useContext(LockedContext)
  const candidate = useContext(DragCandidateContext)
  const nodes = useNodes<SeatingChartNode>()
  const edges = useEdges()
  const { setNodes, setEdges, getEdges } = useReactFlow<SeatingChartNode, Edge>()

  const index = nodes
    .filter((n) => n.type === "table")
    .findIndex((n) => n.id === id)

  function adjustSeatCount(delta: number) {
    const currentCount = data.table.seat_count
    const newCount = Math.min(
      MAX_SEAT_COUNT,
      Math.max(MIN_SEAT_COUNT, currentCount + delta)
    )
    if (newCount === currentCount) {
      return
    }

    setNodes((nds) =>
      nds.map((n) =>
        n.id === id && n.type === "table"
          ? { ...n, data: { table: { ...n.data.table, seat_count: newCount } } }
          : n
      )
    )

    if (newCount < currentCount) {
      const orphanedStudentIds = new Set(
        getEdges()
          .filter((e) => e.source === id && parseSeatIndex(e.sourceHandle) >= newCount)
          .map((e) => e.target)
      )
      setEdges((eds) =>
        eds.filter(
          (e) => !(e.source === id && parseSeatIndex(e.sourceHandle) >= newCount)
        )
      )
      setNodes((nds) =>
        nds.filter((n) => !(n.type === "student" && orphanedStudentIds.has(n.id)))
      )
    }
  }

  function handleRemoveTable() {
    const connectedStudentIds = new Set(
      getEdges()
        .filter((e) => e.source === id)
        .map((e) => e.target)
    )
    setNodes((nds) =>
      nds.filter(
        (n) => n.id !== id && !(n.type === "student" && connectedStudentIds.has(n.id))
      )
    )
    setEdges((eds) => eds.filter((e) => e.source !== id))
  }

  return (
    <BaseNode className="w-fit cursor-grab touch-none select-none active:cursor-grabbing">
      <BaseNodeHeader className="h-12">
        <BaseNodeHeaderTitle className="flex items-center gap-1.5">
          <GripVerticalIcon className="size-4 text-muted-foreground" />
          Table {index + 1}
        </BaseNodeHeaderTitle>
        {!locked ? (
          <div className="nodrag flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="icon-xs"
              onClick={() => adjustSeatCount(-1)}
            >
              <MinusIcon />
            </Button>
            <span className="w-4 text-center text-xs tabular-nums">
              {data.table.seat_count}
            </span>
            <Button
              type="button"
              variant="outline"
              size="icon-xs"
              onClick={() => adjustSeatCount(1)}
            >
              <PlusIcon />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={handleRemoveTable}
            >
              <Trash2Icon />
            </Button>
          </div>
        ) : null}
      </BaseNodeHeader>
      <BaseNodeContent>
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: data.table.seat_count }, (_, seatIndex) => {
            const seatId = getSeatId(id, seatIndex)
            const occupied = edges.some(
              (e) => e.source === id && e.sourceHandle === seatId
            )
            const highlighted =
              candidate?.tableId === id && candidate.seatIndex === seatIndex
            const side = seatIndex % 2 === 0 ? Position.Left : Position.Right

            return (
              <div
                key={seatIndex}
                className={cn(
                  "relative flex size-24 items-center justify-center rounded-lg text-xs text-muted-foreground transition-colors",
                  !occupied && "border border-dashed",
                  highlighted && "border border-primary bg-primary/10"
                )}
              >
                <BaseHandle type="target" position={side} id={seatId} />
                {!occupied ? "Empty" : null}
              </div>
            )
          })}
        </div>
      </BaseNodeContent>
    </BaseNode>
  )
}
