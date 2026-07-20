import type { SeatingChart, Student } from "~/lib/schemas"
import type { Table } from "~/lib/types"

export const GRID_STEP = 20
export const SEATS_PER_TABLE = 4
export const TABLES_PER_ROW = 4
export const TABLE_SPACING = GRID_STEP * 13
export const TABLE_OFFSET = GRID_STEP * 2

export const SEAT_PADDING = 6
export const TABLE_NODE_SIZE = 200 // the fixed table size until resizable tables are built (future work)
export const SEAT_NODE_SIZE = (TABLE_NODE_SIZE - SEAT_PADDING * 3) / 2
export const STUDENT_NODE_SIZE = SEAT_NODE_SIZE

export type Point = { x: number; y: number }

export type TableNodeData = { table_number: number }
export type SeatNodeData = { seatIndex: number } // tableId is derivable via parentId
export type StudentNodeData = { student: Student }

export type SeatingChartTableNode = {
  id: string
  type: "table"
  position: Point
  selected?: boolean
  className?: string
  data: TableNodeData
}
export type SeatingChartSeatNode = {
  id: string
  type: "seat"
  position: Point
  parentId: string // a seat always belongs to a table
  draggable: false
  selectable: false
  deletable: false
  selected?: boolean
  className?: string
  data: SeatNodeData
}
export type SeatingChartStudentNode = {
  id: string
  type: "student"
  position: Point
  parentId?: string // set == seated (value is the owning seat's id), unset == unassigned
  selected?: boolean
  className?: string
  data: StudentNodeData
}
export type SeatingChartNode =
  SeatingChartTableNode | SeatingChartSeatNode | SeatingChartStudentNode

export function getSeatId(tableId: string, seatIndex: number): string {
  return `${tableId}:${seatIndex}`
}

/**
 * Computes a seat's fixed position relative to its parent table (seatIndex
 * 0-3 maps to top-left/top-right/bottom-right/bottom-left), flush inside
 * the table's own corners.
 */
export function getSeatPosition(seatIndex: number): Point {
  switch (seatIndex) {
    case 0: // top-left
      return { x: SEAT_PADDING, y: SEAT_PADDING }
    case 1: // top-right
      return {
        x: TABLE_NODE_SIZE - SEAT_NODE_SIZE - SEAT_PADDING,
        y: SEAT_PADDING,
      }
    case 2: // bottom-right
      return {
        x: TABLE_NODE_SIZE - SEAT_NODE_SIZE - SEAT_PADDING,
        y: TABLE_NODE_SIZE - SEAT_NODE_SIZE - SEAT_PADDING,
      }
    case 3: // bottom-left
      return {
        x: SEAT_PADDING,
        y: TABLE_NODE_SIZE - SEAT_NODE_SIZE - SEAT_PADDING,
      }
    default:
      throw new Error(`Invalid seatIndex: ${seatIndex}`)
  }
}

export function createCanvasTable(index: number, classroomId: string): Table {
  return {
    id: crypto.randomUUID(), // Placeholder value
    tableNumber: 0, // Placeholder value
    x_pos: TABLE_OFFSET + (index % TABLES_PER_ROW) * TABLE_SPACING,
    y_pos: TABLE_OFFSET + Math.floor(index / TABLES_PER_ROW) * TABLE_SPACING,
    seats: Array(SEATS_PER_TABLE),
  }
}

/**
 * Builds the initial state of the table, seat, and student nodes
 * @param classroomId - Id of the classroom the chart belongs to
 * @param seatingChart - Seating chart persisted state
 * @param studentsById - Map of students keyed by their id
 * @returns Initial seating chart canvas nodes, grouped table -> seat -> student
 */
export function buildInitialNodes(
  classroomId: string,
  seatingChart: SeatingChart,
  studentsById: Map<string, Student>
): SeatingChartNode[] {
  const nodes: SeatingChartNode[] = []

  for (const table of seatingChart.tables) {
    const tableId = `${classroomId}:${table.table_number}`

    const tableNode: SeatingChartTableNode = {
      id: tableId,
      type: "table",
      position: { x: table.x_pos, y: table.y_pos },
      data: { table_number: table.table_number },
    }
    nodes.push(tableNode)

    for (let seatIndex = 0; seatIndex < SEATS_PER_TABLE; seatIndex++) {
      const seatId = getSeatId(tableId, seatIndex)
      const seatNode: SeatingChartSeatNode = {
        id: seatId,
        type: "seat",
        position: getSeatPosition(seatIndex),
        parentId: tableId,
        draggable: false,
        selectable: false,
        deletable: false,
        data: { seatIndex },
      }
      nodes.push(seatNode)

      const studentId = table.seat_assignments[seatIndex] ?? null
      if (!studentId) {
        continue
      }
      const student = studentsById.get(studentId)
      if (!student) {
        console.warn(
          "Invalid seat assignment: could not find student with id: %s",
          studentId
        )
        continue
      }

      const studentNode: SeatingChartStudentNode = {
        id: studentId,
        type: "student",
        position: { x: 0, y: 0 },
        parentId: seatId,
        data: { student },
      }
      nodes.push(studentNode)
    }
  }

  return nodes
}

/**
 * Builds the backend payload from the current seating chart canvas state,
 * deriving each table's dense seat_assignments array by walking that
 * table's seat children (by parentId, in seatIndex order) and reading each
 * seat's student child (if any) - no dependence on node array order.
 * @param nodes - List of table, seat, and student nodes
 * @returns Body payload to be used to call seating chart API
 */
export function buildSeatingChartPayload(
  nodes: SeatingChartNode[]
): SeatingChart {
  const tableNodes = nodes.filter(
    (n): n is SeatingChartTableNode => n.type === "table"
  )
  const seatNodes = nodes.filter(
    (n): n is SeatingChartSeatNode => n.type === "seat"
  )
  const studentNodes = nodes.filter(
    (n): n is SeatingChartStudentNode => n.type === "student"
  )

  return {
    tables: tableNodes.map((table, idx) => {
      const seats = seatNodes
        .filter((seat) => seat.parentId === table.id)
        .sort((a, b) => a.data.seatIndex - b.data.seatIndex)
      const seat_assignments = seats.map(
        (seat) =>
          studentNodes.find((student) => student.parentId === seat.id)?.id ??
          null
      )

      return {
        table_number: idx,
        x_pos: table.position.x,
        y_pos: table.position.y,
        seat_assignments,
      }
    }),
  }
}

/**
 * Gets the list of students that aren't currently on the seating chart canvas
 * @param students - List of students
 * @param nodes - List of seating chart nodes
 * @returns List of unassigned students
 */
export function getUnassignedStudents(
  students: Student[],
  nodes: SeatingChartNode[]
): Student[] {
  const studentsOnCanvas = new Set(
    nodes.filter((n) => n.type === "student").map((n) => n.id)
  )
  return students.filter((s) => !studentsOnCanvas.has(s.id))
}
