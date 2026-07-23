import type { SeatingChart, Student } from "~/lib/schemas"
import type { Table } from "~/lib/types"

export const GRID_STEP = 20
export const DEFAULT_TABLE_ROWS = 2
export const DEFAULT_TABLE_COLS = 2
export const MAX_TABLE_DIMENSION = 15
export const TABLES_PER_ROW = 4
export const TABLE_SPACING = GRID_STEP * 13
export const TABLE_OFFSET = GRID_STEP * 2

export const SEAT_PADDING = 6
export const SEAT_NODE_SIZE = 91 // fixed seat cell size; a table's pixel size grows with rows/cols instead
export const STUDENT_NODE_SIZE = SEAT_NODE_SIZE

export type Point = { x: number; y: number }

export type TableNodeData = { table_number: number; rows: number; cols: number }
export type SeatNodeData = { row: number; col: number } // tableId is derivable via parentId
export type StudentNodeData = { student: Student }

export type SeatingChartTableNode = {
  id: string
  type: "table"
  position: Point
  deletable: false // deletion goes through TableNode's toolbar, which cascades to seats/students
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
  deletable: false // removal goes through StudentNode's delete button, which unassigns cleanly
  selected?: boolean
  className?: string
  data: StudentNodeData
}
export type SeatingChartNode =
  SeatingChartTableNode | SeatingChartSeatNode | SeatingChartStudentNode

/**
 * Builds a seat node's id from its table id and grid coordinate.
 * @param tableId - Id of the owning table node
 * @param row - Seat's row index within the table
 * @param col - Seat's column index within the table
 * @returns The seat node's id
 */
export function getSeatId(tableId: string, row: number, col: number): string {
  return `${tableId}:${row}:${col}`
}

/**
 * Computes a seat's pixel position within its table from its grid coordinate.
 * @param row - Seat's row index within the table
 * @param col - Seat's column index within the table
 * @returns The seat's `{ x, y }` position relative to its table
 */
export function getSeatPosition(row: number, col: number): Point {
  const step = SEAT_NODE_SIZE + SEAT_PADDING
  return { x: SEAT_PADDING + col * step, y: SEAT_PADDING + row * step }
}

/**
 * Computes a table's rendered pixel size from its rows/cols.
 * @param rows - Number of seat rows
 * @param cols - Number of seat columns
 * @returns The table node's `{ width, height }` in pixels
 */
export function getTableNodeSize(
  rows: number,
  cols: number
): { width: number; height: number } {
  const dimSize = (n: number) =>
    n * (SEAT_NODE_SIZE + SEAT_PADDING) + SEAT_PADDING
  return { width: dimSize(cols), height: dimSize(rows) }
}

/**
 * Creates a new table's initial canvas position and default seat grid.
 * @param index - Table's position among the classroom's other tables
 * @returns A new table, ready to be added to the canvas
 */
export function createCanvasTable(index: number): Table {
  return {
    id: crypto.randomUUID(), // Placeholder value
    tableNumber: 0, // Placeholder value
    x_pos: TABLE_OFFSET + (index % TABLES_PER_ROW) * TABLE_SPACING,
    y_pos: TABLE_OFFSET + Math.floor(index / TABLES_PER_ROW) * TABLE_SPACING,
    rows: DEFAULT_TABLE_ROWS,
    cols: DEFAULT_TABLE_COLS,
    seats: Array(DEFAULT_TABLE_ROWS * DEFAULT_TABLE_COLS),
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
      deletable: false,
      data: {
        table_number: table.table_number,
        rows: table.rows,
        cols: table.cols,
      },
    }
    nodes.push(tableNode)

    for (let row = 0; row < table.rows; row++) {
      for (let col = 0; col < table.cols; col++) {
        const seatId = getSeatId(tableId, row, col)
        const seatNode: SeatingChartSeatNode = {
          id: seatId,
          type: "seat",
          position: getSeatPosition(row, col),
          parentId: tableId,
          draggable: false,
          selectable: false,
          deletable: false,
          data: { row, col },
        }
        nodes.push(seatNode)

        const seatIndex = row * table.cols + col
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
          deletable: false,
          data: { student },
        }
        nodes.push(studentNode)
      }
    }
  }

  return nodes
}

/**
 * Reorders nodes into table -> seat -> student order (parents before children).
 * @param nodes - Unordered list of seating chart nodes
 * @return List of nodes in the order table -> seat -> student
 */
export function reorderNodes(nodes: SeatingChartNode[]): SeatingChartNode[] {
  return [
    ...nodes.filter((n) => n.type === "table"),
    ...nodes.filter((n) => n.type === "seat"),
    ...nodes.filter((n) => n.type === "student"),
  ]
}

/**
 * Converts canvas nodes back into a seating chart API payload.
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
  const studentBySeatId = new Map(
    studentNodes
      .filter((student) => student.parentId)
      .map((student) => [student.parentId, student])
  )

  return {
    tables: tableNodes.map((table, idx) => {
      const seats = seatNodes
        .filter((seat) => seat.parentId === table.id)
        .sort((a, b) => a.data.row - b.data.row || a.data.col - b.data.col)
      const seat_assignments = seats.map(
        (seat) => studentBySeatId.get(seat.id)?.id ?? null
      )

      return {
        table_number: idx,
        rows: table.data.rows,
        cols: table.data.cols,
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

export type TableGeometry = {
  rows: number
  cols: number
  x_pos: number
  y_pos: number
}

/**
 * Extracts each table's current geometry from canvas nodes.
 * @param nodes - List of seating chart nodes
 * @returns One entry per table node, in node order
 */
export function getTableGeometry(nodes: SeatingChartNode[]): TableGeometry[] {
  return nodes
    .filter((n): n is SeatingChartTableNode => n.type === "table")
    .map((table) => ({
      rows: table.data.rows,
      cols: table.data.cols,
      x_pos: table.position.x,
      y_pos: table.position.y,
    }))
}

export const RANDOMIZE_TABLE_COUNT_WARNING_THRESHOLD = 20

/**
 * Computes how many new tables a randomize request would create.
 * @param studentCount - Number of students to seat
 * @param keptTableCount - Number of tables being kept
 * @param keptCapacity - Total seats across kept tables
 * @param newTableRows - Row count for each new table
 * @param newTableCols - Column count for each new table
 * @returns The number of new tables needed and the resulting total table count
 */
export function computeRandomizeTableCount(
  studentCount: number,
  keptTableCount: number,
  keptCapacity: number,
  newTableRows: number,
  newTableCols: number
): { neededNewTables: number; totalTables: number } {
  const seatsPerNewTable = newTableRows * newTableCols
  const neededNewTables =
    seatsPerNewTable > 0
      ? Math.ceil(Math.max(0, studentCount - keptCapacity) / seatsPerNewTable)
      : 0
  return { neededNewTables, totalTables: keptTableCount + neededNewTables }
}
