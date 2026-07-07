export type Student = {
  uuid: string
  student_id: number
  name: string
  classroom_uuid: string
  seat_uuid: number
}

export type Classroom = {
  uuid: string
  period: number
  subject: string
}
