import {
  useReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react"
import { Trash2Icon } from "lucide-react"
import { useContext } from "react"
import { Button } from "~/components/ui/button"
import { Item } from "~/components/ui/item"
import type {
  SeatingChartNode,
  StudentNodeData,
} from "~/routes/classrooms/seating-chart.state"
import { LockedContext } from "./context"
import { StudentCardContent } from "./student-card-content"

export function StudentNode({
  id,
  data,
}: NodeProps<Node<StudentNodeData, "student">>) {
  const locked = useContext(LockedContext)
  const { setNodes, setEdges } = useReactFlow<SeatingChartNode, Edge>()

  function handleDelete() {
    setNodes((nds) => nds.filter((n) => n.id !== id))
    setEdges((eds) => eds.filter((e) => e.target !== id))
  }

  return (
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
  )
}
