import { describe, expect, it, vi } from "vitest"
import { makeArgs, stubFetch } from "~/lib/test-utils"
import { action } from "./create-student"

const validPayload = {
  student_id: 123,
  name: "Bob Burger",
  classroom_id: null,
}

const args = (body: unknown) =>
  makeArgs("http://test/students/new", { method: "POST", body })

stubFetch()

describe("create-student action", () => {
  it("creates the student and returns its id", async () => {
    const createdStudent = { id: "student-1", ...validPayload }
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ data: createdStudent }), { status: 201 })
    )

    const result = await action(args(validPayload))

    expect(fetch).toHaveBeenCalledTimes(1)
    const [url, init] = vi.mocked(fetch).mock.calls[0]
    expect(url).toBe("http://localhost:3000/api/v1/students")
    expect(init?.method).toBe("POST")
    expect(JSON.parse(init?.body as string)).toEqual(validPayload)

    expect(result).toEqual({ ok: true, id: createdStudent.id })
  })

  it("returns validation errors and never calls fetch for an invalid payload", async () => {
    const result = await action(
      args({
        student_id: -1,
        name: "",
        classroom_id: null,
      })
    )

    expect(fetch).not.toHaveBeenCalled()
    expect(result.ok).toBe(false)
    expect(result).toHaveProperty("fieldErrors.properties")
  })

  it("returns an error result when the backend rejects the create request", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(null, { status: 500, statusText: "Internal Server Error" })
    )

    const result = await action(args(validPayload))

    expect(result.ok).toBe(false)
  })
})
