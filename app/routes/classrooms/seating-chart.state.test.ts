import { describe, expect, it } from "vitest"
import type { Student } from "~/lib/types"
import {
  GRID_STEP,
  createTable,
  getUnassignedStudents,
  seatingChartReducer,
  type SeatingChartState,
  type Table,
} from "./seating-chart.state"

function makeStudent(id: string): Student {
  return { id, student_id: 1, name: id, classroom_id: "c1", seat_id: null }
}

function makeTable(overrides: Partial<Table> = {}): Table {
  return { id: "table-1", seatCount: 4, x: 0, y: 0, ...overrides }
}

function makeState(
  overrides: Partial<SeatingChartState> = {}
): SeatingChartState {
  return { tables: [], assignments: {}, ...overrides }
}

describe("createTable", () => {
  it("defaults to 4 seats", () => {
    expect(createTable(0).seatCount).toBe(4)
  })

  it("lays out tables left-to-right within a row", () => {
    const first = createTable(0)
    const second = createTable(1)

    expect(second.y).toBe(first.y)
    expect(second.x - first.x).toBe(GRID_STEP * 13)
  })

  it("wraps to the next row after 4 tables", () => {
    const first = createTable(0)
    const fifth = createTable(4)

    expect(fifth.x).toBe(first.x)
    expect(fifth.y).toBeGreaterThan(first.y)
  })
})

describe("getUnassignedStudents", () => {
  const students = [makeStudent("s1"), makeStudent("s2"), makeStudent("s3")]

  it("returns everyone when there are no assignments", () => {
    expect(getUnassignedStudents(students, {})).toEqual(students)
  })

  it("excludes students who are seated anywhere", () => {
    const result = getUnassignedStudents(students, {
      "table-1:0": "s2",
    })

    expect(result.map((s) => s.id)).toEqual(["s1", "s3"])
  })
})

describe("seatingChartReducer", () => {
  describe("ADD_TABLE", () => {
    it("appends a table without touching existing tables or assignments", () => {
      const existing = makeTable({ id: "table-1" })
      const state = makeState({
        tables: [existing],
        assignments: { "table-1:0": "s1" },
      })

      const next = seatingChartReducer(state, { type: "ADD_TABLE" })

      expect(next.tables).toHaveLength(2)
      expect(next.tables[0]).toBe(existing)
      expect(next.assignments).toEqual(state.assignments)
    })

    it("places the new table using createTable(tables.length)", () => {
      const state = makeState({ tables: [makeTable(), makeTable()] })

      const next = seatingChartReducer(state, { type: "ADD_TABLE" })
      const expected = createTable(2)

      expect(next.tables[2].x).toBe(expected.x)
      expect(next.tables[2].y).toBe(expected.y)
      expect(next.tables[2].seatCount).toBe(expected.seatCount)
    })
  })

  describe("REMOVE_TABLE", () => {
    it("removes the table and any assignments for its seats", () => {
      const tableA = makeTable({ id: "a" })
      const tableB = makeTable({ id: "b" })
      const state = makeState({
        tables: [tableA, tableB],
        assignments: { "a:0": "s1", "a:1": "s2", "b:0": "s3" },
      })

      const next = seatingChartReducer(state, {
        type: "REMOVE_TABLE",
        tableId: "a",
      })

      expect(next.tables).toEqual([tableB])
      expect(next.assignments).toEqual({ "b:0": "s3" })
    })
  })

  describe("MOVE_TABLE_BY", () => {
    it("adds the delta to only the matching table", () => {
      const tableA = makeTable({ id: "a", x: 100, y: 100 })
      const tableB = makeTable({ id: "b", x: 200, y: 200 })
      const state = makeState({ tables: [tableA, tableB] })

      const next = seatingChartReducer(state, {
        type: "MOVE_TABLE_BY",
        tableId: "a",
        deltaX: 20,
        deltaY: -20,
      })

      expect(next.tables[0]).toEqual({ ...tableA, x: 120, y: 80 })
      expect(next.tables[1]).toBe(tableB)
    })
  })

  describe("SET_SEAT_COUNT", () => {
    it("clamps below the minimum to 1", () => {
      const state = makeState({ tables: [makeTable({ id: "a" })] })

      const next = seatingChartReducer(state, {
        type: "SET_SEAT_COUNT",
        tableId: "a",
        seatCount: -3,
      })

      expect(next.tables[0].seatCount).toBe(1)
    })

    it("clamps above the maximum to 12", () => {
      const state = makeState({ tables: [makeTable({ id: "a" })] })

      const next = seatingChartReducer(state, {
        type: "SET_SEAT_COUNT",
        tableId: "a",
        seatCount: 99,
      })

      expect(next.tables[0].seatCount).toBe(12)
    })

    it("unassigns students in seats removed by shrinking, keeps the rest", () => {
      const state = makeState({
        tables: [makeTable({ id: "a", seatCount: 4 })],
        assignments: { "a:0": "s1", "a:2": "s2", "a:3": "s3" },
      })

      const next = seatingChartReducer(state, {
        type: "SET_SEAT_COUNT",
        tableId: "a",
        seatCount: 2,
      })

      expect(next.tables[0].seatCount).toBe(2)
      expect(next.assignments).toEqual({ "a:0": "s1" })
    })
  })

  describe("ASSIGN_STUDENT", () => {
    it("assigns a student from the roster to an empty seat", () => {
      const state = makeState()

      const next = seatingChartReducer(state, {
        type: "ASSIGN_STUDENT",
        studentId: "s1",
        seatId: "a:0",
      })

      expect(next.assignments).toEqual({ "a:0": "s1" })
    })

    it("moves a seated student to a different empty seat", () => {
      const state = makeState({ assignments: { "a:0": "s1" } })

      const next = seatingChartReducer(state, {
        type: "ASSIGN_STUDENT",
        studentId: "s1",
        seatId: "a:1",
      })

      expect(next.assignments).toEqual({ "a:1": "s1" })
    })

    it("swaps two students when dragged onto each other's seats", () => {
      const state = makeState({
        assignments: { "a:0": "s1", "a:1": "s2" },
      })

      const next = seatingChartReducer(state, {
        type: "ASSIGN_STUDENT",
        studentId: "s1",
        seatId: "a:1",
      })

      expect(next.assignments).toEqual({ "a:0": "s2", "a:1": "s1" })
    })

    it("drops the displaced student back to the roster when assigning from the roster onto an occupied seat", () => {
      const state = makeState({ assignments: { "a:0": "s2" } })

      const next = seatingChartReducer(state, {
        type: "ASSIGN_STUDENT",
        studentId: "s1",
        seatId: "a:0",
      })

      expect(next.assignments).toEqual({ "a:0": "s1" })
    })

    it("is a no-op when dropped back onto the student's own seat", () => {
      const state = makeState({ assignments: { "a:0": "s1" } })

      const next = seatingChartReducer(state, {
        type: "ASSIGN_STUDENT",
        studentId: "s1",
        seatId: "a:0",
      })

      expect(next).toBe(state)
    })
  })

  describe("UNASSIGN_STUDENT", () => {
    it("removes only the given student's seat assignment", () => {
      const state = makeState({
        assignments: { "a:0": "s1", "a:1": "s2" },
      })

      const next = seatingChartReducer(state, {
        type: "UNASSIGN_STUDENT",
        studentId: "s1",
      })

      expect(next.assignments).toEqual({ "a:1": "s2" })
    })
  })

  describe("UNASSIGN_ALL", () => {
    it("clears every seat assignment but leaves tables untouched", () => {
      const tables = [makeTable({ id: "a" })]
      const state = makeState({
        tables,
        assignments: { "a:0": "s1", "a:1": "s2" },
      })

      const next = seatingChartReducer(state, { type: "UNASSIGN_ALL" })

      expect(next.assignments).toEqual({})
      expect(next.tables).toBe(tables)
    })
  })
})
