import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { action } from "./delete-student"

const studentId = "student-1"

function actionArgs() {
  return {
    params: { studentId },
    request: new Request(`http://test/students/${studentId}/delete`, {
      method: "POST",
    }),
    context: {},
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any
}

describe("delete-student action", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("issues a DELETE request and redirects to the student list", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 200 }))

    const result = await action(actionArgs())

    expect(fetch).toHaveBeenCalledTimes(1)
    const [url, init] = vi.mocked(fetch).mock.calls[0]
    expect(url).toBe(`http://localhost:3000/api/v1/students/${studentId}`)
    expect(init?.method).toBe("DELETE")

    expect(result).toBeInstanceOf(Response)
    const response = result as Response
    expect(response.status).toBe(302)
    expect(response.headers.get("Location")).toBe("/students")
  })

  // Action never checks `response.ok`, so it redirects regardless.
  it("redirects even when the delete request fails", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(null, { status: 500, statusText: "Internal Server Error" })
    )

    const result = await action(actionArgs())

    expect(result).toBeInstanceOf(Response)
    expect((result as Response).status).toBe(302)
  })
})
