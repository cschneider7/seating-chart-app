import { redirect } from "react-router"
import type { Route } from "./+types/delete-classroom"

export async function action({ params }: Route.ClientLoaderArgs) {
  await fetch(`http://localhost:3000/api/v1/classrooms/${params.classroomId}`, {
    method: "DELETE",
  })
  return redirect("/classrooms")
}
