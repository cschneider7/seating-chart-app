import * as z from "zod"
import {
  createClassroomSchema,
  createSeatSchema,
  createStudentSchema,
  createTableSchema,
  editClassroomSchema,
  editSeatSchema,
  editStudentSchema,
  editTableSchema,
  seatingChartSchema,
} from "~/lib/schemas"
import type {
  Classroom,
  Seat,
  SeatAssignment,
  Student,
  Table,
} from "~/lib/types"

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
  studentInfo: z.infer<typeof createStudentSchema>
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
  updates: z.infer<typeof editStudentSchema>
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
  classroomInfo: z.infer<typeof createClassroomSchema>
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
  updates: z.infer<typeof editClassroomSchema>
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

export async function getTable(tableId: string): Promise<Table> {
  const res = await fetch(`http://localhost:3000/api/v1/tables/${tableId}`)
  if (!res.ok) {
    throw new Response("Table not found", { status: 404 })
  }

  const json = await res.json()
  return json.data
}

export async function getClassroomTables(
  classroomId: string
): Promise<Table[]> {
  const res = await fetch(
    `http://localhost:3000/api/v1/classrooms/${classroomId}/tables`
  )
  if (!res.ok) {
    throw new Error(`Error getting classroom tables: ", ${res}`)
  }

  const json = await res.json()
  return json.data
}

export async function createTable(
  tableInfo: z.infer<typeof createTableSchema>
): Promise<Table> {
  const response = await fetch("http://localhost:3000/api/v1/tables", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(tableInfo),
  })

  if (!response.ok) {
    throw new Error("Error creating table: " + response.statusText)
  }

  const json = await response.json()
  return json.data
}

export async function updateTable(
  tableId: string,
  updates: z.infer<typeof editTableSchema>
) {
  const response = await fetch(
    `http://localhost:3000/api/v1/tables/${tableId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updates),
    }
  )

  if (!response.ok) {
    throw new Error("Error updating table: " + response.statusText)
  }
}

export async function deleteTable(tableId: string) {
  const response = await fetch(
    `http://localhost:3000/api/v1/tables/${tableId}`,
    {
      method: "DELETE",
    }
  )

  if (!response.ok) {
    throw new Error("Error deleting table: " + response.statusText)
  }
}

export async function getSeat(seatId: string): Promise<Seat> {
  const res = await fetch(`http://localhost:3000/api/v1/seats/${seatId}`)
  if (!res.ok) {
    throw new Response("Seat not found", { status: 404 })
  }

  const json = await res.json()
  return json.data
}

export async function getTableSeats(tableId: string): Promise<Table[]> {
  const res = await fetch(
    `http://localhost:3000/api/v1/tables/${tableId}/seats`
  )
  if (!res.ok) {
    throw new Error(`Error getting table seats: ", ${res}`)
  }

  const json = await res.json()
  return json.data
}

export async function createSeat(
  seatInfo: z.infer<typeof createSeatSchema>
): Promise<Seat> {
  const response = await fetch("http://localhost:3000/api/v1/seats", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(seatInfo),
  })

  if (!response.ok) {
    throw new Error("Error creating seat: " + response.statusText)
  }

  const json = await response.json()
  return json.data
}

export async function updateSeat(
  seatId: string,
  updates: z.infer<typeof editSeatSchema>
) {
  const response = await fetch(`http://localhost:3000/api/v1/seats/${seatId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(updates),
  })

  if (!response.ok) {
    throw new Error("Error updating seat: " + response.statusText)
  }
}

export async function deleteSeat(seatId: string) {
  const response = await fetch(`http://localhost:3000/api/v1/seats/${seatId}`, {
    method: "DELETE",
  })

  if (!response.ok) {
    throw new Error("Error deleting seat: " + response.statusText)
  }
}

export async function updateSeatingChart(
  classroomId: string,
  chartInfo: z.infer<typeof seatingChartSchema>
) {
  const response = await fetch(
    `http://localhost:3000/api/v1/classrooms/${classroomId}/seating-chart`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(chartInfo),
    }
  )

  if (!response.ok) {
    throw new Error("Error updating seating chart: " + response.statusText)
  }
}

export async function getSeatingChartAssignments(
  classroomId: string
): Promise<SeatAssignment[]> {
  const res = await fetch(
    `http://localhost:3000/api/v1/classrooms/${classroomId}/seating-chart`
  )
  if (!res.ok) {
    throw new Error(`Error getting seating chart assignments: ", ${res.status}`)
  }

  const json = await res.json()
  return json.data
}
