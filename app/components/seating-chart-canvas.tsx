import {
  Background,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type OnNodeDrag,
  type OnNodesChange,
} from "@xyflow/react"
import React, {
  useCallback,
  useRef,
  type Dispatch,
  type SetStateAction,
} from "react"
import { LockedContext } from "~/components/nodes/context"
import { SeatNode } from "~/components/nodes/seat-node"
import { StudentCardContent } from "~/components/nodes/student-card-content"
import { StudentNode } from "~/components/nodes/student-node"
import { TableNode } from "~/components/nodes/table-node"
import { Empty, EmptyDescription } from "~/components/ui/empty"
import { Item } from "~/components/ui/item"
import { ScrollArea } from "~/components/ui/scroll-area"
import type { Student } from "~/lib/schemas"
import {
  GRID_STEP,
  reorderNodes,
  STUDENT_NODE_SIZE,
  type Point,
  type SeatingChartNode,
  type SeatingChartStudentNode,
} from "~/lib/seating-chart-utils"

const nodeTypes = { table: TableNode, seat: SeatNode, student: StudentNode }

const STUDENT_DATA_TRANSFER_TYPE = "application/x-student-id"

function StudentChip({
  student,
  locked,
}: {
  student: Student
  locked: boolean
}) {
  return (
    <Item
      variant="outline"
      size="xs"
      draggable={!locked}
      onDragStart={(e) => {
        e.dataTransfer.setData(STUDENT_DATA_TRANSFER_TYPE, student.id)
        e.dataTransfer.effectAllowed = "move"
      }}
      className="aspect-square w-24 shrink-0 overflow-hidden"
    >
      <StudentCardContent student={student} />
    </Item>
  )
}

export function RosterPanel({
  students,
  locked,
}: {
  students: Student[]
  locked: boolean
}) {
  return (
    <div className="h-full rounded-lg border p-1">
      <ScrollArea className="h-full">
        <div className="h-full min-h-0 w-45 shrink-0 p-3 transition-shadow">
          <h4 className="mb-4 text-sm leading-none font-medium">Unassigned</h4>
          <div className="flex flex-wrap justify-center gap-3">
            {students.length === 0 ? (
              <Empty className="gap-0 rounded-none border-none p-0">
                <EmptyDescription>Empty</EmptyDescription>
              </Empty>
            ) : (
              students.map((student) => (
                <StudentChip
                  key={student.id}
                  student={student}
                  locked={locked}
                />
              ))
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}

interface SeatingChartCanvasProps {
  nodes: SeatingChartNode[]
  onNodesChange: OnNodesChange<SeatingChartNode>
  setNodes: Dispatch<SetStateAction<SeatingChartNode[]>>
  locked: boolean
  studentsById: Map<string, Student>
}

type DragSnapshot = { parentId?: string; position: Point }

function SeatingChartCanvasInner({
  nodes,
  onNodesChange,
  setNodes,
  locked,
  studentsById,
}: SeatingChartCanvasProps) {
  const { getIntersectingNodes, getInternalNode, screenToFlowPosition } =
    useReactFlow<SeatingChartNode>()

  // Captures a dragged student's parentId/position before a drag
  const dragStartState = useRef(new Map<string, DragSnapshot>())

  const clearHighlights = useCallback(
    (nds: SeatingChartNode[]) =>
      nds.map((n) => (n.className ? { ...n, className: "" } : n)),
    []
  )

  const onNodeDragStart: OnNodeDrag<SeatingChartNode> = useCallback(
    (_, node) => {
      if (node.type !== "student") {
        return
      }
      dragStartState.current.set(node.id, {
        parentId: node.parentId,
        position: node.position,
      })
    },
    []
  )

  const onNodeDrag: OnNodeDrag<SeatingChartNode> = useCallback(
    (_, node) => {
      if (node.type !== "student") {
        return
      }

      const seatNode = getIntersectingNodes(node).find((n) => n.type === "seat")
      const occupied =
        !!seatNode &&
        nodes.some(
          (n) =>
            n.type === "student" &&
            n.parentId === seatNode.id &&
            n.id !== node.id
        )

      setNodes((nds) =>
        nds.map((n) => {
          const className =
            seatNode?.id !== n.id
              ? ""
              : occupied
                ? "highlight-rejected"
                : "highlight"
          return n.className === className ? n : { ...n, className }
        })
      )
    },
    [nodes, getIntersectingNodes, setNodes]
  )

  const onNodeDragStop: OnNodeDrag<SeatingChartNode> = useCallback(
    (_, node) => {
      if (node.type !== "student") {
        return
      }

      const committed = dragStartState.current.get(node.id)
      dragStartState.current.delete(node.id)

      const cancelMovement = () => {
        setNodes((nds) =>
          clearHighlights(
            nds.map((n) =>
              n.type === "student" && n.id === node.id && committed
                ? { ...n, ...committed }
                : n
            )
          )
        )
      }

      const seatNode = getIntersectingNodes(node).find((n) => n.type === "seat")

      if (seatNode) {
        const occupant = nodes.find(
          (n) =>
            n.type === "student" &&
            n.parentId === seatNode.id &&
            n.id !== node.id
        )
        if (occupant) {
          cancelMovement()
          return
        }

        setNodes((nds) =>
          reorderNodes(
            nds.map((n) =>
              n.type === "student" && n.id === node.id
                ? { ...n, parentId: seatNode.id, position: { x: 0, y: 0 } }
                : n
            )
          )
        )
      } else if (node.parentId) {
        const absolutePosition =
          getInternalNode(node.id)?.internals.positionAbsolute ?? node.position
        setNodes((nds) =>
          nds.map((n) =>
            n.type === "student" && n.id === node.id
              ? { ...n, parentId: undefined, position: absolutePosition }
              : n
          )
        )
      }

      setNodes((nds) => clearHighlights(nds))
    },
    [nodes, getIntersectingNodes, getInternalNode, setNodes, clearHighlights]
  )

  const onDragOver = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()
      if (!locked) {
        event.dataTransfer.dropEffect = "move"
      }
    },
    [locked]
  )

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()
      if (locked) {
        return
      }

      const studentId = event.dataTransfer.getData(STUDENT_DATA_TRANSFER_TYPE)
      const student = studentsById.get(studentId)
      if (!student) {
        return
      }

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })
      const dropRect = {
        x: position.x - STUDENT_NODE_SIZE / 2,
        y: position.y - STUDENT_NODE_SIZE / 2,
        width: STUDENT_NODE_SIZE,
        height: STUDENT_NODE_SIZE,
      }

      const hitSeat = getIntersectingNodes(dropRect).find(
        (n) => n.type === "seat"
      )
      const occupied =
        !!hitSeat &&
        nodes.some((n) => n.type === "student" && n.parentId === hitSeat.id)

      const newNode: SeatingChartStudentNode =
        hitSeat && !occupied
          ? {
              id: studentId,
              type: "student",
              position: { x: 0, y: 0 },
              parentId: hitSeat.id,
              data: { student },
            }
          : {
              id: studentId,
              type: "student",
              position: { x: dropRect.x, y: dropRect.y },
              data: { student },
            }

      setNodes((nds) => nds.concat(newNode))
    },
    [
      locked,
      studentsById,
      screenToFlowPosition,
      getIntersectingNodes,
      nodes,
      setNodes,
    ]
  )

  return (
    <div className="relative min-h-0 w-full flex-1 overflow-hidden rounded-lg border-2">
      <LockedContext value={locked}>
        <ReactFlow
          nodes={nodes}
          onNodesChange={onNodesChange}
          nodeTypes={nodeTypes}
          onNodeDragStart={onNodeDragStart}
          onNodeDrag={onNodeDrag}
          onNodeDragStop={onNodeDragStop}
          onDrop={onDrop}
          onDragOver={onDragOver}
          nodesDraggable={!locked}
          elementsSelectable={!locked}
          snapToGrid
          snapGrid={[GRID_STEP, GRID_STEP]}
          minZoom={0.25}
          maxZoom={2}
        >
          <Background gap={GRID_STEP} size={2} />
        </ReactFlow>
        <Controls showInteractive={false} />
      </LockedContext>
    </div>
  )
}

export function SeatingChartCanvas(props: SeatingChartCanvasProps) {
  return (
    <ReactFlowProvider>
      <SeatingChartCanvasInner {...props} />
    </ReactFlowProvider>
  )
}
