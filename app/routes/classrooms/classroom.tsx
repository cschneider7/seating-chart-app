import type { Classroom } from "~/lib/types"
import type { Route } from "./+types/classroom"

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Classrooms" },
    { name: "description", content: "Seating chart app" },
  ]
}

export async function loader({ params }: Route.ClientLoaderArgs) {
  const res = await fetch(
    `http://localhost:3000/api/v1/students/${params.classroomId}`
  )
  if (!res.ok) {
    throw new Response("Classroom Not Found", { status: 404 })
  }

  const json = await res.json()
  return json.data
}

export default function Component({ loaderData }: Route.ComponentProps) {
  const { period, subject, classroomId } = loaderData
  return (
    <div>
      <div className="p-4">
        <h2>
          Period {period} - <i>{subject}</i>
        </h2>
        <p>Classroom ID: {classroomId}</p>
      </div>
    </div>
  )
}
