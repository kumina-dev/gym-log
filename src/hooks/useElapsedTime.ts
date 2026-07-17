import {
  useEffect,
  useState,
} from 'react'

export function useElapsedTime(
  startedAt: number | null,
) {
  const [elapsedSeconds, setElapsedSeconds] =
    useState(0)

  useEffect(() => {
    if (startedAt === null) {
      setElapsedSeconds(0)
      return
    }

    function updateElapsedTime() {
      if (startedAt === null) {
        return
      }

      const elapsed = Math.floor(
        (Date.now() - startedAt) / 1000,
      )

      setElapsedSeconds(
        Math.max(0, elapsed),
      )
    }

    updateElapsedTime()

    const interval = setInterval(
      updateElapsedTime,
      1000,
    )

    return () => {
      clearInterval(interval)
    }
  }, [startedAt])

  return elapsedSeconds
}
