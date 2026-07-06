import { UserPen } from "lucide-react"
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

export async function loader() {
  const res = await fetch("http://localhost:3000/api/v1/students")
  if (!res.ok) {
    throw new Error(`Error when getting list of students: ", ${res.status}`)
  }

  const json = await res.json()
  return json.data
}

export default function Component() {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <UserPen />
        </EmptyMedia>
        <EmptyTitle>Create or Select a Student</EmptyTitle>
        <EmptyDescription>
          Get started by either selecting a student or creating a new one.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent className="flex-row justify-center gap-2">
        <Button
          render={<Link to="/students/new">Create Student</Link>}
        ></Button>
      </EmptyContent>
    </Empty>
  )
}
