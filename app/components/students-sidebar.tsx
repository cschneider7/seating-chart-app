import { Plus, Search } from "lucide-react"
import { useMemo, useState } from "react"
import { NavLink } from "react-router"
import { StudentFormDialog } from "~/components/student-form-dialog"
import { Empty, EmptyDescription } from "~/components/ui/empty"
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
import type { Student } from "~/lib/schemas"

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

export function StudentSidebar({ students }: { students: Student[] }) {
  const [query, setQuery] = useState("")
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
              {filteredStudents.map((student) => (
                <SidebarMenuItem key={student.id}>
                  <SidebarMenuButton
                    render={
                      <NavLink to={`/students/${student.id}`}>
                        {student.name}
                      </NavLink>
                    }
                  />
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          ) : (
            <Empty className="gap-0 rounded-none border-none p-4">
              <EmptyDescription>No students found.</EmptyDescription>
            </Empty>
          )}
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter />
    </Sidebar>
  )
}
