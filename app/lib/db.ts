import * as z from "zod"
import { createStudentFormSchema, editStudentFormSchema } from "~/lib/schemas"
import type { Classroom, ClassroomConfig, Student } from "~/lib/types"

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
  studentInfo: z.infer<typeof createStudentFormSchema>
): Promise<Student> {
  const response = await fetch("http://localhost:3000/api/v1/students", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(studentInfo),
  })

  if (!response.ok) {
    throw new Error("Error creating student: " + response.statusText)
  }

  const json = await response.json()
  console.log(json)

  return json.data
}

export async function updateStudent(
  studentId: string,
  updates: z.infer<typeof editStudentFormSchema>
) {
  const response = await fetch(
    `http://localhost:3000/api/v1/students/${studentId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updates),
    }
  )

  if (!response.ok) {
    throw new Error("Error creating student: " + response.statusText)
  }
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

export async function createClassroom(
  classroomInfo: ClassroomConfig
): Promise<Classroom> {
  const response = await fetch("http://localhost:3000/api/v1/classrooms", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(classroomInfo),
  })

  if (!response.ok) {
    throw new Error("Error creating classroom: " + response.statusText)
  }

  const json = await response.json()
  console.log(json)

  return json.data
}
