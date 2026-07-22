import type { Route } from "./+types/students"

import { Outlet } from "react-router"
import { RouteErrorCard } from "~/components/route-error-card"
import {
  MobileStudentDrawer,
  StudentSidebar,
} from "~/components/students-sidebar"
import { getStudents } from "~/lib/api"

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Students" },
    { name: "description", content: "Seating chart app" },
  ]
}

export async function loader() {
  const students = await getStudents()
  return { students }
}

export default function Layout({ loaderData }: Route.ComponentProps) {
  const { students } = loaderData
  return (
    <div className="flex h-full">
      <StudentSidebar students={students} />
      <main className="w-full pl-0 md:pl-4">
        <MobileStudentDrawer students={students} />
        <Outlet />
      </main>
    </div>
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
