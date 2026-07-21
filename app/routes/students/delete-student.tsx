import { redirect } from "react-router"
import { deleteStudent } from "~/lib/api"
import type { Route } from "./+types/delete-student"

export async function action({ params }: Route.ClientLoaderArgs) {
  await deleteStudent(params.studentId)
  return redirect("/students")
}
