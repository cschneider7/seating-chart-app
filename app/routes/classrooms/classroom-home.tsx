import { ArrowUpRightIcon, ClipboardList } from "lucide-react"
import { Link } from "react-router"
import { Button } from "~/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty"
import type { Classroom } from "~/lib/types"
import type { Route } from "./+types/classroom-home"

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Classrooms" },
    { name: "description", content: "Seating chart app" },
  ]
}

export async function loader() {
  const res = await fetch("http://localhost:3000/api/v1/classrooms")
  if (!res.ok) {
    throw new Error(`Error when getting list of classrooms: ", ${res.status}`)
  }

  const json = await res.json()
  return json.data
}

function EmptyClassrooms() {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <ClipboardList />
        </EmptyMedia>
        <EmptyTitle>No Classrooms Yet</EmptyTitle>
        <EmptyDescription>
          You haven&apos;t created any classrooms yet. Get started by creating
          your first classroom.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent className="flex-row justify-center gap-2">
        <Button>Create Classroom</Button>
      </EmptyContent>
    </Empty>
  )
}

export default function Component({ loaderData }: Route.ComponentProps) {
  const classrooms: Classroom[] = loaderData
  return (
    <div className="p-4">
      {classrooms.length === 0 ? (
        <EmptyClassrooms />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {classrooms.map((classroom) => (
            <div
              key={classroom.classroomId}
              className="flex flex-col gap-2 rounded-lg border p-4"
            >
              <h3 className="text-lg font-semibold">
                Period {classroom.period} - {classroom.subject}
              </h3>
              <p>Classroom ID: {classroom.classroomId}</p>
              <Button
                size="sm"
                className="mt-auto w-fit gap-1"
                render={
                  <Link to={`/classrooms/${classroom.uuid}`}>
                    View Classroom
                  </Link>
                }
              >
                <ArrowUpRightIcon className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
