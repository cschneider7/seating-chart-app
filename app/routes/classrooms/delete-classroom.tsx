import type { MutationResult } from "~/lib/action-results"
import { deleteClassroom } from "~/lib/api"
import type { Route } from "./+types/delete-classroom"

export async function action({
  params,
}: Route.ActionArgs): Promise<MutationResult> {
  try {
    await deleteClassroom(params.classroomId)
    return { ok: true, id: params.classroomId }
  } catch (error) {
    return { ok: false, error: (error as Error).message }
  }
}
