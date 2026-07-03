import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "~/components/ui/sidebar";
import type { Route } from "./+types/students";
import { NavLink, Outlet } from "react-router";
import type { Student } from "~/lib/types";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Students" },
    { name: "description", content: "Seating chart app" },
  ];
}

export async function loader() {
  const res = await fetch("http://localhost:3000/api/v1/students");
  if (!res.ok) {
    throw new Error(`Error when getting list of students: ", ${res.status}`);
  }

  const json = await res.json();
  console.log(json);
  return json.data;
}

export default function StudentsLayout({
  loaderData,
}: Route.ComponentProps) {
  const students: Student[] = loaderData;

  return (
    <SidebarProvider defaultOpen className="w-auto">
      <Sidebar variant="sidebar" collapsible="none" className="sticky">
        <SidebarHeader />
        <SidebarContent>
          <SidebarMenu>
            {students.map((student) => (
              <SidebarMenuItem key={student.student_id}>
                <SidebarMenuButton
                  render={<NavLink to={`/students/${student.uuid}`}>{student.name}</NavLink>}
                />
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter />
      </Sidebar>
      <main>
        <Outlet />
      </main>
    </SidebarProvider>
  );
}
