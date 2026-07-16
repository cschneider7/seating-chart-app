import { afterEach, beforeEach, vi } from "vitest"

// Registers the fetch-stub lifecycle every action/loader test file needs.
export function stubFetch() {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn())
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })
}

// Builds a fake React Router Route.{Action,Loader}Args object. Covers both
// loaderArgs() (no body, GET) and actionArgs(body) (POST/PATCH/DELETE) shapes
// used across the existing per-file helpers.
export function makeArgs(
  url: string,
  options: {
    method?: string
    params?: Record<string, string>
    body?: unknown
  } = {}
) {
  const { method = "GET", params = {}, body } = options
  return {
    request: new Request(url, {
      method,
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    }),
    params,
    context: {},
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any
}
