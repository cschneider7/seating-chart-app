import { Position, type Edge } from "@xyflow/react"
import type * as z from "zod"
import type { seatingChartSchema } from "~/lib/schemas"
import type { Student, Table } from "~/lib/types"

export const GRID_STEP = 20
export const DEFAULT_SEAT_COUNT = 4 // seeds the vestigial Table.seat_count field on creation only
export const TABLES_PER_ROW = 4
export const TABLE_SPACING = GRID_STEP * 13
export const TABLE_OFFSET = GRID_STEP * 2

export const STUDENT_NODE_SIZE = 75 // 75% of CELL - a TableNode's base seat-spacing unit
export const SEAT_CONNECT_DISTANCE = GRID_STEP // gap between table edge and a connected StudentNode
export const CONNECT_THRESHOLD = GRID_STEP * 4 // 80px - triggers auto-connect
export const DISCONNECT_THRESHOLD = GRID_STEP * 6 // 120px - hysteresis band

export const CELL = 100 // spacing unit along a side / a TableNode's base size, independent of STUDENT_NODE_SIZE
export const MIN_TABLE_SIZE = CELL // the fixed table size until resizable tables are built (future work)

export type Point = { x: number; y: number }
export type Side = "top" | "right" | "bottom" | "left"

export type TableNodeData = { table: Table }
export type StudentNodeData = { student: Student }

export type SeatingChartTableNode = {
  id: string
  type: "table"
  position: Point
  width: number
  height: number
  selected?: boolean
  data: TableNodeData
}
export type SeatingChartStudentNode = {
  id: string
  type: "student"
  position: Point
  selected?: boolean
  data: StudentNodeData
}
export type SeatingChartNode = SeatingChartTableNode | SeatingChartStudentNode

export type SeatAssignments = Record<string, string /* studentId */>

export const SIDE_TO_POSITION = {
  top: Position.Top,
  right: Position.Right,
  bottom: Position.Bottom,
  left: Position.Left,
} as const

export function getOppositeSide(side: Side): Side {
  switch (side) {
    case "top":
      return "bottom"
    case "bottom":
      return "top"
    case "left":
      return "right"
    case "right":
      return "left"
  }
}

export function getSeatId(tableId: string, seatIndex: number): string {
  return `${tableId}:${seatIndex}`
}

export function getSeatHandleId(
  tableId: string,
  side: Side,
  index: number
): string {
  return `${tableId}:${side}:${index}`
}

export function getStudentHandleId(studentId: string, side: Side): string {
  return `${studentId}:${side}`
}

export function createCanvasTable(index: number, classroomId: string): Table {
  return {
    id: crypto.randomUUID(), // Placeholder value
    classroom_id: classroomId,
    table_number: 0, // Placeholder value
    seat_count: DEFAULT_SEAT_COUNT,
    x_pos: TABLE_OFFSET + (index % TABLES_PER_ROW) * TABLE_SPACING,
    y_pos: TABLE_OFFSET + Math.floor(index / TABLES_PER_ROW) * TABLE_SPACING,
  }
}

// Local offset (relative to the table's top-left) of the seat on this side
export function getSeatSideAndOffset(
  side: Side,
  width: number,
  height: number
): Point {
  switch (side) {
    case "top":
      return { x: width / 2, y: 0 }
    case "bottom":
      return { x: width / 2, y: height }
    case "left":
      return { x: 0, y: height / 2 }
    case "right":
      return { x: width, y: height / 2 }
  }
}

export function getSeatCenter(
  tablePosition: Point,
  side: Side,
  width: number,
  height: number
): Point {
  const local = getSeatSideAndOffset(side, width, height)
  return { x: tablePosition.x + local.x, y: tablePosition.y + local.y }
}

// Fixed top-left position for a StudentNode connected to this seat
export function getConnectedStudentPosition(
  tablePosition: Point,
  side: Side,
  width: number,
  height: number
): Point {
  const anchor = getSeatCenter(tablePosition, side, width, height)
  const push = SEAT_CONNECT_DISTANCE + STUDENT_NODE_SIZE / 2
  const center =
    side === "top"
      ? { x: anchor.x, y: anchor.y - push }
      : side === "bottom"
        ? { x: anchor.x, y: anchor.y + push }
        : side === "left"
          ? { x: anchor.x - push, y: anchor.y }
          : { x: anchor.x + push, y: anchor.y }
  return {
    x: center.x - STUDENT_NODE_SIZE / 2,
    y: center.y - STUDENT_NODE_SIZE / 2,
  }
}

// Canonical clockwise walk: top, right, bottom, left. Exactly one seat per
// side until resizable tables are built (future work)
export function getCanonicalSeatOrder(): { side: Side; index: number }[] {
  return [
    { side: "top", index: 0 },
    { side: "right", index: 0 },
    { side: "bottom", index: 0 },
    { side: "left", index: 0 },
  ]
}

type SeatTargetTable = {
  id: string
  position: Point
  width: number
  height: number
}

// Nearest unoccupied seat (by seat-center distance) across all tables, or
// undefined if none qualify within `threshold`.
export function findNearestSeat(
  tableNodes: SeatTargetTable[],
  occupiedSeatIds: Set<string>,
  point: Point,
  threshold: number
):
  | { tableId: string; side: Side; indexInSide: number; seatId: string }
  | undefined {
  let best:
    | {
        tableId: string
        side: Side
        indexInSide: number
        seatId: string
        dist: number
      }
    | undefined

  for (const table of tableNodes) {
    for (const { side, index: indexInSide } of getCanonicalSeatOrder()) {
      const seatId = getSeatHandleId(table.id, side, indexInSide)
      if (occupiedSeatIds.has(seatId)) {
        continue
      }
      const center = getSeatCenter(
        table.position,
        side,
        table.width,
        table.height
      )
      const dist = Math.hypot(point.x - center.x, point.y - center.y)
      if (dist <= threshold && (!best || dist < best.dist)) {
        best = { tableId: table.id, side, indexInSide, seatId, dist }
      }
    }
  }

  if (!best) {
    return undefined
  }
  const { dist, ...seat } = best
  return seat
}

// Builds the initial state of the table and student nodes
export function buildInitialNodesAndEdges(
  tables: Table[],
  assignments: SeatAssignments,
  studentsById: Map<string, Student>
): { nodes: SeatingChartNode[]; edges: Edge[] } {
  const nodes: SeatingChartNode[] = []
  const edges: Edge[] = []

  // TODO: resizable tables
  const width = MIN_TABLE_SIZE
  const height = MIN_TABLE_SIZE
  const order = getCanonicalSeatOrder()

  for (const table of tables) {
    nodes.push({
      id: table.id,
      type: "table",
      position: { x: table.x_pos, y: table.y_pos },
      width,
      height,
      data: { table },
    })
  }

  for (const [seatKey, studentId] of Object.entries(assignments)) {
    const student = studentsById.get(studentId)
    if (!student) {
      continue
    }
    const [tableId, positionStr] = seatKey.split(":")
    const table = tables.find((t) => t.id === tableId)
    if (!table) {
      continue
    }
    const position = Number(positionStr)
    const seatRef = order[position]
    if (!seatRef) {
      continue
    }
    const { side, index } = seatRef
    const handleId = getSeatHandleId(tableId, side, index)

    const studentNode: SeatingChartStudentNode = {
      id: studentId,
      type: "student",
      position: getConnectedStudentPosition(
        { x: table.x_pos, y: table.y_pos },
        side,
        width,
        height
      ),
      data: { student },
    }
    const studentEdge: Edge = {
      id: handleId,
      source: tableId,
      sourceHandle: handleId,
      target: studentId,
      targetHandle: getStudentHandleId(studentId, getOppositeSide(side)),
    }

    nodes.push(studentNode)
    edges.push(studentEdge)
  }

  return { nodes, edges }
}

// Builds the backend payload from the current canvas state.
export function buildSeatingChartPayload(
  nodes: SeatingChartNode[],
  edges: Edge[]
): z.infer<typeof seatingChartSchema> {
  const tableNodes = nodes.filter(
    (n): n is SeatingChartTableNode => n.type === "table"
  )
  const order = getCanonicalSeatOrder()

  return {
    tables: tableNodes.map((node) => {
      return {
        x_pos: node.position.x,
        y_pos: node.position.y,
        seats: order.map(({ side, index }) => {
          const handleId = getSeatHandleId(node.id, side, index)
          const edge = edges.find(
            (e) => e.source === node.id && e.sourceHandle === handleId
          )
          return edge?.target ?? null
        }),
      }
    }),
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
