import { generateRandomSeatingChart } from "~/lib/api"
import type { SeatingChart } from "~/lib/schemas"
import type { Route } from "./+types/randomize-seating-chart"

export type RandomizeSeatingChartResult =
  { ok: true; seatingChart: SeatingChart } | { ok: false; error: string }

export async function action({
  params,
  request,
}: Route.ActionArgs): Promise<RandomizeSeatingChartResult> {
  const options = await request.json()

  try {
    const seatingChart = await generateRandomSeatingChart(
      params.classroomId,
      options
    )
    return { ok: true, seatingChart }
  } catch (error) {
    return { ok: false, error: (error as Error).message }
  }
}
