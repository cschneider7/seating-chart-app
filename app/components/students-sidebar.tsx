import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "~/components/ui/sidebar"
import { Label } from "~/components/ui/label"
import { Link, NavLink } from "react-router"
import { Plus, Search } from "lucide-react"

import type { Student } from "~/lib/types"

function SearchForm() {
  return (
    <form>
      <SidebarGroup className="py-0">
        <SidebarGroupContent className="relative">
          <Label htmlFor="search" className="sr-only">
            Search
          </Label>
          <SidebarInput id="search" placeholder="Search..." className="pl-8" />
          <Search className="pointer-events-none absolute top-1/2 left-2 size-4 -translate-y-1/2 opacity-50 select-none" />
        </SidebarGroupContent>
      </SidebarGroup>
    </form>
  )
}

export function StudentSidebar({ students }: { students: Student[] }) {
  return (
    <Sidebar collapsible="none">
      <SidebarHeader>
        <SearchForm />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Students</SidebarGroupLabel>
          <SidebarGroupAction
            render={
              <Link to="/students/new">
                <Plus /> <span className="sr-only">Create new student</span>
              </Link>
            }
          />
          <SidebarMenu>
            {students.map((student) => (
              <SidebarMenuItem key={student.student_id}>
                <SidebarMenuButton
                  render={
                    <NavLink to={`/students/${student.uuid}`}>
                      {student.name}
                    </NavLink>
                  }
                />
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter />
    </Sidebar>
  )
}
