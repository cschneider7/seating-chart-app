import { UserPen } from "lucide-react"
import { StudentFormDialog } from "~/components/student-form-dialog"
import { Button } from "~/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty"

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
          <StudentFormDialog
            mode="create"
            trigger={<Button>Create Student</Button>}
          />
        </EmptyContent>
      </Empty>
    </div>
  )
}
