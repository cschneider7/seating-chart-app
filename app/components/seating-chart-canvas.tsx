import {
  Background,
  BackgroundVariant,
  ConnectionMode,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
  type OnEdgesChange,
  type OnNodesChange,
} from "@xyflow/react"
import { useRef, useState, type Dispatch, type SetStateAction } from "react"
import { StudentNode } from "~/components/nodes/student-node"
import { TableNode } from "~/components/nodes/table-node"
import { DragCandidateContext, type DragCandidate } from "~/components/nodes/context"
import { StudentCardContent } from "~/components/nodes/student-card-content"
import { Item } from "~/components/ui/item"
import { ScrollArea } from "~/components/ui/scroll-area"
import type { Student } from "~/lib/types"
import {
  CONNECT_THRESHOLD,
  DISCONNECT_THRESHOLD,
  GRID_STEP,
  STUDENT_NODE_SIZE,
  findNearestSeat,
  getConnectedStudentPosition,
  getSeatCenter,
  getSeatId,
  parseSeatIndex,
  type SeatingChartNode,
} from "~/routes/classrooms/seating-chart.state"

const nodeTypes = { table: TableNode, student: StudentNode }

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
              <p className="text-sm text-muted-foreground">Empty</p>
            ) : (
              students.map((student) => (
                <StudentChip key={student.id} student={student} locked={locked} />
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
  edges: Edge[]
  onNodesChange: OnNodesChange<SeatingChartNode>
  onEdgesChange: OnEdgesChange<Edge>
  setNodes: Dispatch<SetStateAction<SeatingChartNode[]>>
  setEdges: Dispatch<SetStateAction<Edge[]>>
  locked: boolean
  studentsById: Map<string, Student>
}

function tableNodesAsSeatTargets(nodes: SeatingChartNode[]) {
  return nodes
    .filter((n) => n.type === "table")
    .map((n) => ({ id: n.id, position: n.position, seatCount: n.data.table.seat_count }))
}

function isOutsidePane(
  event: MouseEvent | TouchEvent,
  paneEl: HTMLElement
): boolean {
  const point =
    "clientX" in event
      ? { x: event.clientX, y: event.clientY }
      : event.changedTouches?.[0]
        ? { x: event.changedTouches[0].clientX, y: event.changedTouches[0].clientY }
        : undefined
  if (!point) {
    return false
  }
  const rect = paneEl.getBoundingClientRect()
  return (
    point.x < rect.left ||
    point.x > rect.right ||
    point.y < rect.top ||
    point.y > rect.bottom
  )
}

function SeatingChartCanvasInner({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  setNodes,
  setEdges,
  locked,
  studentsById,
}: SeatingChartCanvasProps) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [dragCandidate, setDragCandidate] = useState<DragCandidate>(null)
  const { screenToFlowPosition } = useReactFlow()

  function handleNodeDrag(
    _event: MouseEvent | TouchEvent,
    node: SeatingChartNode
  ) {
    if (node.type === "table") {
      const connectedEdges = edges.filter((e) => e.source === node.id)
      if (connectedEdges.length === 0) {
        return
      }
      setNodes((nds) =>
        nds.map((n) => {
          const edge = connectedEdges.find((e) => e.target === n.id)
          if (!edge) {
            return n
          }
          const seatIndex = parseSeatIndex(edge.sourceHandle)
          return { ...n, position: getConnectedStudentPosition(node.position, seatIndex) }
        })
      )
    } else if (node.type === "student") {
      const center = {
        x: node.position.x + STUDENT_NODE_SIZE / 2,
        y: node.position.y + STUDENT_NODE_SIZE / 2,
      }
      const occupiedSeatIds = new Set(
        edges
          .filter((e) => e.target !== node.id)
          .map((e) => e.sourceHandle)
          .filter((seatId): seatId is string => !!seatId)
      )
      const candidate = findNearestSeat(
        tableNodesAsSeatTargets(nodes),
        occupiedSeatIds,
        center,
        CONNECT_THRESHOLD
      )
      setDragCandidate(
        candidate ? { tableId: candidate.tableId, seatIndex: candidate.seatIndex } : null
      )
    }
  }

  function handleNodeDragStop(
    event: MouseEvent | TouchEvent,
    node: SeatingChartNode
  ) {
    setDragCandidate(null)

    if (node.type !== "student") {
      return
    }

    if (wrapperRef.current && isOutsidePane(event, wrapperRef.current)) {
      setNodes((nds) => nds.filter((n) => n.id !== node.id))
      setEdges((eds) => eds.filter((e) => e.target !== node.id))
      return
    }

    const center = {
      x: node.position.x + STUDENT_NODE_SIZE / 2,
      y: node.position.y + STUDENT_NODE_SIZE / 2,
    }
    const occupiedSeatIds = new Set(
      edges
        .filter((e) => e.target !== node.id)
        .map((e) => e.sourceHandle)
        .filter((seatId): seatId is string => !!seatId)
    )
    const candidate = findNearestSeat(
      tableNodesAsSeatTargets(nodes),
      occupiedSeatIds,
      center,
      CONNECT_THRESHOLD
    )

    if (candidate) {
      const tableNode = nodes.find((n) => n.id === candidate.tableId)
      if (!tableNode) {
        return
      }
      setEdges((eds) => [
        ...eds.filter((e) => e.target !== node.id),
        {
          id: candidate.seatId,
          source: candidate.tableId,
          sourceHandle: candidate.seatId,
          target: node.id,
        },
      ])
      setNodes((nds) =>
        nds.map((n) =>
          n.id === node.id
            ? { ...n, position: getConnectedStudentPosition(tableNode.position, candidate.seatIndex) }
            : n
        )
      )
      return
    }

    const ownEdge = edges.find((e) => e.target === node.id)
    if (!ownEdge) {
      return
    }

    const ownTableNode = nodes.find((n) => n.id === ownEdge.source)
    if (!ownTableNode) {
      return
    }
    const ownSeatIndex = parseSeatIndex(ownEdge.sourceHandle)
    const ownSeatCenter = getSeatCenter(ownTableNode.position, ownSeatIndex)
    const dist = Math.hypot(center.x - ownSeatCenter.x, center.y - ownSeatCenter.y)

    if (dist <= DISCONNECT_THRESHOLD) {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === node.id
            ? { ...n, position: getConnectedStudentPosition(ownTableNode.position, ownSeatIndex) }
            : n
        )
      )
    } else {
      setEdges((eds) => eds.filter((e) => e.target !== node.id))
    }
  }

  function handleDragOver(event: React.DragEvent) {
    event.preventDefault()
    if (!locked) {
      event.dataTransfer.dropEffect = "move"
    }
  }

  function handleDrop(event: React.DragEvent) {
    event.preventDefault()
    if (locked) {
      return
    }
    const studentId = event.dataTransfer.getData(STUDENT_DATA_TRANSFER_TYPE)
    const student = studentsById.get(studentId)
    if (!student) {
      return
    }
    const position = screenToFlowPosition({ x: event.clientX, y: event.clientY })
    setNodes((nds) => [
      ...nds,
      {
        id: studentId,
        type: "student",
        position: {
          x: position.x - STUDENT_NODE_SIZE / 2,
          y: position.y - STUDENT_NODE_SIZE / 2,
        },
        data: { student },
      },
    ])
  }

  return (
    <div
      ref={wrapperRef}
      className="relative min-h-0 w-full flex-1 overflow-hidden rounded-lg border-2"
    >
      <DragCandidateContext value={dragCandidate}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          onNodeDrag={handleNodeDrag}
          onNodeDragStop={handleNodeDragStop}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          nodesDraggable={!locked}
          nodesConnectable={false}
          elementsSelectable={!locked}
          connectionMode={ConnectionMode.Loose}
          panOnScroll
          fitView
        >
          <Background variant={BackgroundVariant.Dots} gap={GRID_STEP} />
        </ReactFlow>
      </DragCandidateContext>
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
