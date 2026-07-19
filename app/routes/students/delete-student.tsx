import { redirect } from "react-router"
import { deleteStudent } from "~/lib/api"
import type { Route } from "./+types/delete-student"

export async function action({ params }: Route.ClientLoaderArgs) {
  try {
    await deleteStudent(params.studentId)
  } catch {
    // Redirect regardless of whether the delete succeeded.
  }
  return redirect("/students")
}
