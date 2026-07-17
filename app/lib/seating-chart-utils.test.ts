import { describe, expect, it } from "vitest"
import type { Student, Table } from "~/lib/types"
import {
  buildInitialNodesAndEdges,
  buildSeatingChartPayload,
  CELL,
  CONNECT_THRESHOLD,
  createCanvasTable,
  findNearestSeat,
  getCanonicalSeatOrder,
  getConnectedStudentPosition,
  getOppositeSide,
  getSeatCenter,
  getSeatHandleId,
  getSeatSideAndOffset,
  getStudentHandleId,
  getUnassignedStudents,
  MIN_TABLE_SIZE,
  TABLE_OFFSET,
  TABLE_SPACING,
  type SeatAssignments,
  type SeatingChartNode,
} from "./seating-chart-utils"

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
    expect(createCanvasTable(0, "c1").seat_count).toBe(4)
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

describe("getSeatSideAndOffset / getSeatCenter", () => {
  it("centers the seat on its edge", () => {
    expect(getSeatSideAndOffset("top", MIN_TABLE_SIZE, MIN_TABLE_SIZE)).toEqual(
      {
        x: CELL / 2,
        y: 0,
      }
    )
    expect(
      getSeatSideAndOffset("left", MIN_TABLE_SIZE, MIN_TABLE_SIZE)
    ).toEqual({
      x: 0,
      y: CELL / 2,
    })
  })

  it("computes a seat's world-space center relative to the table position", () => {
    const local = getSeatSideAndOffset("right", MIN_TABLE_SIZE, MIN_TABLE_SIZE)
    const center = getSeatCenter(
      { x: 100, y: 100 },
      "right",
      MIN_TABLE_SIZE,
      MIN_TABLE_SIZE
    )

    expect(center).toEqual({ x: 100 + local.x, y: 100 + local.y })
  })
})

describe("getConnectedStudentPosition", () => {
  it("pushes outward from the seat's border, away from the table, per side", () => {
    const w = MIN_TABLE_SIZE
    const h = MIN_TABLE_SIZE
    const top = getConnectedStudentPosition({ x: 0, y: 0 }, "top", w, h)
    const bottom = getConnectedStudentPosition({ x: 0, y: 0 }, "bottom", w, h)
    const left = getConnectedStudentPosition({ x: 0, y: 0 }, "left", w, h)
    const right = getConnectedStudentPosition({ x: 0, y: 0 }, "right", w, h)

    expect(top.y).toBeLessThan(0)
    expect(bottom.y).toBeGreaterThan(h)
    expect(left.x).toBeLessThan(0)
    expect(right.x).toBeGreaterThan(w)
  })
})

describe("getCanonicalSeatOrder", () => {
  it("walks clockwise: top, right, bottom, left - one seat per side", () => {
    expect(getCanonicalSeatOrder()).toEqual([
      { side: "top", index: 0 },
      { side: "right", index: 0 },
      { side: "bottom", index: 0 },
      { side: "left", index: 0 },
    ])
  })
})

describe("findNearestSeat", () => {
  const tableNodes = [
    {
      id: "a",
      position: { x: 0, y: 0 },
      width: MIN_TABLE_SIZE,
      height: MIN_TABLE_SIZE,
    },
    {
      id: "b",
      position: { x: 1000, y: 1000 },
      width: MIN_TABLE_SIZE,
      height: MIN_TABLE_SIZE,
    },
  ]

  it("returns undefined when nothing is within threshold", () => {
    const result = findNearestSeat(
      tableNodes,
      new Set(),
      { x: 5000, y: 5000 },
      CONNECT_THRESHOLD
    )
    expect(result).toBeUndefined()
  })

  it("returns the nearest seat within threshold", () => {
    const point = getSeatCenter(
      { x: 0, y: 0 },
      "top",
      MIN_TABLE_SIZE,
      MIN_TABLE_SIZE
    )
    const result = findNearestSeat(
      tableNodes,
      new Set(),
      point,
      CONNECT_THRESHOLD
    )

    expect(result).toEqual(
      expect.objectContaining({
        tableId: "a",
        side: "top",
        indexInSide: 0,
        seatId: getSeatHandleId("a", "top", 0),
      })
    )
  })

  it("excludes seats already present in occupiedSeatIds", () => {
    // Exclude every seat on the near table "a" - at MIN_TABLE_SIZE its seats
    // can be closer to each other than CONNECT_THRESHOLD, so excluding only
    // one wouldn't prove exclusion (a neighboring seat could still qualify).
    // Table "b" is far enough away to stay out of range regardless.
    const occupiedSeatIds = new Set(
      getCanonicalSeatOrder().map(({ side, index: indexInSide }) =>
        getSeatHandleId("a", side, indexInSide)
      )
    )
    const point = getSeatCenter(
      { x: 0, y: 0 },
      "top",
      MIN_TABLE_SIZE,
      MIN_TABLE_SIZE
    )
    const result = findNearestSeat(
      tableNodes,
      occupiedSeatIds,
      point,
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

  it("creates one table node per table at its persisted position, at the fixed table size", () => {
    const tables = [makeTable({ id: "a", x_pos: 40, y_pos: 60 })]
    const { nodes } = buildInitialNodesAndEdges(tables, {}, new Map())

    expect(nodes).toEqual([
      {
        id: "a",
        type: "table",
        position: { x: 40, y: 60 },
        width: MIN_TABLE_SIZE,
        height: MIN_TABLE_SIZE,
        data: { table: tables[0] },
      },
    ])
  })

  it("creates a student node and edge for each assignment, positioned at the seat", () => {
    const tables = [makeTable({ id: "a", x_pos: 0, y_pos: 0 })]
    const assignments: SeatAssignments = { "a:0": "s1" }
    const studentsById = new Map([["s1", makeStudent("s1")]])
    const [firstSeat] = getCanonicalSeatOrder()

    const { nodes, edges } = buildInitialNodesAndEdges(
      tables,
      assignments,
      studentsById
    )

    const studentNode = nodes.find((n) => n.id === "s1")
    expect(studentNode).toEqual({
      id: "s1",
      type: "student",
      position: getConnectedStudentPosition(
        { x: 0, y: 0 },
        firstSeat.side,
        MIN_TABLE_SIZE,
        MIN_TABLE_SIZE
      ),
      data: { student: studentsById.get("s1") },
    })
    const expectedHandleId = getSeatHandleId(
      "a",
      firstSeat.side,
      firstSeat.index
    )
    expect(edges).toEqual([
      {
        id: expectedHandleId,
        source: "a",
        sourceHandle: expectedHandleId,
        target: "s1",
        targetHandle: getStudentHandleId("s1", getOppositeSide(firstSeat.side)),
      },
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
        width: MIN_TABLE_SIZE,
        height: MIN_TABLE_SIZE,
        data: { table: tables[0] },
      },
    ])
    expect(edges).toEqual([])
  })
})

describe("deriveSeatingChartPayload", () => {
  it("builds a dense seats array per table from live width/height and edges", () => {
    const nodes: SeatingChartNode[] = [
      {
        id: "a",
        type: "table",
        position: { x: 40, y: 60 },
        width: MIN_TABLE_SIZE,
        height: MIN_TABLE_SIZE,
        data: { table: makeTable({ id: "a" }) },
      },
    ]
    const order = getCanonicalSeatOrder() // [top0, right0, bottom0, left0]
    const occupiedHandleId = getSeatHandleId("a", order[1].side, order[1].index)
    const edges = [
      {
        id: occupiedHandleId,
        source: "a",
        sourceHandle: occupiedHandleId,
        target: "s1",
      },
    ]

    const payload = buildSeatingChartPayload(nodes, edges)

    expect(payload).toEqual({
      tables: [{ x_pos: 40, y_pos: 60, seats: [null, "s1", null, null] }],
    })
  })

  it("never includes a floating (unconnected) student in the payload", () => {
    const nodes: SeatingChartNode[] = [
      {
        id: "a",
        type: "table",
        position: { x: 0, y: 0 },
        width: MIN_TABLE_SIZE,
        height: MIN_TABLE_SIZE,
        data: { table: makeTable({ id: "a" }) },
      },
      {
        id: "s1",
        type: "student",
        position: { x: 500, y: 500 },
        data: { student: makeStudent("s1") },
      },
    ]

    const payload = buildSeatingChartPayload(nodes, [])

    expect(payload).toEqual({
      tables: [{ x_pos: 0, y_pos: 0, seats: [null, null, null, null] }],
    })
  })

  it("round-trips assignment-by-flat-position with buildInitialNodesAndEdges", () => {
    const tables = [makeTable({ id: "a", x_pos: 40, y_pos: 60 })]
    const assignments: SeatAssignments = { "a:1": "s1" }
    const studentsById = new Map([["s1", makeStudent("s1")]])

    const { nodes, edges } = buildInitialNodesAndEdges(
      tables,
      assignments,
      studentsById
    )
    const payload = buildSeatingChartPayload(nodes, edges)

    // Exact position is preserved (already persisted as x_pos/y_pos today).
    expect(payload.tables[0].x_pos).toBe(40)
    expect(payload.tables[0].y_pos).toBe(60)
    expect(payload.tables[0].seats).toHaveLength(4)
    expect(payload.tables[0].seats[1]).toBe("s1")
  })
})
