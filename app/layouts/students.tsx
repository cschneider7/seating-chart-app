import { SidebarProvider } from "~/components/ui/sidebar"
import type { Route } from "./+types/students"

import type { Student } from "~/lib/types"
import { StudentSidebar } from "~/components/students-sidebar"
import { Outlet } from "react-router"

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Students" },
    { name: "description", content: "Seating chart app" },
  ]
}

export async function loader() {
  const res = await fetch("http://localhost:3000/api/v1/students")
  if (!res.ok) {
    throw new Error(`Error when getting list of students: ", ${res.status}`)
  }

  const json = await res.json()
  return json.data
}

export default function Layout({ loaderData }: Route.ComponentProps) {
  const students: Student[] = loaderData
  return (
    <SidebarProvider>
      <StudentSidebar students={students} />
      <main className="flex-1 pl-6">
        <Outlet />
      </main>
    </SidebarProvider>
  )
}
