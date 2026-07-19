import { redirect } from "react-router"
import { deleteClassroom } from "~/lib/api"
import type { Route } from "./+types/delete-classroom"

export async function action({ params }: Route.ClientLoaderArgs) {
  try {
    await deleteClassroom(params.classroomId)
  } catch {
    // Redirect regardless of whether the delete succeeded.
  }
  return redirect("/classrooms")
}
