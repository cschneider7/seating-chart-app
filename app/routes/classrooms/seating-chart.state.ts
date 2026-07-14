import {
  DEFAULT_SEAT_COUNT,
  MAX_SEAT_COUNT,
  MIN_SEAT_COUNT,
  TABLE_OFFSET,
  TABLE_SPACING,
  TABLES_PER_ROW,
} from "~/components/seating-chart-canvas"
import type { Student, Table } from "~/lib/types"

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
  | { type: "ADD_TABLE"; classroomId: string }
  | { type: "REMOVE_TABLE"; tableId: string }
  | { type: "MOVE_TABLE_BY"; tableId: string; deltaX: number; deltaY: number }
  | { type: "SET_SEAT_COUNT"; tableId: string; seatCount: number }
  | { type: "ASSIGN_STUDENT"; studentId: string; seatId: string }
  | { type: "UNASSIGN_STUDENT"; studentId: string }
  | { type: "UNASSIGN_ALL" }
  | { type: "REVERT_CHANGES"; tables: Table[]; assignments: SeatAssignments }

export function getSeatId(tableId: string, seatIndex: number): string {
  return `${tableId}:${seatIndex}`
}

function parseSeatId(seatId: string): { tableId: string; seatIndex: number } {
  const [tableId, seatIndex] = seatId.split(":")
  return { tableId, seatIndex: Number(seatIndex) }
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

export function seatingChartReducer(
  state: SeatingChartState,
  action: SeatingChartAction
): SeatingChartState {
  switch (action.type) {
    case "ADD_TABLE": {
      const table = createTable(state.tables.length, action.classroomId)
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
      return { ...state, tables, assignments }
    }

    case "MOVE_TABLE_BY": {
      const tables = state.tables.map((table) =>
        table.id === action.tableId
          ? {
              ...table,
              x_pos: table.x_pos + action.deltaX,
              y_pos: table.y_pos + action.deltaY,
            }
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
        table.id === action.tableId
          ? { ...table, seat_count: seatCount }
          : table
      )
      const assignments = Object.fromEntries(
        Object.entries(state.assignments).filter(([seatId]) => {
          const { tableId, seatIndex } = parseSeatId(seatId)
          return tableId !== action.tableId || seatIndex < seatCount
        })
      )
      return { ...state, tables, assignments }
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

    case "REVERT_CHANGES": {
      return { tables: action.tables, assignments: action.assignments }
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
