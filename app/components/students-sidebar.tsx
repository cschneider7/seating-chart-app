import { Plus, Search, UsersIcon, XIcon } from "lucide-react"
import { useMemo, useState } from "react"
import { NavLink } from "react-router"
import { StudentFormDialog } from "~/components/student-form-dialog"
import { Button } from "~/components/ui/button"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "~/components/ui/input-group"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "~/components/ui/sidebar"
import type { Classroom, Student } from "~/lib/schemas"

function SearchForm({
  query,
  onQueryChange,
}: {
  query: string
  onQueryChange: (value: string) => void
}) {
  return (
    <SidebarGroup className="py-0">
      <SidebarGroupContent>
        <InputGroup>
          <InputGroupInput
            aria-label="Search students"
            placeholder="Search..."
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
          />
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
        </InputGroup>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

export function StudentSidebar({
  students,
  classrooms,
}: {
  students: Student[]
  classrooms: Classroom[]
}) {
  const [query, setQuery] = useState("")
  const classroomsById = useMemo(
    () => new Map(classrooms.map((c) => [c.id, c])),
    [classrooms]
  )
  const filteredStudents = useMemo(
    () =>
      students.filter((student) =>
        student.name.toLowerCase().includes(query.toLowerCase())
      ),
    [students, query]
  )

  return (
    <Sidebar collapsible="none">
      <SidebarHeader>
        <SearchForm query={query} onQueryChange={setQuery} />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Students</SidebarGroupLabel>
          <StudentFormDialog
            mode="create"
            trigger={
              <SidebarGroupAction>
                <Plus /> <span className="sr-only">Create new student</span>
              </SidebarGroupAction>
            }
          />
          {filteredStudents.length > 0 ? (
            <SidebarMenu>
              {filteredStudents.map((student) => {
                const classroom = student.classroom_id
                  ? classroomsById.get(student.classroom_id)
                  : null
                return (
                  <SidebarMenuItem key={student.id}>
                    <SidebarMenuButton
                      size="lg"
                      render={<NavLink to={`/students/${student.id}`} />}
                    >
                      <span className="flex flex-col overflow-hidden">
                        <span className="truncate">{student.name}</span>
                        <span className="truncate text-xs text-muted-foreground">
                          {classroom
                            ? `Period ${classroom.period}`
                            : "Unassigned"}
                        </span>
                      </span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          ) : students.length === 0 ? (
            <Empty className="gap-2 rounded-none border-none p-4">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <UsersIcon />
                </EmptyMedia>
                <EmptyTitle>No students yet</EmptyTitle>
                <EmptyDescription>
                  Use the + button above to add your first student.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <Empty className="gap-2 rounded-none border-none p-4">
              <EmptyDescription>
                No students match &quot;{query}&quot;.
              </EmptyDescription>
              <Button variant="outline" size="sm" onClick={() => setQuery("")}>
                <XIcon />
                <span>Clear search</span>
              </Button>
            </Empty>
          )}
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter />
    </Sidebar>
  )
}
