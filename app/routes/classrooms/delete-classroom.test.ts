import { describe, expect, it, vi } from "vitest"
import { makeArgs, stubFetch } from "~/lib/test-utils"
import { action } from "./delete-classroom"

const classroomId = "classroom-1"

const args = () =>
  makeArgs(`http://test/classrooms/${classroomId}/delete`, {
    method: "POST",
    params: { classroomId },
  })

stubFetch()

describe("delete-classroom action", () => {
  it("issues a DELETE request and redirects to the classroom list", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 200 }))

    const result = await action(args())

    expect(fetch).toHaveBeenCalledTimes(1)
    const [url, init] = vi.mocked(fetch).mock.calls[0]
    expect(url).toBe(`http://localhost:3000/api/v1/classrooms/${classroomId}`)
    expect(init?.method).toBe("DELETE")

    expect(result).toBeInstanceOf(Response)
    const response = result as Response
    expect(response.status).toBe(302)
    expect(response.headers.get("Location")).toBe("/classrooms")
  })

  // The action's try/catch swallows the error deleteClassroom() throws on a
  // non-ok response (see app/lib/db.ts), so it redirects either way.
  it("redirects even when the delete request fails", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(null, { status: 500, statusText: "Internal Server Error" })
    )

    const result = await action(args())

    expect(result).toBeInstanceOf(Response)
    expect((result as Response).status).toBe(302)
  })
})
