import { describe, expect, it, vi } from "vitest"
import { makeArgs, stubFetch } from "~/lib/test-utils"
import { action } from "./edit-classroom"

const classroomId = "classroom-1"

const args = (body: unknown) =>
  makeArgs(`http://test/classrooms/${classroomId}/edit`, {
    method: "POST",
    params: { classroomId },
    body,
  })

stubFetch()

describe("edit-classroom action", () => {
  it("updates the classroom and redirects to its detail page", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 200 }))

    const result = await action(args({ subject: "Algebra" }))

    expect(fetch).toHaveBeenCalledTimes(1)
    const [url, init] = vi.mocked(fetch).mock.calls[0]
    expect(url).toBe(`http://localhost:3000/api/v1/classrooms/${classroomId}`)
    expect(init?.method).toBe("PATCH")
    expect(JSON.parse(init?.body as string)).toEqual({ subject: "Algebra" })

    expect(result).toBeInstanceOf(Response)
    const response = result as Response
    expect(response.status).toBe(302)
    expect(response.headers.get("Location")).toBe(`/classrooms/${classroomId}`)
  })

  it("returns validation errors and never calls fetch for an invalid payload", async () => {
    const result = await action(args({ period: -1 }))

    expect(fetch).not.toHaveBeenCalled()
    expect(result).not.toBeInstanceOf(Response)
    expect(result).toHaveProperty("properties")
  })

  it("propagates an error when the backend rejects the update request", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(null, { status: 500, statusText: "Internal Server Error" })
    )

    await expect(action(args({ subject: "Algebra" }))).rejects.toThrow()
  })
})
