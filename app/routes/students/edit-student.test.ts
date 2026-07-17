import { describe, expect, it, vi } from "vitest"
import { makeArgs, stubFetch } from "~/lib/test-utils"
import { action } from "./edit-student"

const studentId = "student-1"

const existingStudent = {
  id: studentId,
  student_id: 123,
  name: "Bob Burger",
  classroom_id: null,
  seat_id: null,
}

const args = (body: unknown) =>
  makeArgs(`http://test/students/${studentId}/edit`, {
    method: "POST",
    params: { studentId },
    body,
  })

stubFetch()

describe("edit-student action", () => {
  it("updates the student and redirects to its detail page", async () => {
    // Action makes an unused `getStudent` call before `updateStudent`, so mock both.
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: existingStudent }), {
          status: 200,
        })
      )
      .mockResolvedValueOnce(new Response(null, { status: 200 }))

    const result = await action(args({ name: "Bob Updated" }))

    expect(fetch).toHaveBeenCalledTimes(2)
    const [getUrl] = vi.mocked(fetch).mock.calls[0]
    expect(getUrl).toBe(`http://localhost:3000/api/v1/students/${studentId}`)

    const [patchUrl, patchInit] = vi.mocked(fetch).mock.calls[1]
    expect(patchUrl).toBe(`http://localhost:3000/api/v1/students/${studentId}`)
    expect(patchInit?.method).toBe("PATCH")
    expect(JSON.parse(patchInit?.body as string)).toEqual({
      name: "Bob Updated",
    })

    expect(result).toBeInstanceOf(Response)
    const response = result as Response
    expect(response.status).toBe(302)
    expect(response.headers.get("Location")).toBe(`/students/${studentId}`)
  })

  it("returns validation errors and never calls fetch for an invalid payload", async () => {
    const result = await action(args({ student_id: -1 }))

    expect(fetch).not.toHaveBeenCalled()
    expect(result).not.toBeInstanceOf(Response)
    expect(result).toHaveProperty("properties")
  })

  it("propagates an error when the backend rejects the update request", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: existingStudent }), {
          status: 200,
        })
      )
      .mockResolvedValueOnce(
        new Response(null, { status: 500, statusText: "Internal Server Error" })
      )

    await expect(action(args({ name: "Bob Updated" }))).rejects.toThrow()
  })
})
