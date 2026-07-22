import { SidebarProvider } from "~/components/ui/sidebar"
import type { Route } from "./+types/students"

import { Outlet } from "react-router"
import { RouteErrorCard } from "~/components/route-error-card"
import { StudentSidebar } from "~/components/students-sidebar"
import { getClassrooms, getStudents } from "~/lib/api"

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Students" },
    { name: "description", content: "Seating chart app" },
  ]
}

export async function loader() {
  const [students, classrooms] = await Promise.all([
    getStudents(),
    getClassrooms(),
  ])
  return { students, classrooms }
}

export default function Layout({ loaderData }: Route.ComponentProps) {
  const { students, classrooms } = loaderData
  return (
    <SidebarProvider>
      <StudentSidebar students={students} classrooms={classrooms} />
      <main className="w-full pl-4">
        <Outlet />
      </main>
    </SidebarProvider>
  )
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  return (
    <RouteErrorCard
      error={error}
      title="Something went wrong"
      fallbackDetails="We couldn't load this page. Try again or head back to the student list."
      backTo="/students"
      backLabel="Back to students"
    />
  )
}
