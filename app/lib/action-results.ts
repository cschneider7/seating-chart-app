import type * as z from "zod"

export type MutationResult =
  | { ok: true; id: string }
  | {
      ok: false
      error: string
      fieldErrors?: ReturnType<typeof z.treeifyError>
    }
