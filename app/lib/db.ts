import type { Classroom, Student } from "~/lib/types"

export async function getStudent(studentId: string): Promise<Student> {
  const res = await fetch(`http://localhost:3000/api/v1/students/${studentId}`)
  if (!res.ok) {
    throw new Response("Student not found", { status: 404 })
  }

  const json = await res.json()
  return json.data
}

export async function getStudents(): Promise<Student[]> {
  const res = await fetch("http://localhost:3000/api/v1/students")
  if (!res.ok) {
    throw new Error(`Error getting list of students: ", ${res.status}`)
  }

  const json = await res.json()
  return json.data
}

export async function createStudent(
  studentId: number,
  name: string,
  classroomId: string | null
): Promise<Student> {
  const response = await fetch("http://localhost:3000/api/v1/students", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      student_id: studentId,
      name: name,
      classroom_id: classroomId,
      seat_id: null,
    }),
  })

  if (!response.ok) {
    throw new Error("Error creating student: " + response.statusText)
  }

  const json = await response.json()
  console.log(json)

  return json.data
}

export async function getClassroom(classroomId: string): Promise<Classroom> {
  const res = await fetch(
    `http://localhost:3000/api/v1/classrooms/${classroomId}`
  )
  if (!res.ok) {
    throw new Response("Classroom not found", { status: 404 })
  }

  const json = await res.json()
  return json.data
}

export async function getClassrooms(): Promise<Classroom[]> {
  const res = await fetch("http://localhost:3000/api/v1/classrooms")
  if (!res.ok) {
    throw new Error(`Error getting list of classrooms: ", ${res.status}`)
  }

  const json = await res.json()
  return json.data
}
