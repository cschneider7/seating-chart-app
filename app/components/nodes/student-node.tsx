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
  SIDE_TO_POSITION,
  STUDENT_NODE_SIZE,
  type SeatingChartNode,
  type StudentNodeData,
} from "~/lib/seating-chart-utils"
import { BaseHandle } from "../base-handle"
import { BaseNode } from "../base-node"
import { LockedContext } from "./context"
import { StudentCardContent } from "./student-card-content"

export function StudentNode({
  id,
  data,
  selected,
}: NodeProps<Node<StudentNodeData, "student">>) {
  const locked = useContext(LockedContext)
  const { setNodes, setEdges } = useReactFlow<SeatingChartNode, Edge>()
  const edges = useEdges()

  const showSelectedUi = !!selected && !locked
  const connectedHandleId = edges.find(
    (e) => e.target === id && !e.hidden
  )?.targetHandle

  function handleDelete() {
    setNodes((nds) => nds.filter((n) => n.id !== id))
    setEdges((eds) => eds.filter((e) => e.target !== id))
  }

  return (
    <BaseNode
      style={{ width: STUDENT_NODE_SIZE, height: STUDENT_NODE_SIZE }}
      className="cursor-grab touch-none select-none active:cursor-grabbing"
    >
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
        size="xs"
        className="relative size-full gap-1 overflow-hidden p-1.5 **:data-[slot=item-title]:text-[10px]"
      >
        <StudentCardContent student={data.student} />
        {showSelectedUi ? (
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
