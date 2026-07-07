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
import { getStudents } from "~/lib/db"

export async function loader() {
  const students = await getStudents()
  return { students: students }
}

export default function Component() {
  return (
    <div className="w-full">
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
    </div>
  )
}
