import * as z from "zod"

export type Student = z.infer<typeof CreateStudentSchema> & { id: string }
export type Classroom = z.infer<typeof CreateClassroomSchema> & { id: string }

export const CreateStudentSchema = z.object({
  classroom_id: z.uuidv4().nullable(),
  student_id: z.coerce.number<number>().int().positive(),
  name: z
    .string()
    .trim()
    .min(1, "Name must be at least 0 characters.")
    .max(100, "Name must be at most 100 characters."),
})

export const UpdateStudentSchema = z.object({
  classroom_id: z.uuidv4().nullish(),
  student_id: z.optional(
    z.coerce
      .number<number>("ID must be a number.")
      .int()
      .positive("ID must be a positive number.")
  ),
  name: z.optional(
    z
      .string()
      .trim()
      .min(1, "Name must be at least 0 characters.")
      .max(100, "Name must be at most 100 characters.")
  ),
})

export const CreateClassroomSchema = z.object({
  period: z.coerce.number<number>().int().positive(),
  subject: z
    .string()
    .trim()
    .min(1, "Subject must be at least 0 characters.")
    .max(50, "Subject must be at most 30 characters."),
})

export const UpdateClassroomSchema = z.object({
  period: z.optional(z.coerce.number<number>().int().positive()),
  subject: z.optional(
    z
      .string()
      .trim()
      .min(1, "Subject must be at least 0 characters.")
      .max(50, "Subject must be at most 30 characters.")
  ),
})

export const SeatingChartSchema = z.object({
  tables: z.array(
    z.object({
      table_number: z.int(),
      x_pos: z.int(),
      y_pos: z.int(),
      seat_assignments: z.array(z.uuidv4().nullable()),
    })
  ),
})
export type SeatingChart = z.infer<typeof SeatingChartSchema>
