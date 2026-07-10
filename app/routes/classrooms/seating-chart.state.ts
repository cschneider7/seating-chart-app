import type { Student } from "~/lib/types"

// This state is local-only and resets on refresh: the backend has no
// handlers or x/y columns for tables/seats yet, so there is nowhere to
// persist it. Wiring this up is a follow-up once tables/seats are wired up
// server-side.

export interface Table {
  id: string
  seatCount: number
  x: number
  y: number
}

export type SeatAssignments = Record<string, string /* studentId */>

export interface SeatingChartState {
  tables: Table[]
  assignments: SeatAssignments
}

export type SeatingChartActionData =
  | { kind: "table"; tableId: string }
  | { kind: "student"; studentId: string }
  | { kind: "seat"; tableId: string; seatIndex: number; seatId: string }
  | { kind: "roster" }

export type SeatingChartAction =
  | { type: "ADD_TABLE" }
  | { type: "REMOVE_TABLE"; tableId: string }
  | { type: "MOVE_TABLE_BY"; tableId: string; deltaX: number; deltaY: number }
  | { type: "SET_SEAT_COUNT"; tableId: string; seatCount: number }
  | { type: "ASSIGN_STUDENT"; studentId: string; seatId: string }
  | { type: "UNASSIGN_STUDENT"; studentId: string }
  | { type: "UNASSIGN_ALL" }

export const GRID_STEP = 20

const DEFAULT_SEAT_COUNT = 4
const MIN_SEAT_COUNT = 1
const MAX_SEAT_COUNT = 12
const TABLES_PER_ROW = 4
const TABLE_SPACING = GRID_STEP * 13
const TABLE_OFFSET = GRID_STEP * 2

export function getSeatId(tableId: string, seatIndex: number): string {
  return `${tableId}:${seatIndex}`
}

function parseSeatId(seatId: string): { tableId: string; seatIndex: number } {
  const [tableId, seatIndex] = seatId.split(":")
  return { tableId, seatIndex: Number(seatIndex) }
}

export function createTable(index: number): Table {
  return {
    id: crypto.randomUUID(),
    seatCount: DEFAULT_SEAT_COUNT,
    x: TABLE_OFFSET + (index % TABLES_PER_ROW) * TABLE_SPACING,
    y: TABLE_OFFSET + Math.floor(index / TABLES_PER_ROW) * TABLE_SPACING,
  }
}

export function seatingChartReducer(
  state: SeatingChartState,
  action: SeatingChartAction
): SeatingChartState {
  switch (action.type) {
    case "ADD_TABLE": {
      const table = createTable(state.tables.length)
      return { ...state, tables: [...state.tables, table] }
    }

    case "REMOVE_TABLE": {
      const tables = state.tables.filter((t) => t.id !== action.tableId)
      const assignments = Object.fromEntries(
        Object.entries(state.assignments).filter(([seatId]) => {
          const { tableId } = parseSeatId(seatId)
          return tableId !== action.tableId
        })
      )
      return { tables, assignments }
    }

    case "MOVE_TABLE_BY": {
      const tables = state.tables.map((table) =>
        table.id === action.tableId
          ? { ...table, x: table.x + action.deltaX, y: table.y + action.deltaY }
          : table
      )
      return { ...state, tables }
    }

    case "SET_SEAT_COUNT": {
      const seatCount = Math.min(
        MAX_SEAT_COUNT,
        Math.max(MIN_SEAT_COUNT, action.seatCount)
      )
      const tables = state.tables.map((table) =>
        table.id === action.tableId ? { ...table, seatCount } : table
      )
      const assignments = Object.fromEntries(
        Object.entries(state.assignments).filter(([seatId]) => {
          const { tableId, seatIndex } = parseSeatId(seatId)
          return tableId !== action.tableId || seatIndex < seatCount
        })
      )
      return { tables, assignments }
    }

    case "ASSIGN_STUDENT": {
      const { studentId, seatId } = action
      const fromSeatId = Object.entries(state.assignments).find(
        ([, id]) => id === studentId
      )?.[0]

      // If source and destination seats are the same, no-op
      if (fromSeatId === seatId) {
        return state
      }

      const displacedStudent = state.assignments[seatId]
      const assignments = { ...state.assignments }

      if (fromSeatId) {
        delete assignments[fromSeatId]
      }

      // Move existing student to the moved student's previous seat
      if (displacedStudent && displacedStudent !== studentId && fromSeatId) {
        assignments[fromSeatId] = displacedStudent
      }
      assignments[seatId] = studentId

      return { ...state, assignments }
    }

    case "UNASSIGN_STUDENT": {
      const assignments = Object.fromEntries(
        Object.entries(state.assignments).filter(
          ([, id]) => id !== action.studentId
        )
      )
      return { ...state, assignments }
    }

    case "UNASSIGN_ALL": {
      const assignments = {}
      return { ...state, assignments }
    }

    default:
      return state
  }
}

export function getUnassignedStudents(
  students: Student[],
  assignments: SeatAssignments
): Student[] {
  const seated = new Set(Object.values(assignments))
  return students.filter((s) => !seated.has(s.id))
}
