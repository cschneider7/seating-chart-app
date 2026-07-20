import * as z from "zod"
import {
  CreateClassroomSchema,
  CreateStudentSchema,
  SeatingChartSchema,
  UpdateClassroomSchema,
  UpdateStudentSchema,
  type Classroom,
  type SeatingChart,
  type Student,
} from "~/lib/schemas"

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
  studentInfo: z.infer<typeof CreateStudentSchema>
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
  return json.data
}

export async function updateStudent(
  studentId: string,
  updates: z.infer<typeof UpdateStudentSchema>
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

export async function deleteStudent(studentId: string) {
  const response = await fetch(
    `http://localhost:3000/api/v1/students/${studentId}`,
    {
      method: "DELETE",
    }
  )

  if (!response.ok) {
    throw new Error("Error deleting student: " + response.statusText)
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
  classroomInfo: z.infer<typeof CreateClassroomSchema>
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
  return json.data
}

export async function updateClassroom(
  classroomId: string,
  updates: z.infer<typeof UpdateClassroomSchema>
) {
  const response = await fetch(
    `http://localhost:3000/api/v1/classrooms/${classroomId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updates),
    }
  )

  if (!response.ok) {
    throw new Error("Error updating classroom: " + response.statusText)
  }
}

export async function deleteClassroom(classroomId: string) {
  const response = await fetch(
    `http://localhost:3000/api/v1/classrooms/${classroomId}`,
    {
      method: "DELETE",
    }
  )

  if (!response.ok) {
    throw new Error("Error deleting classroom: " + response.statusText)
  }
}

export async function getClassroomSeatingChart(
  classroomId: string
): Promise<SeatingChart> {
  const res = await fetch(
    `http://localhost:3000/api/v1/classrooms/${classroomId}/seating-chart`
  )
  if (!res.ok) {
    throw new Error(`Error getting seating chart assignments: ", ${res.status}`)
  }

  const json = await res.json()
  const seatingChart = z.parse(SeatingChartSchema, json.data)

  return seatingChart
}

export async function updateClassroomSeatingChart(
  classroomId: string,
  seatingChart: SeatingChart
) {
  const response = await fetch(
    `http://localhost:3000/api/v1/classrooms/${classroomId}/seating-chart`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(seatingChart),
    }
  )

  if (!response.ok) {
    throw new Error("Error updating seating chart: " + response.statusText)
  }
}
