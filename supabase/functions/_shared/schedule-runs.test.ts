import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { normalizePreviewRuns, type ScheduledRunInput } from './schedule-runs.ts'

function preview(quantities: number[]): ScheduledRunInput[] {
  return quantities.map((quantity, index) => ({
    run_number: index + 1,
    scheduled_at: new Date(Date.UTC(2026, 8, 13, 10, index * 30)).toISOString(),
    quantity_to_send: quantity,
    base_quantity: quantity,
  }))
}

Deno.test('100K preview keeps the exact 20 random runs instead of 400-sized batches', () => {
  const quantities = [4882, 4874, 4993, 4545, 4426, 5321, 5147, 4698, 5572, 4819,
    5214, 4473, 5091, 5368, 4627, 5489, 4756, 5278, 4931, 5496]
  const result = normalizePreviewRuns(preview(quantities), 100000, 100)

  assertEquals(result.length, 20)
  assertEquals(result.map((run) => run.quantity_to_send), quantities)
  assertEquals(result.reduce((sum, run) => sum + run.quantity_to_send, 0), 100000)
  assertEquals(result.some((run) => run.quantity_to_send === 400), false)
})

Deno.test('duplicate preview quantities are repaired without changing count or total', () => {
  const result = normalizePreviewRuns(preview(new Array(20).fill(5000)), 100000, 100)
  const quantities = result.map((run) => run.quantity_to_send)

  assertEquals(result.length, 20)
  assertEquals(quantities.reduce((sum, quantity) => sum + quantity, 0), 100000)
  assertEquals(new Set(quantities).size, 20)
  assertEquals(quantities.every((quantity) => quantity >= 100), true)
})