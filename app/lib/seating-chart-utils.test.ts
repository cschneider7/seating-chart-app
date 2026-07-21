import { describe, expect, it, vi } from "vitest"
import type { SeatingChart, Student } from "~/lib/schemas"
import {
  buildInitialNodes,
  buildSeatingChartPayload,
  createCanvasTable,
  DEFAULT_TABLE_COLS,
  DEFAULT_TABLE_ROWS,
  getSeatId,
  getSeatPosition,
  getUnassignedStudents,
  reorderNodes,
  TABLE_OFFSET,
  TABLE_SPACING,
  type SeatingChartNode,
} from "./seating-chart-utils"

function makeStudent(id: string): Student {
  return { id, student_id: 1, name: id, classroom_id: "c1" }
}

function makeSeatingChart(
  tables: Partial<SeatingChart["tables"][number]>[] = []
): SeatingChart {
  return {
    tables: tables.map((table, index) => ({
      table_number: index,
      rows: DEFAULT_TABLE_ROWS,
      cols: DEFAULT_TABLE_COLS,
      x_pos: 0,
      y_pos: 0,
      seat_assignments: [null, null, null, null],
      ...table,
    })),
  }
}

describe("createCanvasTable", () => {
  it("defaults to a 2x2 grid of seats", () => {
    const table = createCanvasTable(0, "c1")

    expect(table.rows).toBe(DEFAULT_TABLE_ROWS)
    expect(table.cols).toBe(DEFAULT_TABLE_COLS)
    expect(table.seats).toHaveLength(DEFAULT_TABLE_ROWS * DEFAULT_TABLE_COLS)
  })

  it("lays out tables left-to-right within a row", () => {
    const first = createCanvasTable(0, "c1")
    const second = createCanvasTable(1, "c1")

    expect(second.y_pos).toBe(first.y_pos)
    expect(second.x_pos - first.x_pos).toBe(TABLE_SPACING)
  })

  it("wraps to the next row after 4 tables", () => {
    const first = createCanvasTable(0, "c1")
    const fifth = createCanvasTable(4, "c1")

    expect(fifth.x_pos).toBe(first.x_pos)
    expect(fifth.y_pos).toBeGreaterThan(first.y_pos)
  })

  it("snaps the initial position to the grid offset", () => {
    const table = createCanvasTable(0, "c1")

    expect(table.x_pos).toBe(TABLE_OFFSET)
    expect(table.y_pos).toBe(TABLE_OFFSET)
  })
})

describe("getSeatId", () => {
  it("combines the table id and the seat's row/col", () => {
    expect(getSeatId("a", 1, 2)).toBe("a:1:2")
  })
})

describe("buildInitialNodes", () => {
  it("returns no nodes when there are no tables", () => {
    expect(buildInitialNodes("c1", makeSeatingChart([]), new Map())).toEqual([])
  })

  it("creates a table node followed by its seat nodes, in row-major canonical order", () => {
    const seatingChart = makeSeatingChart([{ x_pos: 40, y_pos: 60 }])
    const nodes = buildInitialNodes("c1", seatingChart, new Map())

    expect(nodes).toHaveLength(1 + DEFAULT_TABLE_ROWS * DEFAULT_TABLE_COLS)
    expect(nodes[0]).toEqual({
      id: "c1:0",
      type: "table",
      position: { x: 40, y: 60 },
      data: {
        table_number: 0,
        rows: DEFAULT_TABLE_ROWS,
        cols: DEFAULT_TABLE_COLS,
      },
    })

    let i = 1
    for (let row = 0; row < DEFAULT_TABLE_ROWS; row++) {
      for (let col = 0; col < DEFAULT_TABLE_COLS; col++) {
        expect(nodes[i]).toEqual({
          id: getSeatId("c1:0", row, col),
          type: "seat",
          position: getSeatPosition(row, col),
          parentId: "c1:0",
          draggable: false,
          selectable: false,
          deletable: false,
          data: { row, col },
        })
        i++
      }
    }
  })

  it("pushes an assigned student node right after its seat, parented to it", () => {
    const student = makeStudent("s1")
    const seatingChart = makeSeatingChart([
      { seat_assignments: [null, "s1", null, null] },
    ])
    const nodes = buildInitialNodes(
      "c1",
      seatingChart,
      new Map([["s1", student]])
    )

    // 2x2, row-major: index 1 is row 0, col 1.
    const seatId = getSeatId("c1:0", 0, 1)
    const studentNode = nodes.find((n) => n.id === "s1")

    expect(studentNode).toEqual({
      id: "s1",
      type: "student",
      position: { x: 0, y: 0 },
      parentId: seatId,
      data: { student },
    })
    expect(nodes.findIndex((n) => n.id === seatId)).toBeLessThan(
      nodes.findIndex((n) => n.id === "s1")
    )
  })

  it("warns and skips an assignment referencing an unknown student, still creating the seat", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    const seatingChart = makeSeatingChart([
      { seat_assignments: ["ghost", null, null, null] },
    ])
    const nodes = buildInitialNodes("c1", seatingChart, new Map())

    expect(nodes.some((n) => n.type === "student")).toBe(false)
    expect(nodes.some((n) => n.id === getSeatId("c1:0", 0, 0))).toBe(true)
    expect(warn).toHaveBeenCalled()

    warn.mockRestore()
  })

  it("keeps every table ahead of its own seats across multiple tables", () => {
    const seatingChart = makeSeatingChart([{}, {}])
    const nodes = buildInitialNodes("c1", seatingChart, new Map())

    const tableAIndex = nodes.findIndex((n) => n.id === "c1:0")
    const tableBIndex = nodes.findIndex((n) => n.id === "c1:1")
    const seatOfAIndex = nodes.findIndex(
      (n) => n.id === getSeatId("c1:0", 0, 0)
    )
    const seatOfBIndex = nodes.findIndex(
      (n) => n.id === getSeatId("c1:1", 0, 0)
    )

    expect(tableAIndex).toBeLessThan(seatOfAIndex)
    expect(tableBIndex).toBeLessThan(seatOfBIndex)
  })

  it("supports a non-square grid, reading seat_assignments in row-major order", () => {
    const seatingChart = makeSeatingChart([
      {
        rows: 2,
        cols: 3,
        seat_assignments: [null, null, null, null, null, null],
      },
    ])
    const nodes = buildInitialNodes("c1", seatingChart, new Map())

    expect(nodes).toHaveLength(1 + 6)
    expect(nodes.some((n) => n.id === getSeatId("c1:0", 1, 2))).toBe(true)
  })
})

describe("buildSeatingChartPayload", () => {
  it("returns no tables when there are no table nodes", () => {
    expect(buildSeatingChartPayload([])).toEqual({ tables: [] })
  })

  it("fills seat_assignments with null for an unoccupied table", () => {
    const nodes = buildInitialNodes("c1", makeSeatingChart([{}]), new Map())
    const payload = buildSeatingChartPayload(nodes)

    expect(payload).toEqual({
      tables: [
        {
          table_number: 0,
          rows: DEFAULT_TABLE_ROWS,
          cols: DEFAULT_TABLE_COLS,
          x_pos: 0,
          y_pos: 0,
          seat_assignments: [null, null, null, null],
        },
      ],
    })
  })

  it("derives seat_assignments from parentId chains regardless of node array order", () => {
    const student = makeStudent("s1")
    const tableNode: SeatingChartNode = {
      id: "a",
      type: "table",
      position: { x: 0, y: 0 },
      data: { table_number: 0, rows: 2, cols: 2 },
    }
    const seatNodes: SeatingChartNode[] = []
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 2; col++) {
        seatNodes.push({
          id: getSeatId("a", row, col),
          type: "seat",
          position: { x: 0, y: 0 },
          parentId: "a",
          draggable: false,
          selectable: false,
          deletable: false,
          data: { row, col },
        })
      }
    }
    const studentNode: SeatingChartNode = {
      id: "s1",
      type: "student",
      position: { x: 0, y: 0 },
      parentId: getSeatId("a", 1, 0),
      data: { student },
    }

    // Deliberately out of parent-before-child order.
    const payload = buildSeatingChartPayload([
      studentNode,
      tableNode,
      ...seatNodes,
    ])

    expect(payload.tables[0].seat_assignments).toEqual([null, null, "s1", null])
  })

  it("round-trips through buildInitialNodes", () => {
    const student = makeStudent("s1")
    const seatingChart = makeSeatingChart([
      { x_pos: 40, y_pos: 60, seat_assignments: [null, null, "s1", null] },
    ])
    const nodes = buildInitialNodes(
      "c1",
      seatingChart,
      new Map([["s1", student]])
    )
    const payload = buildSeatingChartPayload(nodes)

    expect(payload.tables[0].x_pos).toBe(40)
    expect(payload.tables[0].y_pos).toBe(60)
    expect(payload.tables[0].seat_assignments).toEqual([null, null, "s1", null])
  })

  it("round-trips a non-square grid, preserving rows/cols and seat order", () => {
    const student = makeStudent("s1")
    const seatingChart = makeSeatingChart([
      {
        rows: 2,
        cols: 3,
        seat_assignments: [null, null, null, null, "s1", null],
      },
    ])
    const nodes = buildInitialNodes(
      "c1",
      seatingChart,
      new Map([["s1", student]])
    )
    const payload = buildSeatingChartPayload(nodes)

    expect(payload.tables[0].rows).toBe(2)
    expect(payload.tables[0].cols).toBe(3)
    expect(payload.tables[0].seat_assignments).toEqual([
      null,
      null,
      null,
      null,
      "s1",
      null,
    ])
  })
})

describe("reorderNodes", () => {
  it("reorders a mix of nodes into table, then seat, then student", () => {
    const table: SeatingChartNode = {
      id: "t",
      type: "table",
      position: { x: 0, y: 0 },
      data: { table_number: 0, rows: 2, cols: 2 },
    }
    const seat: SeatingChartNode = {
      id: "s",
      type: "seat",
      position: { x: 0, y: 0 },
      parentId: "t",
      draggable: false,
      selectable: false,
      deletable: false,
      data: { row: 0, col: 0 },
    }
    const student: SeatingChartNode = {
      id: "st",
      type: "student",
      position: { x: 0, y: 0 },
      parentId: "s",
      data: { student: makeStudent("st") },
    }

    // Deliberately out of parent-before-child order.
    const result = reorderNodes([student, seat, table])

    expect(result).toEqual([table, seat, student])
  })

  it("preserves relative order within each group", () => {
    const tableA: SeatingChartNode = {
      id: "ta",
      type: "table",
      position: { x: 0, y: 0 },
      data: { table_number: 0, rows: 2, cols: 2 },
    }
    const tableB: SeatingChartNode = {
      id: "tb",
      type: "table",
      position: { x: 0, y: 0 },
      data: { table_number: 1, rows: 2, cols: 2 },
    }

    const result = reorderNodes([tableB, tableA])

    expect(result).toEqual([tableB, tableA])
  })
})

describe("getUnassignedStudents", () => {
  const students = [makeStudent("s1"), makeStudent("s2"), makeStudent("s3")]

  it("returns everyone when no students are on the canvas", () => {
    expect(getUnassignedStudents(students, [])).toEqual(students)
  })

  it("excludes a seated student", () => {
    const nodes: SeatingChartNode[] = [
      {
        id: "s2",
        type: "student",
        position: { x: 0, y: 0 },
        parentId: "seat-1",
        data: { student: makeStudent("s2") },
      },
    ]

    expect(getUnassignedStudents(students, nodes).map((s) => s.id)).toEqual([
      "s1",
      "s3",
    ])
  })

  it("excludes a free (unseated) student on the canvas", () => {
    const nodes: SeatingChartNode[] = [
      {
        id: "s3",
        type: "student",
        position: { x: 40, y: 40 },
        data: { student: makeStudent("s3") },
      },
    ]

    expect(getUnassignedStudents(students, nodes).map((s) => s.id)).toEqual([
      "s1",
      "s2",
    ])
  })
})
