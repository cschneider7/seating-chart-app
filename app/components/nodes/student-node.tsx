import {
  Position,
  useEdges,
  useReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react"
import { Trash2Icon } from "lucide-react"
import { useContext } from "react"
import { Button } from "~/components/ui/button"
import { Item } from "~/components/ui/item"
import {
  getStudentHandleId,
  type SeatingChartNode,
  type StudentNodeData,
} from "~/routes/classrooms/seating-chart.state"
import { BaseHandle } from "../base-handle"
import { BaseNode } from "../base-node"
import { LockedContext } from "./context"
import { StudentCardContent } from "./student-card-content"

const SIDE_TO_POSITION = {
  top: Position.Top,
  right: Position.Right,
  bottom: Position.Bottom,
  left: Position.Left,
} as const

export function StudentNode({
  id,
  data,
}: NodeProps<Node<StudentNodeData, "student">>) {
  const locked = useContext(LockedContext)
  const { setNodes, setEdges } = useReactFlow<SeatingChartNode, Edge>()
  const edges = useEdges()

  const connectedHandleId = edges.find(
    (e) => e.target === id && !e.hidden
  )?.targetHandle

  function handleDelete() {
    setNodes((nds) => nds.filter((n) => n.id !== id))
    setEdges((eds) => eds.filter((e) => e.target !== id))
  }

  return (
    <BaseNode className="cursor-grab touch-none select-none active:cursor-grabbing">
      {(["top", "right", "bottom", "left"] as const).map((side) => {
        const handleId = getStudentHandleId(id, side)
        if (connectedHandleId && handleId !== connectedHandleId) {
          return null
        }
        return (
          <BaseHandle
            key={side}
            id={handleId}
            type="target"
            position={SIDE_TO_POSITION[side]}
          />
        )
      })}
      <Item
        variant="outline"
        size="xs"
        className="relative aspect-square w-24 shrink-0 overflow-hidden"
      >
        <StudentCardContent student={data.student} />
        {!locked ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="absolute top-0.5 right-0.5"
            onClick={handleDelete}
          >
            <Trash2Icon />
          </Button>
        ) : null}
      </Item>
    </BaseNode>
  )
}
