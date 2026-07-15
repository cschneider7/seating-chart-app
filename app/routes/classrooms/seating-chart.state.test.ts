import { describe, expect, it } from "vitest"
import type { Student, Table } from "~/lib/types"
import {
  buildInitialNodesAndEdges,
  CONNECT_THRESHOLD,
  createTable,
  deriveSeatingChartPayload,
  findNearestSeat,
  getConnectedStudentPosition,
  getSeatCenter,
  getSeatHandleSide,
  getSeatId,
  getSeatOffset,
  getUnassignedStudents,
  SEAT_SIZE,
  TABLE_OFFSET,
  TABLE_SPACING,
  type SeatAssignments,
  type SeatingChartNode,
} from "./seating-chart.state"

function makeStudent(id: string): Student {
  return { id, student_id: 1, name: id, classroom_id: "c1" }
}

function makeTable(overrides: Partial<Table> = {}): Table {
  return {
    id: "table-1",
    classroom_id: "c1",
    table_number: 1,
    seat_count: 4,
    x_pos: 0,
    y_pos: 0,
    ...overrides,
  }
}

describe("createTable", () => {
  it("defaults to 4 seats", () => {
    expect(createTable(0, "c1").seat_count).toBe(4)
  })

  it("lays out tables left-to-right within a row", () => {
    const first = createTable(0, "c1")
    const second = createTable(1, "c1")

    expect(second.y_pos).toBe(first.y_pos)
    expect(second.x_pos - first.x_pos).toBe(TABLE_SPACING)
  })

  it("wraps to the next row after 4 tables", () => {
    const first = createTable(0, "c1")
    const fifth = createTable(4, "c1")

    expect(fifth.x_pos).toBe(first.x_pos)
    expect(fifth.y_pos).toBeGreaterThan(first.y_pos)
  })

  it("snaps the initial position to the grid offset", () => {
    const table = createTable(0, "c1")

    expect(table.x_pos).toBe(TABLE_OFFSET)
    expect(table.y_pos).toBe(TABLE_OFFSET)
  })
})

describe("getSeatOffset / getSeatCenter / getSeatHandleSide", () => {
  it("lays seats out in a 2-column grid", () => {
    expect(getSeatHandleSide(0)).toBe("left")
    expect(getSeatHandleSide(1)).toBe("right")
    expect(getSeatHandleSide(2)).toBe("left")
    expect(getSeatHandleSide(3)).toBe("right")
  })

  it("advances to a new row every 2 seats", () => {
    const seat0 = getSeatOffset(0)
    const seat2 = getSeatOffset(2)

    expect(seat2.y).toBeGreaterThan(seat0.y)
    expect(seat2.x).toBe(seat0.x)
  })

  it("computes a seat's center relative to the table position", () => {
    const center = getSeatCenter({ x: 100, y: 100 }, 0)
    const offset = getSeatOffset(0)

    expect(center.x).toBe(100 + offset.x + SEAT_SIZE / 2)
    expect(center.y).toBe(100 + offset.y + SEAT_SIZE / 2)
  })
})

describe("getConnectedStudentPosition", () => {
  it("snaps to a fixed offset outward from the seat's side", () => {
    const leftSeat = getConnectedStudentPosition({ x: 0, y: 0 }, 0) // left side
    const rightSeat = getConnectedStudentPosition({ x: 0, y: 0 }, 1) // right side
    const leftCenter = getSeatCenter({ x: 0, y: 0 }, 0)
    const rightCenter = getSeatCenter({ x: 0, y: 0 }, 1)

    expect(leftSeat.x).toBeLessThan(leftCenter.x)
    expect(rightSeat.x).toBeGreaterThan(rightCenter.x)
  })
})

describe("findNearestSeat", () => {
  const tableNodes = [
    { id: "a", position: { x: 0, y: 0 }, seatCount: 2 },
    { id: "b", position: { x: 1000, y: 1000 }, seatCount: 2 },
  ]

  it("returns undefined when nothing is within threshold", () => {
    const result = findNearestSeat(tableNodes, new Set(), { x: 5000, y: 5000 }, CONNECT_THRESHOLD)
    expect(result).toBeUndefined()
  })

  it("returns the nearest seat within threshold", () => {
    const center = getSeatCenter({ x: 0, y: 0 }, 0)
    const result = findNearestSeat(tableNodes, new Set(), center, CONNECT_THRESHOLD)

    expect(result).toEqual(
      expect.objectContaining({ tableId: "a", seatIndex: 0, seatId: getSeatId("a", 0) })
    )
  })

  it("excludes seats already present in occupiedSeatIds", () => {
    const center = getSeatCenter({ x: 0, y: 0 }, 0)
    const result = findNearestSeat(
      tableNodes,
      new Set([getSeatId("a", 0)]),
      center,
      CONNECT_THRESHOLD
    )

    expect(result).toBeUndefined()
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
        data: { student: makeStudent("s2") },
      },
    ]

    expect(getUnassignedStudents(students, nodes).map((s) => s.id)).toEqual([
      "s1",
      "s3",
    ])
  })

  it("excludes a floating (unconnected) student on the canvas", () => {
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

describe("buildInitialNodesAndEdges", () => {
  it("returns empty arrays when there are no tables or assignments", () => {
    const { nodes, edges } = buildInitialNodesAndEdges([], {}, new Map())

    expect(nodes).toEqual([])
    expect(edges).toEqual([])
  })

  it("creates one table node per table at its persisted position", () => {
    const tables = [makeTable({ id: "a", x_pos: 40, y_pos: 60 })]
    const { nodes } = buildInitialNodesAndEdges(tables, {}, new Map())

    expect(nodes).toEqual([
      {
        id: "a",
        type: "table",
        position: { x: 40, y: 60 },
        data: { table: tables[0] },
      },
    ])
  })

  it("creates a student node and edge for each assignment, positioned at the seat", () => {
    const tables = [makeTable({ id: "a", x_pos: 0, y_pos: 0 })]
    const assignments: SeatAssignments = { "a:0": "s1" }
    const studentsById = new Map([["s1", makeStudent("s1")]])

    const { nodes, edges } = buildInitialNodesAndEdges(
      tables,
      assignments,
      studentsById
    )

    const studentNode = nodes.find((n) => n.id === "s1")
    expect(studentNode).toEqual({
      id: "s1",
      type: "student",
      position: getConnectedStudentPosition({ x: 0, y: 0 }, 0),
      data: { student: studentsById.get("s1") },
    })
    expect(edges).toEqual([
      { id: "a:0", source: "a", sourceHandle: "a:0", target: "s1" },
    ])
  })

  it("does not create a node or edge for a student absent from assignments", () => {
    const tables = [makeTable({ id: "a" })]
    const { nodes, edges } = buildInitialNodesAndEdges(tables, {}, new Map())

    expect(nodes).toEqual([
      {
        id: "a",
        type: "table",
        position: { x: 0, y: 0 },
        data: { table: tables[0] },
      },
    ])
    expect(edges).toEqual([])
  })
})

describe("deriveSeatingChartPayload", () => {
  it("builds a dense seats array per table from position and edges", () => {
    const nodes: SeatingChartNode[] = [
      {
        id: "a",
        type: "table",
        position: { x: 40, y: 60 },
        data: { table: makeTable({ id: "a", seat_count: 2 }) },
      },
    ]
    const edges = [
      { id: "a:1", source: "a", sourceHandle: "a:1", target: "s1" },
    ]

    const payload = deriveSeatingChartPayload(nodes, edges)

    expect(payload).toEqual({
      tables: [{ x_pos: 40, y_pos: 60, seats: [null, "s1"] }],
    })
  })

  it("never includes a floating (unconnected) student in the payload", () => {
    const nodes: SeatingChartNode[] = [
      {
        id: "a",
        type: "table",
        position: { x: 0, y: 0 },
        data: { table: makeTable({ id: "a", seat_count: 1 }) },
      },
      {
        id: "s1",
        type: "student",
        position: { x: 500, y: 500 },
        data: { student: makeStudent("s1") },
      },
    ]

    const payload = deriveSeatingChartPayload(nodes, [])

    expect(payload).toEqual({ tables: [{ x_pos: 0, y_pos: 0, seats: [null] }] })
  })

  it("round-trips with buildInitialNodesAndEdges", () => {
    const tables = [makeTable({ id: "a", seat_count: 2, x_pos: 40, y_pos: 60 })]
    const assignments: SeatAssignments = { "a:1": "s1" }
    const studentsById = new Map([["s1", makeStudent("s1")]])

    const { nodes, edges } = buildInitialNodesAndEdges(
      tables,
      assignments,
      studentsById
    )
    const payload = deriveSeatingChartPayload(nodes, edges)

    expect(payload).toEqual({
      tables: [{ x_pos: 40, y_pos: 60, seats: [null, "s1"] }],
    })
  })
})
