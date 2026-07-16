import type { Edge } from "@xyflow/react"
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
export const MIN_TABLE_SIZE = CELL // 1 seat/side, 4 total
export const MAX_TABLE_SIZE = CELL * 3 // 3 seats/side, 12 total

export type Point = { x: number; y: number }
export type Side = "top" | "right" | "bottom" | "left"

export type TableNodeData = { table: Table }
export type StudentNodeData = { student: Student }

export type SeatAssignments = Record<string, string /* studentId */>

// Flat, backend/loader-boundary key only (matches SeatAssignment.position).
// See getSeatHandleId/parseSeatHandleId for the in-session seat identity.
export function getSeatId(tableId: string, seatIndex: number): string {
  return `${tableId}:${seatIndex}`
}

// Side-qualified seat identity, stable under independent per-side resize -
// growing/shrinking one side never renumbers another side's seats, unlike a
// flat sequential index would.
export function getSeatHandleId(
  tableId: string,
  side: Side,
  indexInSide: number
): string {
  return `${tableId}:${side}:${indexInSide}`
}

// A StudentNode has one target handle per side, named for the side it faces
// - used as an edge's targetHandle so the connecting line enters from the
// side actually facing the table, not always the first-declared handle.
export function getStudentHandleId(studentId: string, side: Side): string {
  return `${studentId}:${side}`
}

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

export function getSeatsPerSide(
  width: number,
  height: number
): { seatsPerRow: number; seatsPerCol: number } {
  return {
    seatsPerRow: Math.max(1, Math.floor(width / CELL)), // top & bottom, symmetric
    seatsPerCol: Math.max(1, Math.floor(height / CELL)), // left & right, symmetric
  }
}

// `count` fixed-CELL-wide slots, centered as a group within [0, extent].
function getSideSlotCenters(count: number, extent: number): number[] {
  const margin = (extent - count * CELL) / 2
  return Array.from({ length: count }, (_, i) => margin + i * CELL + CELL / 2)
}

// Local offset (relative to the table's own top-left) of a seat's border
// point - there's no interior seat box anymore, so this sits exactly on the
// card's edge, not the center of a 96x96 box like the old grid layout did.
export function getSeatSideAndOffset(
  side: Side,
  indexInSide: number,
  width: number,
  height: number
): Point {
  const { seatsPerRow, seatsPerCol } = getSeatsPerSide(width, height)
  const xs = getSideSlotCenters(seatsPerRow, width)
  const ys = getSideSlotCenters(seatsPerCol, height)
  switch (side) {
    case "top":
      return { x: xs[indexInSide], y: 0 }
    case "bottom":
      return { x: xs[indexInSide], y: height }
    case "left":
      return { x: 0, y: ys[indexInSide] }
    case "right":
      return { x: width, y: ys[indexInSide] }
  }
}

export function getSeatCenter(
  tablePosition: Point,
  side: Side,
  indexInSide: number,
  width: number,
  height: number
): Point {
  const local = getSeatSideAndOffset(side, indexInSide, width, height)
  return { x: tablePosition.x + local.x, y: tablePosition.y + local.y }
}

// Fixed snapped top-left position for a StudentNode connected to this seat -
// a constant distance outward from the seat's border point, on its side.
// Called with tablePosition={x:0,y:0} to get a pure local offset (used for
// the selected-state "Empty" placeholders inside TableNode).
export function getConnectedStudentPosition(
  tablePosition: Point,
  side: Side,
  indexInSide: number,
  width: number,
  height: number
): Point {
  const anchor = getSeatCenter(tablePosition, side, indexInSide, width, height)
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

// Shared clockwise walk: top left->right, right top->bottom, bottom
// right->left, left bottom->top. Used both to flatten seats to the backend's
// flat position index (deriveSeatingChartPayload) and to reconstruct
// (side, indexInSide) from a loaded flat position (buildInitialNodesAndEdges).
export function getCanonicalSeatOrder(
  seatsPerRow: number,
  seatsPerCol: number
): { side: Side; indexInSide: number }[] {
  const order: { side: Side; indexInSide: number }[] = []
  for (let i = 0; i < seatsPerRow; i++)
    order.push({ side: "top", indexInSide: i })
  for (let i = 0; i < seatsPerCol; i++)
    order.push({ side: "right", indexInSide: i })
  for (let i = seatsPerRow - 1; i >= 0; i--)
    order.push({ side: "bottom", indexInSide: i })
  for (let i = seatsPerCol - 1; i >= 0; i--)
    order.push({ side: "left", indexInSide: i })
  return order
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
    const { seatsPerRow, seatsPerCol } = getSeatsPerSide(
      table.width,
      table.height
    )
    for (const { side, indexInSide } of getCanonicalSeatOrder(
      seatsPerRow,
      seatsPerCol
    )) {
      const seatId = getSeatHandleId(table.id, side, indexInSide)
      if (occupiedSeatIds.has(seatId)) {
        continue
      }
      const center = getSeatCenter(
        table.position,
        side,
        indexInSide,
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

// Load-time canonical size reconstruction: the tables table has no
// width/height column (out of scope to add - see plan), so a table snaps to
// this canonical default size for its saved seat_count on load. Seat count
// and every assignment (by flat position) survive exactly; only which
// side/position a given assignment visually renders at may shift.
export function getDefaultTableSize(seatCount: number): {
  width: number
  height: number
} {
  const total = Math.max(4, seatCount % 2 === 0 ? seatCount : seatCount + 1)
  const half = total / 2
  const seatsPerRow = Math.min(3, Math.max(1, Math.ceil(half / 2)))
  const seatsPerCol = Math.min(3, Math.max(1, Math.floor(half / 2)))
  return { width: seatsPerRow * CELL, height: seatsPerCol * CELL }
}

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

// Builds the initial `nodes`/`edges` arrays from the persisted shape (loader
// data), used both on first load and to rebuild from scratch on Cancel.
export function buildInitialNodesAndEdges(
  tables: Table[],
  assignments: SeatAssignments,
  studentsById: Map<string, Student>
): { nodes: SeatingChartNode[]; edges: Edge[] } {
  const nodes: SeatingChartNode[] = []
  const edges: Edge[] = []

  const sizeByTableId = new Map(
    tables.map((table) => {
      const { width, height } = getDefaultTableSize(table.seat_count)
      const { seatsPerRow, seatsPerCol } = getSeatsPerSide(width, height)
      return [
        table.id,
        {
          width,
          height,
          order: getCanonicalSeatOrder(seatsPerRow, seatsPerCol),
        },
      ] as const
    })
  )

  for (const table of tables) {
    const size = sizeByTableId.get(table.id)!
    nodes.push({
      id: table.id,
      type: "table",
      position: { x: table.x_pos, y: table.y_pos },
      width: size.width,
      height: size.height,
      data: { table },
    })
  }

  for (const [flatSeatKey, studentId] of Object.entries(assignments)) {
    const student = studentsById.get(studentId)
    if (!student) {
      continue
    }
    const [tableId, flatPositionStr] = flatSeatKey.split(":")
    const table = tables.find((t) => t.id === tableId)
    const size = sizeByTableId.get(tableId)
    if (!table || !size) {
      continue
    }
    const flatPosition = Number(flatPositionStr)
    const seatRef = size.order[flatPosition]
    if (!seatRef) {
      continue
    }
    const { side, indexInSide } = seatRef
    const handleId = getSeatHandleId(tableId, side, indexInSide)

    nodes.push({
      id: studentId,
      type: "student",
      position: getConnectedStudentPosition(
        { x: table.x_pos, y: table.y_pos },
        side,
        indexInSide,
        size.width,
        size.height
      ),
      data: { student },
    })
    edges.push({
      id: handleId,
      source: tableId,
      sourceHandle: handleId,
      target: studentId,
      targetHandle: getStudentHandleId(studentId, getOppositeSide(side)),
    })
  }

  return { nodes, edges }
}

// Derives the backend save payload from the current canvas state. Floating
// (unconnected) student nodes are simply not represented anywhere in the
// payload - only seated assignments ever persist, matching existing behavior.
// Seat count is derived from each table node's live width/height, not the
// (now vestigial) data.table.seat_count.
export function deriveSeatingChartPayload(
  nodes: SeatingChartNode[],
  edges: Edge[]
): z.infer<typeof seatingChartSchema> {
  const tableNodes = nodes.filter(
    (n): n is SeatingChartTableNode => n.type === "table"
  )

  return {
    tables: tableNodes.map((node) => {
      const width = node.width ?? MIN_TABLE_SIZE
      const height = node.height ?? MIN_TABLE_SIZE
      const { seatsPerRow, seatsPerCol } = getSeatsPerSide(width, height)
      const order = getCanonicalSeatOrder(seatsPerRow, seatsPerCol)
      return {
        x_pos: node.position.x,
        y_pos: node.position.y,
        seats: order.map(({ side, indexInSide }) => {
          const handleId = getSeatHandleId(node.id, side, indexInSide)
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
