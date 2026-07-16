import { describe, expect, it } from "vitest"
import type { Student, Table } from "~/lib/types"
import {
  buildInitialNodesAndEdges,
  CELL,
  CONNECT_THRESHOLD,
  createTable,
  deriveSeatingChartPayload,
  findNearestSeat,
  getCanonicalSeatOrder,
  getConnectedStudentPosition,
  getDefaultTableSize,
  getOppositeSide,
  getOrphanedSeatHandleIds,
  getSeatCenter,
  getSeatHandleId,
  getSeatsPerSide,
  getSeatSideAndOffset,
  getStudentHandleId,
  getUnassignedStudents,
  MAX_TABLE_SIZE,
  MIN_TABLE_SIZE,
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

describe("getSeatsPerSide", () => {
  it("yields 1 seat per side at the minimum table size", () => {
    expect(getSeatsPerSide(MIN_TABLE_SIZE, MIN_TABLE_SIZE)).toEqual({
      seatsPerRow: 1,
      seatsPerCol: 1,
    })
  })

  it("yields 3 seats per side at the maximum table size", () => {
    expect(getSeatsPerSide(MAX_TABLE_SIZE, MAX_TABLE_SIZE)).toEqual({
      seatsPerRow: 3,
      seatsPerCol: 3,
    })
  })

  it("floors a non-multiple-of-CELL size down", () => {
    expect(getSeatsPerSide(CELL + CELL / 2, MIN_TABLE_SIZE).seatsPerRow).toBe(1)
  })

  it("computes row/col independently for a rectangular table", () => {
    expect(getSeatsPerSide(CELL * 2, CELL)).toEqual({ seatsPerRow: 2, seatsPerCol: 1 })
  })
})

describe("getSeatSideAndOffset / getSeatCenter", () => {
  it("centers a single seat on its edge at the minimum table size", () => {
    expect(getSeatSideAndOffset("top", 0, MIN_TABLE_SIZE, MIN_TABLE_SIZE)).toEqual({
      x: CELL / 2,
      y: 0,
    })
    expect(getSeatSideAndOffset("left", 0, MIN_TABLE_SIZE, MIN_TABLE_SIZE)).toEqual({
      x: 0,
      y: CELL / 2,
    })
  })

  it("spaces two seats evenly along a 2-CELL-wide edge", () => {
    const seat0 = getSeatSideAndOffset("top", 0, CELL * 2, MIN_TABLE_SIZE)
    const seat1 = getSeatSideAndOffset("top", 1, CELL * 2, MIN_TABLE_SIZE)

    expect(seat0.x).toBe(CELL / 2)
    expect(seat1.x).toBe(CELL * 1.5)
  })

  it("computes a seat's world-space center relative to the table position", () => {
    const local = getSeatSideAndOffset("right", 0, MIN_TABLE_SIZE, MIN_TABLE_SIZE)
    const center = getSeatCenter(
      { x: 100, y: 100 },
      "right",
      0,
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
    const top = getConnectedStudentPosition({ x: 0, y: 0 }, "top", 0, w, h)
    const bottom = getConnectedStudentPosition({ x: 0, y: 0 }, "bottom", 0, w, h)
    const left = getConnectedStudentPosition({ x: 0, y: 0 }, "left", 0, w, h)
    const right = getConnectedStudentPosition({ x: 0, y: 0 }, "right", 0, w, h)

    expect(top.y).toBeLessThan(0)
    expect(bottom.y).toBeGreaterThan(h)
    expect(left.x).toBeLessThan(0)
    expect(right.x).toBeGreaterThan(w)
  })
})

describe("getCanonicalSeatOrder", () => {
  it("walks clockwise: top L->R, right T->B, bottom R->L, left B->T", () => {
    expect(getCanonicalSeatOrder(2, 1)).toEqual([
      { side: "top", indexInSide: 0 },
      { side: "top", indexInSide: 1 },
      { side: "right", indexInSide: 0 },
      { side: "bottom", indexInSide: 1 },
      { side: "bottom", indexInSide: 0 },
      { side: "left", indexInSide: 0 },
    ])
  })

  it("has length 2*seatsPerRow + 2*seatsPerCol", () => {
    expect(getCanonicalSeatOrder(3, 2)).toHaveLength(10)
  })
})

describe("getDefaultTableSize", () => {
  it.each([
    [4, { seatsPerRow: 1, seatsPerCol: 1 }],
    [6, { seatsPerRow: 2, seatsPerCol: 1 }],
    [8, { seatsPerRow: 2, seatsPerCol: 2 }],
    [10, { seatsPerRow: 3, seatsPerCol: 2 }],
    [12, { seatsPerRow: 3, seatsPerCol: 3 }],
    [5, { seatsPerRow: 2, seatsPerCol: 1 }], // rounds up to 6
    [1, { seatsPerRow: 1, seatsPerCol: 1 }], // clamped up to 4
  ])("seatCount %i -> %o", (seatCount, expected) => {
    const { width, height } = getDefaultTableSize(seatCount)
    expect(getSeatsPerSide(width, height)).toEqual(expected)
  })
})

describe("findNearestSeat", () => {
  const tableNodes = [
    { id: "a", position: { x: 0, y: 0 }, width: MIN_TABLE_SIZE, height: MIN_TABLE_SIZE },
    {
      id: "b",
      position: { x: 1000, y: 1000 },
      width: MIN_TABLE_SIZE,
      height: MIN_TABLE_SIZE,
    },
  ]

  it("returns undefined when nothing is within threshold", () => {
    const result = findNearestSeat(tableNodes, new Set(), { x: 5000, y: 5000 }, CONNECT_THRESHOLD)
    expect(result).toBeUndefined()
  })

  it("returns the nearest seat within threshold", () => {
    const point = getSeatCenter({ x: 0, y: 0 }, "top", 0, MIN_TABLE_SIZE, MIN_TABLE_SIZE)
    const result = findNearestSeat(tableNodes, new Set(), point, CONNECT_THRESHOLD)

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
    const { seatsPerRow, seatsPerCol } = getSeatsPerSide(MIN_TABLE_SIZE, MIN_TABLE_SIZE)
    const occupiedSeatIds = new Set(
      getCanonicalSeatOrder(seatsPerRow, seatsPerCol).map(({ side, indexInSide }) =>
        getSeatHandleId("a", side, indexInSide)
      )
    )
    const point = getSeatCenter({ x: 0, y: 0 }, "top", 0, MIN_TABLE_SIZE, MIN_TABLE_SIZE)
    const result = findNearestSeat(tableNodes, occupiedSeatIds, point, CONNECT_THRESHOLD)

    expect(result).toBeUndefined()
  })
})

describe("getOrphanedSeatHandleIds", () => {
  it("orphans only the seats that no longer exist after shrinking", () => {
    const edges = [
      { id: "1", source: "a", sourceHandle: getSeatHandleId("a", "top", 0), target: "s1" },
      { id: "2", source: "a", sourceHandle: getSeatHandleId("a", "top", 1), target: "s2" },
      { id: "3", source: "a", sourceHandle: getSeatHandleId("a", "right", 0), target: "s3" },
    ]

    // width=CELL*2,height=CELL -> {seatsPerRow:2, seatsPerCol:1} (top0/top1 both valid)
    // shrinking to MIN_TABLE_SIZE x MIN_TABLE_SIZE -> {1,1} (only top0/right0 valid)
    const orphaned = getOrphanedSeatHandleIds("a", edges, MIN_TABLE_SIZE, MIN_TABLE_SIZE)

    expect(orphaned).toEqual(new Set([getSeatHandleId("a", "top", 1)]))
  })

  it("orphans nothing when growing", () => {
    const edges = [
      { id: "1", source: "a", sourceHandle: getSeatHandleId("a", "top", 0), target: "s1" },
    ]

    const orphaned = getOrphanedSeatHandleIds("a", edges, CELL * 2, MIN_TABLE_SIZE)

    expect(orphaned.size).toBe(0)
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

  it("creates one table node per table at its persisted position, sized for its seat count", () => {
    const tables = [makeTable({ id: "a", x_pos: 40, y_pos: 60, seat_count: 4 })]
    const { nodes } = buildInitialNodesAndEdges(tables, {}, new Map())
    const expectedSize = getDefaultTableSize(4)

    expect(nodes).toEqual([
      {
        id: "a",
        type: "table",
        position: { x: 40, y: 60 },
        width: expectedSize.width,
        height: expectedSize.height,
        data: { table: tables[0] },
      },
    ])
  })

  it("creates a student node and edge for each assignment, positioned at the seat", () => {
    const tables = [makeTable({ id: "a", x_pos: 0, y_pos: 0, seat_count: 4 })]
    const assignments: SeatAssignments = { "a:0": "s1" }
    const studentsById = new Map([["s1", makeStudent("s1")]])
    const { width, height } = getDefaultTableSize(4)
    const { seatsPerRow, seatsPerCol } = getSeatsPerSide(width, height)
    const [firstSeat] = getCanonicalSeatOrder(seatsPerRow, seatsPerCol)

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
        firstSeat.indexInSide,
        width,
        height
      ),
      data: { student: studentsById.get("s1") },
    })
    const expectedHandleId = getSeatHandleId("a", firstSeat.side, firstSeat.indexInSide)
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
    const tables = [makeTable({ id: "a", seat_count: 4 })]
    const { nodes, edges } = buildInitialNodesAndEdges(tables, {}, new Map())
    const expectedSize = getDefaultTableSize(4)

    expect(nodes).toEqual([
      {
        id: "a",
        type: "table",
        position: { x: 0, y: 0 },
        width: expectedSize.width,
        height: expectedSize.height,
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
    const order = getCanonicalSeatOrder(1, 1) // [top0, right0, bottom0, left0]
    const occupiedHandleId = getSeatHandleId("a", order[1].side, order[1].indexInSide)
    const edges = [
      { id: occupiedHandleId, source: "a", sourceHandle: occupiedHandleId, target: "s1" },
    ]

    const payload = deriveSeatingChartPayload(nodes, edges)

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

    const payload = deriveSeatingChartPayload(nodes, [])

    expect(payload).toEqual({
      tables: [{ x_pos: 0, y_pos: 0, seats: [null, null, null, null] }],
    })
  })

  it("round-trips seat count and assignment-by-flat-position with buildInitialNodesAndEdges", () => {
    const tables = [makeTable({ id: "a", seat_count: 6, x_pos: 40, y_pos: 60 })]
    const assignments: SeatAssignments = { "a:1": "s1" }
    const studentsById = new Map([["s1", makeStudent("s1")]])

    const { nodes, edges } = buildInitialNodesAndEdges(
      tables,
      assignments,
      studentsById
    )
    const payload = deriveSeatingChartPayload(nodes, edges)

    // Exact position is preserved (already persisted as x_pos/y_pos today);
    // table pixel size is not persisted, so only count + assignment-by-flat-
    // position are asserted, per the documented canonical-reconstruction
    // limitation.
    expect(payload.tables[0].x_pos).toBe(40)
    expect(payload.tables[0].y_pos).toBe(60)
    expect(payload.tables[0].seats).toHaveLength(6)
    expect(payload.tables[0].seats[1]).toBe("s1")
  })
})
