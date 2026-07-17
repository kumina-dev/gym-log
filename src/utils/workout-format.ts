export function formatElapsedTime(
  seconds: number,
) {
  const hours = Math.floor(seconds / 3600)

  const minutes = Math.floor(
    (seconds % 3600) / 60,
  )

  const remainingSeconds =
    seconds % 60

  if (hours > 0) {
    return `${hours}:${minutes
      .toString()
      .padStart(2, '0')}:${remainingSeconds
      .toString()
      .padStart(2, '0')}`
  }

  return `${minutes}:${remainingSeconds
    .toString()
    .padStart(2, '0')}`
}

export function formatTimer(
  seconds: number,
) {
  const minutes =
    Math.floor(seconds / 60)

  const remainingSeconds =
    seconds % 60

  return `${minutes}:${remainingSeconds
    .toString()
    .padStart(2, '0')}`
}

export function formatMinutesInput(
  seconds: number,
) {
  const minutes = seconds / 60

  return Number.isInteger(minutes)
    ? minutes.toString()
    : Number(
        minutes.toFixed(2),
      ).toString()
}

export function formatCardioValues(
  durationSeconds: number | null,
  distance: number | null,
  level: number | null,
) {
  const values: string[] = []

  if (durationSeconds !== null) {
    values.push(
      `${formatMinutesInput(
        durationSeconds,
      )} min`,
    )
  }

  if (distance !== null) {
    values.push(`${distance} km`)
  }

  if (level !== null) {
    values.push(
      `level ${level}`,
    )
  }

  return values.join(' · ')
}

export function parseOptionalDecimal(
  value: string,
) {
  const normalized =
    value.replace(',', '.').trim()

  if (normalized === '') {
    return null
  }

  const parsed = Number(normalized)

  return Number.isFinite(parsed)
    ? parsed
    : null
}

export function parseOptionalInteger(
  value: string,
) {
  const normalized = value.trim()

  if (normalized === '') {
    return null
  }

  const parsed = Number.parseInt(
    normalized,
    10,
  )

  return Number.isInteger(parsed)
    ? parsed
    : null
}
