import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card"
import { getClassroom } from "~/lib/db"
import type { Route } from "./+types/classroom"

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Classrooms" },
    { name: "description", content: "Seating chart app" },
  ]
}

export async function loader({ params }: Route.ClientLoaderArgs) {
  const classroom = await getClassroom(params.classroomId)
  return { classroom: classroom }
}

export default function Component({ loaderData }: Route.ComponentProps) {
  const { classroom } = loaderData
  return (
    <div>
      <div className="p-4">
        <h2>Period {classroom.period}</h2>
        <h3>Subject: {classroom.subject}</h3>
      </div>
    </div>
  )
}
