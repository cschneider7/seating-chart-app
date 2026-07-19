import { useReactFlow, type Node, type NodeProps } from "@xyflow/react"
import { Trash2Icon } from "lucide-react"
import { useContext } from "react"
import { Button } from "~/components/ui/button"
import { Item } from "~/components/ui/item"
import {
  STUDENT_NODE_SIZE,
  type SeatingChartNode,
  type StudentNodeData,
} from "~/lib/seating-chart-utils"
import { BaseNode } from "../base-node"
import { LockedContext } from "./context"
import { StudentCardContent } from "./student-card-content"

export function StudentNode({
  id,
  data,
  selected,
}: NodeProps<Node<StudentNodeData, "student">>) {
  const locked = useContext(LockedContext)
  const { setNodes } = useReactFlow<SeatingChartNode>()

  const showSelectedUi = !!selected && !locked

  function handleDelete() {
    setNodes((nds) => nds.filter((n) => n.id !== id))
  }

  return (
    <BaseNode
      style={{ width: STUDENT_NODE_SIZE, height: STUDENT_NODE_SIZE }}
      className="cursor-grab touch-none select-none active:cursor-grabbing"
    >
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
