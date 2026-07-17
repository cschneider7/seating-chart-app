import {
  addEdge,
  Background,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
  type OnConnect,
  type OnEdgesChange,
  type OnNodeDrag,
  type OnNodesChange,
} from "@xyflow/react"
import React, { useCallback, type Dispatch, type SetStateAction } from "react"
import { LockedContext } from "~/components/nodes/context"
import { StudentCardContent } from "~/components/nodes/student-card-content"
import { StudentNode } from "~/components/nodes/student-node"
import { TableNode } from "~/components/nodes/table-node"
import { Item } from "~/components/ui/item"
import { ScrollArea } from "~/components/ui/scroll-area"
import {
  CONNECT_THRESHOLD,
  DISCONNECT_THRESHOLD,
  findNearestSeat,
  getCanonicalSeatOrder,
  getConnectedStudentPosition,
  getOppositeSide,
  getSeatCenter,
  getSeatHandleId,
  getStudentHandleId,
  STUDENT_NODE_SIZE,
  type Point,
  type SeatingChartNode,
  type SeatingChartStudentNode,
  type SeatingChartTableNode,
} from "~/lib/seating-chart-utils"
import type { Student } from "~/lib/types"

const nodeTypes = { table: TableNode, student: StudentNode }

const STUDENT_DATA_TRANSFER_TYPE = "application/x-student-id"

function studentCenter(node: SeatingChartNode): Point {
  return {
    x: node.position.x + STUDENT_NODE_SIZE / 2,
    y: node.position.y + STUDENT_NODE_SIZE / 2,
  }
}

// Every occupied seat except the dragged student's current one
function getOccupiedSeatIds(studentId: string, edges: Edge[]): Set<string> {
  return new Set(
    edges
      .filter((e) => e.target !== studentId)
      .map((e) => e.sourceHandle)
      .filter((h): h is string => !!h)
  )
}

function getSeatFromEdge(edge: Edge, tableNodes: SeatingChartTableNode[]) {
  const tableNode = tableNodes.find((n) => n.id === edge.source)
  if (!tableNode || !edge.sourceHandle) {
    return undefined
  }

  const seat = getCanonicalSeatOrder().find(
    ({ side, index }) =>
      getSeatHandleId(tableNode.id, side, index) === edge.sourceHandle
  )

  if (!seat) {
    return undefined
  }

  return {
    tableNode,
    side: seat.side,
    indexInSide: seat.index,
    center: getSeatCenter(
      tableNode.position,
      seat.side,
      tableNode.width,
      tableNode.height
    ),
  }
}

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
  edges: Edge[]
  onNodesChange: OnNodesChange<SeatingChartNode>
  onEdgesChange: OnEdgesChange<Edge>
  setNodes: Dispatch<SetStateAction<SeatingChartNode[]>>
  setEdges: Dispatch<SetStateAction<Edge[]>>
  locked: boolean
  studentsById: Map<string, Student>
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
  const { screenToFlowPosition } = useReactFlow<SeatingChartNode, Edge>()

  const onConnect: OnConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    []
  )

  const onNodeDrag: OnNodeDrag<SeatingChartNode> = useCallback(
    (_, node) => {
      switch (node.type) {
        case "table": {
          const connectedEdges = edges.filter(
            (e) => e.source === node.id && !e.hidden
          )
          if (connectedEdges.length === 0) {
            return
          }
          setNodes((nds) =>
            nds.map((n) => {
              const edge = connectedEdges.find((e) => e.target === n.id)
              if (!edge) {
                return n
              }
              const seat = getSeatFromEdge(edge, [node])
              if (!seat) {
                return n
              }
              return {
                ...n,
                position: getConnectedStudentPosition(
                  node.position,
                  seat.side,
                  node.width,
                  node.height
                ),
              }
            })
          )
          return
        }

        case "student": {
          const tableNodes = nodes.filter(
            (n): n is SeatingChartTableNode => n.type === "table"
          )
          const center = studentCenter(node)
          const candidate = findNearestSeat(
            tableNodes,
            getOccupiedSeatIds(node.id, edges),
            center,
            CONNECT_THRESHOLD
          )

          setEdges((es) => {
            const nextEdges = es
              .filter((e) => e.className !== "temp")
              .map((e) => {
                if (e.target !== node.id) {
                  return e
                }
                const ownSeat = getSeatFromEdge(e, tableNodes)
                const dist = ownSeat
                  ? Math.hypot(
                      center.x - ownSeat.center.x,
                      center.y - ownSeat.center.y
                    )
                  : undefined
                const hidden = dist !== undefined && dist > DISCONNECT_THRESHOLD
                return e.hidden === hidden ? e : { ...e, hidden }
              })

            if (
              candidate &&
              !nextEdges.some((e) => e.id === candidate.seatId)
            ) {
              nextEdges.push({
                id: candidate.seatId,
                source: candidate.tableId,
                sourceHandle: candidate.seatId,
                target: node.id,
                targetHandle: getStudentHandleId(
                  node.id,
                  getOppositeSide(candidate.side)
                ),
                className: "temp",
              })
            }

            return nextEdges
          })
        }

        default:
          return
      }
    },
    [nodes, edges, setNodes, setEdges]
  )

  const onNodeDragStop: OnNodeDrag<SeatingChartNode> = useCallback(
    (_, node) => {
      if (node.type !== "student") {
        return
      }

      const tableNodes = nodes.filter(
        (n): n is SeatingChartTableNode => n.type === "table"
      )
      const candidate = findNearestSeat(
        tableNodes,
        getOccupiedSeatIds(node.id, edges),
        studentCenter(node),
        CONNECT_THRESHOLD
      )

      if (candidate) {
        const tableNode = tableNodes.find((n) => n.id === candidate.tableId)
        if (!tableNode) {
          return
        }
        setEdges((es) => [
          ...es.filter((e) => e.className !== "temp" && e.target !== node.id),
          {
            id: candidate.seatId,
            source: candidate.tableId,
            sourceHandle: candidate.seatId,
            target: node.id,
            targetHandle: getStudentHandleId(
              node.id,
              getOppositeSide(candidate.side)
            ),
          },
        ])
        setNodes((nds) =>
          nds.map((n) =>
            n.id === node.id
              ? {
                  ...n,
                  position: getConnectedStudentPosition(
                    tableNode.position,
                    candidate.side,
                    tableNode.width,
                    tableNode.height
                  ),
                }
              : n
          )
        )
        return
      }

      setEdges((es) => es.filter((e) => e.className !== "temp"))

      const ownEdge = edges.find((e) => e.target === node.id)
      if (!ownEdge) {
        return
      }
      const ownSeat = getSeatFromEdge(ownEdge, tableNodes)
      if (!ownSeat) {
        return
      }

      const center = studentCenter(node)
      const dist = Math.hypot(
        center.x - ownSeat.center.x,
        center.y - ownSeat.center.y
      )

      if (dist <= DISCONNECT_THRESHOLD) {
        setEdges((es) =>
          es.map((e) => (e.id === ownEdge.id ? { ...e, hidden: false } : e))
        )
        setNodes((nds) =>
          nds.map((n) =>
            n.id === node.id
              ? {
                  ...n,
                  position: getConnectedStudentPosition(
                    ownSeat.tableNode.position,
                    ownSeat.side,
                    ownSeat.tableNode.width,
                    ownSeat.tableNode.height
                  ),
                }
              : n
          )
        )
      } else {
        setEdges((es) => es.filter((e) => e.target !== node.id))
      }
    },
    [nodes, edges, setNodes, setEdges]
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
      const newNode: SeatingChartStudentNode = {
        id: studentId,
        type: "student",
        position: {
          x: position.x - STUDENT_NODE_SIZE / 2,
          y: position.y - STUDENT_NODE_SIZE / 2,
        },
        data: { student },
      }

      setNodes((nds) => nds.concat(newNode))
    },
    [locked]
  )

  return (
    <div className="relative min-h-0 w-full flex-1 overflow-hidden rounded-lg border-2">
      <LockedContext value={locked}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          onNodeDrag={onNodeDrag}
          onNodeDragStop={onNodeDragStop}
          onConnect={onConnect}
          onDrop={onDrop}
          onDragOver={onDragOver}
          nodesDraggable={!locked}
          elementsSelectable={!locked}
        >
          <Background />
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
