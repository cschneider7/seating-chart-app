import { createContext } from "react"

export const LockedContext = createContext(false)

export type DragCandidate = { tableId: string; seatIndex: number } | null
export const DragCandidateContext = createContext<DragCandidate>(null)
