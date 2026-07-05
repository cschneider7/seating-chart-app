import { redirect } from "react-router"
import type { Route } from "./+types/delete"

export async function action({ params }: Route.ClientLoaderArgs) {
  await fetch(`http://localhost:3000/api/v1/students/${params.studentId}`, {
    method: "DELETE",
  })
  return redirect("/students")
}
