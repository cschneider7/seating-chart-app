import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { action } from "./create-classroom"

const validPayload = {
  subject: "Math 2",
  period: 3,
}

function actionArgs(body: unknown) {
  return {
    request: new Request("http://test/classrooms/new", {
      method: "POST",
      body: JSON.stringify(body),
    }),
    params: {},
    context: {},
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any
}

describe("create-classroom action", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("creates the classroom and redirects to its detail page", async () => {
    const createdClassroom = { id: "classroom-1", ...validPayload }
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ data: createdClassroom }), {
        status: 200,
      })
    )

    const result = await action(actionArgs(validPayload))

    expect(fetch).toHaveBeenCalledTimes(1)
    const [url, init] = vi.mocked(fetch).mock.calls[0]
    expect(url).toBe("http://localhost:3000/api/v1/classrooms")
    expect(init?.method).toBe("POST")
    expect(JSON.parse(init?.body as string)).toEqual(validPayload)

    expect(result).toBeInstanceOf(Response)
    const response = result as Response
    expect(response.status).toBe(302)
    expect(response.headers.get("Location")).toBe(
      `/classrooms/${createdClassroom.id}`
    )
  })

  it("returns validation errors and never calls fetch for an invalid payload", async () => {
    const result = await action(actionArgs({ subject: "", period: -1 }))

    expect(fetch).not.toHaveBeenCalled()
    expect(result).not.toBeInstanceOf(Response)
    expect(result).toHaveProperty("properties")
  })

  it("propagates an error when the backend rejects the create request", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(null, { status: 500, statusText: "Internal Server Error" })
    )

    await expect(action(actionArgs(validPayload))).rejects.toThrow()
  })
})
