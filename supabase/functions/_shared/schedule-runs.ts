export interface ScheduledRunInput {
  run_number?: number
  scheduled_at: string
  quantity_to_send: number
  base_quantity?: number
  variance_applied?: number
  peak_multiplier?: number
}

export interface NormalizedScheduledRun {
  run_number: number
  scheduled_at: string
  quantity_to_send: number
  base_quantity: number
  variance_applied: number
  peak_multiplier: number
  status: 'pending'
}

/**
 * Keeps the preview's exact run count, times and quantities whenever it is
 * already valid. Invalid/repeated quantities are repaired without changing
 * the requested total or creating extra runs.
 */
export function normalizePreviewRuns(
  runs: ScheduledRunInput[],
  totalTargetQty: number,
  providerMin: number,
): NormalizedScheduledRun[] {
  const normalized = runs
    .slice(0, 1000)
    .map((run, index) => {
      const scheduledAt = new Date(run.scheduled_at)
      return {
        run_number: index + 1,
        scheduled_at: Number.isNaN(scheduledAt.getTime())
          ? new Date().toISOString()
          : scheduledAt.toISOString(),
        quantity_to_send: Math.round(Number(run.quantity_to_send) || 0),
        base_quantity: Math.round(Number(run.base_quantity ?? run.quantity_to_send) || 0),
        variance_applied: Number(run.variance_applied ?? 0),
        peak_multiplier: Number(run.peak_multiplier ?? 1),
        status: 'pending' as const,
      }
    })
    .filter((run) => run.quantity_to_send > 0)

  if (normalized.length === 0) return []

  // When the total is too small for this many runs, most runs get clamped to
  // the provider minimum and look identical (100, 100, 100...). Drop evenly
  // spaced runs so every remaining run has room for a random, unique size.
  const floorMin = Math.max(1, providerMin)
  const maxRuns = Math.max(1, Math.floor(totalTargetQty / (floorMin * 1.6)))
  if (providerMin > 1 && normalized.length > maxRuns && totalTargetQty >= floorMin) {
    const keep: typeof normalized = []
    const step = normalized.length / maxRuns
    for (let i = 0; i < maxRuns; i++) keep.push(normalized[Math.floor(i * step)])
    const weights = keep.map(() => 0.4 + Math.random())
    const wSum = weights.reduce((a, b) => a + b, 0)
    const spare = totalTargetQty - floorMin * keep.length
    const qty = weights.map((w) => floorMin + Math.floor((w / wSum) * spare))
    let rest = totalTargetQty - qty.reduce((a, b) => a + b, 0)
    for (let i = 0; rest > 0; i = (i + 1) % qty.length) { qty[i]++; rest-- }
    for (let i = 1; i < qty.length; i++) {
      let guard = 0
      while (qty.slice(0, i).includes(qty[i]) && guard++ < 1000) {
        const d = qty.findIndex((q, j) => j !== i && q > floorMin + 1 && !qty.includes(q - 1))
        if (d < 0) break
        qty[i]++; qty[d]--
      }
    }
    return keep.map((run, index) => ({
      ...run,
      run_number: index + 1,
      quantity_to_send: qty[index],
      base_quantity: qty[index],
    }))
  }

  const minimum = Math.max(1, Math.min(providerMin, Math.floor(totalTargetQty / normalized.length)))
  const previewTotal = normalized.reduce((sum, run) => sum + run.quantity_to_send, 0)
  const previewQuantities = normalized.map((run) => run.quantity_to_send)
  const previewIsValid = previewTotal === totalTargetQty
    && previewQuantities.every((quantity) => quantity >= minimum)
    && new Set(previewQuantities).size === previewQuantities.length

  // This is the normal path: what the user saw is exactly what gets stored.
  if (previewIsValid) {
    return normalized.map((run) => ({
      ...run,
      base_quantity: run.quantity_to_send,
    }))
  }

  const quantities = normalized.map((run) => Math.max(minimum, run.quantity_to_send))
  let drift = totalTargetQty - quantities.reduce((sum, quantity) => sum + quantity, 0)
  let pass = 0

  // Reconcile the total while preferring unique values. No fixed per-run cap
  // is applied: a 100K / 20-run preview may legitimately contain 4K-8K runs.
  while (drift !== 0 && pass < 20000) {
    let changed = false
    const indexes = quantities
      .map((quantity, index) => ({ quantity, index }))
      .sort((a, b) => drift > 0 ? a.quantity - b.quantity : b.quantity - a.quantity)
      .map(({ index }) => index)

    for (const index of indexes) {
      const delta = drift > 0 ? 1 : -1
      const candidate = quantities[index] + delta
      if (candidate < minimum) continue
      if (quantities.some((quantity, otherIndex) => otherIndex !== index && quantity === candidate)) continue
      quantities[index] = candidate
      drift -= delta
      changed = true
      if (drift === 0) break
    }

    if (!changed) break
    pass++
  }

  // If uniqueness made exact reconciliation impossible, preserve count and
  // total first, then repair collisions with zero-sum pair adjustments.
  if (drift !== 0) quantities[quantities.length - 1] += drift

  for (let index = 1; index < quantities.length; index++) {
    let attempts = 0
    while (quantities.slice(0, index).includes(quantities[index]) && attempts < 10000) {
      const donor = quantities.findIndex((quantity, donorIndex) => donorIndex !== index && quantity > minimum)
      if (donor < 0) break
      quantities[index] += 1
      quantities[donor] -= 1
      attempts++
    }
  }

  return normalized.map((run, index) => ({
    ...run,
    quantity_to_send: quantities[index],
    base_quantity: quantities[index],
  }))
}