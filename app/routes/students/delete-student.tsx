import type { MutationResult } from "~/lib/action-results"
import { deleteStudent } from "~/lib/api"
import type { Route } from "./+types/delete-student"

export async function action({
  params,
}: Route.ActionArgs): Promise<MutationResult> {
  try {
    await deleteStudent(params.studentId)
    return { ok: true, id: params.studentId }
  } catch (error) {
    return { ok: false, error: (error as Error).message }
  }
}
