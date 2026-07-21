import { redirect } from "react-router"
import { deleteClassroom } from "~/lib/api"
import type { Route } from "./+types/delete-classroom"

export async function action({ params }: Route.ClientLoaderArgs) {
  await deleteClassroom(params.classroomId)
  return redirect("/classrooms")
}
