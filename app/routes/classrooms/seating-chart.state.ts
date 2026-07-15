import type { Edge } from "@xyflow/react"
import type * as z from "zod"
import type { seatingChartSchema } from "~/lib/schemas"
import type { Student, Table } from "~/lib/types"

export const GRID_STEP = 20
export const DEFAULT_SEAT_COUNT = 4
export const MIN_SEAT_COUNT = 1
export const MAX_SEAT_COUNT = 12
export const TABLES_PER_ROW = 4
export const TABLE_SPACING = GRID_STEP * 13
export const TABLE_OFFSET = GRID_STEP * 2

export const SEATS_PER_ROW = 2
export const SEAT_SIZE = 96 // matches existing `size-24` seat/chip boxes
export const SEAT_GAP = 12 // matches existing `gap-3`
export const TABLE_PADDING = 16
export const TABLE_HEADER_HEIGHT = 48 // BaseNodeHeader is pinned to h-12 so this is exact
export const STUDENT_NODE_SIZE = 96
export const SEAT_CONNECT_DISTANCE = 40 // gap between table edge and a connected StudentNode
export const CONNECT_THRESHOLD = GRID_STEP * 3 // 60px - triggers auto-connect
export const DISCONNECT_THRESHOLD = GRID_STEP * 5 // 100px - hysteresis band

export type Point = { x: number; y: number }

export type TableNodeData = { table: Table }
export type StudentNodeData = { student: Student }

export type SeatAssignments = Record<string, string /* studentId */>

export function getSeatId(tableId: string, seatIndex: number): string {
  return `${tableId}:${seatIndex}`
}

export function parseSeatIndex(seatId: string | null | undefined): number {
  return Number(seatId?.split(":")[1])
}

export function createTable(index: number, classroomId: string): Table {
  return {
    id: crypto.randomUUID(),
    classroom_id: classroomId,
    // Placeholder: the backend assigns the real table_number on save (full
    // replace), like it does the real id - this value never leaves the client.
    table_number: 0,
    seat_count: DEFAULT_SEAT_COUNT,
    x_pos: TABLE_OFFSET + (index % TABLES_PER_ROW) * TABLE_SPACING,
    y_pos: TABLE_OFFSET + Math.floor(index / TABLES_PER_ROW) * TABLE_SPACING,
  }
}

export function getSeatOffset(seatIndex: number): Point {
  const col = seatIndex % SEATS_PER_ROW
  const row = Math.floor(seatIndex / SEATS_PER_ROW)
  return {
    x: TABLE_PADDING + col * (SEAT_SIZE + SEAT_GAP),
    y: TABLE_HEADER_HEIGHT + TABLE_PADDING + row * (SEAT_SIZE + SEAT_GAP),
  }
}

export function getSeatCenter(position: Point, seatIndex: number): Point {
  const offset = getSeatOffset(seatIndex)
  return {
    x: position.x + offset.x + SEAT_SIZE / 2,
    y: position.y + offset.y + SEAT_SIZE / 2,
  }
}

// Which side of the TableNode a seat's Handle renders on - left column seats
// point left, right column seats point right (matches grid-cols-2).
export function getSeatHandleSide(seatIndex: number): "left" | "right" {
  return seatIndex % SEATS_PER_ROW === 0 ? "left" : "right"
}

// Fixed snapped top-left position for a StudentNode connected to this seat -
// a constant distance outward from the seat's edge, on the handle's side.
export function getConnectedStudentPosition(
  tablePosition: Point,
  seatIndex: number
): Point {
  const center = getSeatCenter(tablePosition, seatIndex)
  const side = getSeatHandleSide(seatIndex)
  const x =
    side === "left"
      ? center.x - SEAT_SIZE / 2 - SEAT_CONNECT_DISTANCE - STUDENT_NODE_SIZE
      : center.x + SEAT_SIZE / 2 + SEAT_CONNECT_DISTANCE
  return { x, y: center.y - STUDENT_NODE_SIZE / 2 }
}

export interface TableNodeLike {
  id: string
  position: Point
  seatCount: number
}

// Finds the nearest seat (across all tables) to `point` within `threshold`,
// excluding any seat already present in `occupiedSeatIds` - swapping/
// displacing an existing occupant isn't implemented, so an occupied seat is
// simply never offered as a connection candidate.
export function findNearestSeat(
  tableNodes: TableNodeLike[],
  occupiedSeatIds: Set<string>,
  point: Point,
  threshold: number
): { tableId: string; seatIndex: number; seatId: string } | undefined {
  let best:
    | { tableId: string; seatIndex: number; seatId: string; dist: number }
    | undefined
  for (const table of tableNodes) {
    for (let seatIndex = 0; seatIndex < table.seatCount; seatIndex++) {
      const seatId = getSeatId(table.id, seatIndex)
      if (occupiedSeatIds.has(seatId)) {
        continue
      }
      const center = getSeatCenter(table.position, seatIndex)
      const dist = Math.hypot(center.x - point.x, center.y - point.y)
      if (dist <= threshold && (!best || dist < best.dist)) {
        best = { tableId: table.id, seatIndex, seatId, dist }
      }
    }
  }
  return best
}

export type SeatingChartTableNode = {
  id: string
  type: "table"
  position: Point
  data: TableNodeData
}

export type SeatingChartStudentNode = {
  id: string
  type: "student"
  position: Point
  data: StudentNodeData
}

export type SeatingChartNode = SeatingChartTableNode | SeatingChartStudentNode

// Builds the initial `nodes`/`edges` arrays from the persisted shape (loader
// data), used both on first load and to rebuild from scratch on Cancel.
export function buildInitialNodesAndEdges(
  tables: Table[],
  assignments: SeatAssignments,
  studentsById: Map<string, Student>
): { nodes: SeatingChartNode[]; edges: Edge[] } {
  const nodes: SeatingChartNode[] = []
  const edges: Edge[] = []

  for (const table of tables) {
    nodes.push({
      id: table.id,
      type: "table",
      position: { x: table.x_pos, y: table.y_pos },
      data: { table },
    })
  }

  for (const [seatId, studentId] of Object.entries(assignments)) {
    const student = studentsById.get(studentId)
    if (!student) {
      continue
    }
    const [tableId, seatIndexStr] = seatId.split(":")
    const table = tables.find((t) => t.id === tableId)
    if (!table) {
      continue
    }
    const seatIndex = Number(seatIndexStr)

    nodes.push({
      id: studentId,
      type: "student",
      position: getConnectedStudentPosition(
        { x: table.x_pos, y: table.y_pos },
        seatIndex
      ),
      data: { student },
    })
    edges.push({
      id: seatId,
      source: tableId,
      sourceHandle: seatId,
      target: studentId,
    })
  }

  return { nodes, edges }
}

// Derives the backend save payload from the current canvas state. Floating
// (unconnected) student nodes are simply not represented anywhere in the
// payload - only seated assignments ever persist, matching existing behavior.
export function deriveSeatingChartPayload(
  nodes: SeatingChartNode[],
  edges: Edge[]
): z.infer<typeof seatingChartSchema> {
  const tableNodes = nodes.filter(
    (n): n is SeatingChartTableNode => n.type === "table"
  )

  return {
    tables: tableNodes.map((node) => ({
      x_pos: node.position.x,
      y_pos: node.position.y,
      seats: Array.from({ length: node.data.table.seat_count }, (_, i) => {
        const seatId = getSeatId(node.id, i)
        const edge = edges.find(
          (e) => e.source === node.id && e.sourceHandle === seatId
        )
        return edge?.target ?? null
      }),
    })),
  }
}

export function getUnassignedStudents(
  students: Student[],
  nodes: SeatingChartNode[]
): Student[] {
  const onCanvas = new Set(
    nodes.filter((n) => n.type === "student").map((n) => n.id)
  )
  return students.filter((s) => !onCanvas.has(s.id))
}
