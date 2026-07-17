import { describe, expect, it, vi } from "vitest"
import type * as z from "zod"
import type { seatingChartSchema } from "~/lib/schemas"
import { makeArgs, stubFetch } from "~/lib/test-utils"
import type { Classroom, SeatAssignment, Student, Table } from "~/lib/types"
import { action, loader } from "./classroom"

const classroomId = "classroom-1"

const loaderArgs = () =>
  makeArgs(`http://test/classrooms/${classroomId}`, {
    params: { classroomId },
  })

const actionArgs = (body: unknown) =>
  makeArgs(`http://test/classrooms/${classroomId}`, {
    method: "POST",
    params: { classroomId },
    body,
  })

function jsonResponse(data: unknown) {
  return new Response(JSON.stringify({ data }), { status: 200 })
}

stubFetch()

describe("classroom loader", () => {
  it("loads the classroom, its tables, its students, and its seat assignments", async () => {
    const classroom: Classroom = {
      id: classroomId,
      period: 2,
      subject: "Math",
    }
    const students: Student[] = [
      {
        id: "s1",
        student_id: 1,
        name: "In this classroom",
        classroom_id: classroomId,
      },
      {
        id: "s2",
        student_id: 2,
        name: "In another classroom",
        classroom_id: "other-classroom",
      },
      {
        id: "s3",
        student_id: 3,
        name: "Unassigned to any classroom",
        classroom_id: null,
      },
    ]
    const tables: Table[] = [
      {
        id: "table-1",
        classroom_id: classroomId,
        table_number: 1,
        seat_count: 2,
        x_pos: 0,
        y_pos: 0,
      },
    ]
    const seatAssignments: SeatAssignment[] = [
      { table_id: "table-1", position: 0, student_id: "s1" },
    ]

    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse(classroom))
      .mockResolvedValueOnce(jsonResponse(tables))
      .mockResolvedValueOnce(jsonResponse(students))
      .mockResolvedValueOnce(jsonResponse(seatAssignments))

    const result = await loader(loaderArgs())

    expect(fetch).toHaveBeenCalledTimes(4)
    const [classroomUrl] = vi.mocked(fetch).mock.calls[0]
    const [tablesUrl] = vi.mocked(fetch).mock.calls[1]
    const [studentsUrl] = vi.mocked(fetch).mock.calls[2]
    const [seatAssignmentsUrl] = vi.mocked(fetch).mock.calls[3]
    expect(classroomUrl).toBe(
      `http://localhost:3000/api/v1/classrooms/${classroomId}`
    )
    expect(tablesUrl).toBe(
      `http://localhost:3000/api/v1/classrooms/${classroomId}/tables`
    )
    expect(studentsUrl).toBe("http://localhost:3000/api/v1/students")
    expect(seatAssignmentsUrl).toBe(
      `http://localhost:3000/api/v1/classrooms/${classroomId}/seating-chart`
    )

    expect(result.classroom).toEqual(classroom)
    expect(result.students).toEqual([students[0]])
    expect(result.tables).toEqual(tables)
    expect(result.assignments).toEqual({ "table-1:0": "s1" })
  })
})

describe("classroom action", () => {
  it("PUTs the already nested tables/seats payload straight through", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 200 }))

    const chart: z.infer<typeof seatingChartSchema> = {
      tables: [{ x_pos: 40, y_pos: 60, seats: [null, "s1"] }],
    }

    await action(actionArgs(chart))

    expect(fetch).toHaveBeenCalledTimes(1)
    const [url, init] = vi.mocked(fetch).mock.calls[0]
    expect(url).toBe(
      `http://localhost:3000/api/v1/classrooms/${classroomId}/seating-chart`
    )
    expect(init?.method).toBe("PUT")
    expect(JSON.parse(init?.body as string)).toEqual({
      tables: [{ x_pos: 40, y_pos: 60, seats: [null, "s1"] }],
    })
  })
})
