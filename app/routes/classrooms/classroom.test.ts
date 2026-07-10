import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { Classroom, Student } from "~/lib/types"
import { loader } from "./classroom"

const classroomId = "classroom-1"

function loaderArgs() {
  return {
    request: new Request(`http://test/classrooms/${classroomId}`),
    params: { classroomId },
    context: {},
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any
}

function jsonResponse(data: unknown) {
  return new Response(JSON.stringify({ data }), { status: 200 })
}

describe("classroom loader", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("loads the classroom and only the students assigned to it", async () => {
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
        seat_id: null,
      },
      {
        id: "s2",
        student_id: 2,
        name: "In another classroom",
        classroom_id: "other-classroom",
        seat_id: null,
      },
      {
        id: "s3",
        student_id: 3,
        name: "Unassigned to any classroom",
        classroom_id: null,
        seat_id: null,
      },
    ]

    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse(classroom))
      .mockResolvedValueOnce(jsonResponse(students))

    const result = await loader(loaderArgs())

    expect(fetch).toHaveBeenCalledTimes(2)
    const [classroomUrl] = vi.mocked(fetch).mock.calls[0]
    const [studentsUrl] = vi.mocked(fetch).mock.calls[1]
    expect(classroomUrl).toBe(
      `http://localhost:3000/api/v1/classrooms/${classroomId}`
    )
    expect(studentsUrl).toBe("http://localhost:3000/api/v1/students")

    expect(result.classroom).toEqual(classroom)
    expect(result.students).toEqual([students[0]])
  })
})
