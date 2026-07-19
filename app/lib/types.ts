export interface Table {
  id: string
  tableNumber: number
  x_pos: number
  y_pos: number
  seats: Seat[]
}

export interface Seat {
  id: string
  tableId: string
  seatNumber: number
  studentId: string | null
}
