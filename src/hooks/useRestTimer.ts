import * as Haptics from 'expo-haptics'
import { Storage } from 'expo-sqlite/kv-store'
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { AppState } from 'react-native'

import {
  cancelRestTimerNotification,
  scheduleRestTimerNotification,
} from '@/rest-timer-notifications'
import type { AppSettings } from '@/settings'

type UseRestTimerOptions = {
  sessionId: number
  settings: AppSettings
}

export function useRestTimer({
  sessionId,
  settings,
}: UseRestTimerOptions) {
  const [endsAt, setEndsAt] =
    useState<number | null>(null)

  const [remainingSeconds, setRemainingSeconds] =
    useState(0)

  const timerStorageKey = useMemo(
    () => `rest-timer:${sessionId}`,
    [sessionId],
  )

  const notificationStorageKey = useMemo(
    () => `rest-notification:${sessionId}`,
    [sessionId],
  )

  const clearNotification =
    useCallback(async () => {
      const identifier = await Storage.getItem(
        notificationStorageKey,
      )

      await cancelRestTimerNotification(
        identifier,
      )

      await Storage.removeItem(
        notificationStorageKey,
      )
    }, [notificationStorageKey])

  const replaceNotification = useCallback(
    async (endTime: number) => {
      await clearNotification()

      if (!settings.restTimerNotifications) {
        return
      }

      const seconds = Math.ceil(
        (endTime - Date.now()) / 1000,
      )

      if (seconds <= 0) {
        return
      }

      const identifier =
        await scheduleRestTimerNotification(
          seconds,
        )

      if (identifier) {
        await Storage.setItem(
          notificationStorageKey,
          identifier,
        )
      }
    },
    [
      clearNotification,
      notificationStorageKey,
      settings.restTimerNotifications,
    ],
  )

  const restore = useCallback(async () => {
    const storedEndTime =
      await Storage.getItem(timerStorageKey)

    const parsedEndTime =
      Number(storedEndTime)

    if (
      Number.isFinite(parsedEndTime) &&
      parsedEndTime > Date.now()
    ) {
      setEndsAt(parsedEndTime)
      return
    }

    setEndsAt(null)

    await Storage.removeItem(
      timerStorageKey,
    )

    await clearNotification()
  }, [
    clearNotification,
    timerStorageKey,
  ])

  const start = useCallback(
    (
      seconds = settings.restTimerSeconds,
    ) => {
      const endTime =
        Date.now() + seconds * 1000

      setEndsAt(endTime)

      void Storage.setItem(
        timerStorageKey,
        endTime.toString(),
      )

      void replaceNotification(endTime)
    },
    [
      replaceNotification,
      settings.restTimerSeconds,
      timerStorageKey,
    ],
  )

  const addTime = useCallback(
    (seconds: number) => {
      setEndsAt((current) => {
        const endTime =
          (current ?? Date.now()) +
          seconds * 1000

        void Storage.setItem(
          timerStorageKey,
          endTime.toString(),
        )

        void replaceNotification(endTime)

        return endTime
      })
    },
    [
      replaceNotification,
      timerStorageKey,
    ],
  )

  const clear = useCallback(async () => {
    setEndsAt(null)

    await Storage.removeItem(
      timerStorageKey,
    )

    await clearNotification()
  }, [
    clearNotification,
    timerStorageKey,
  ])

  const reset = useCallback(() => {
    start()
  }, [start])

  const skip = useCallback(() => {
    void clear()
  }, [clear])

  useEffect(() => {
    void restore()
  }, [restore])

  useEffect(() => {
    if (endsAt === null) {
      setRemainingSeconds(0)
      return
    }

    function updateTimer() {
      if (endsAt === null) {
        return
      }

      const remaining = Math.max(
        0,
        Math.ceil(
          (endsAt - Date.now()) / 1000,
        ),
      )

      setRemainingSeconds(remaining)

      if (remaining !== 0) {
        return
      }

      setEndsAt(null)

      void Storage.removeItem(
        timerStorageKey,
      )

      void clearNotification()

      if (
        AppState.currentState === 'active'
      ) {
        void Haptics.notificationAsync(
          Haptics
            .NotificationFeedbackType
            .Success,
        )
      }
    }

    updateTimer()

    const interval = setInterval(
      updateTimer,
      250,
    )

    return () => {
      clearInterval(interval)
    }
  }, [
    clearNotification,
    endsAt,
    timerStorageKey,
  ])

  return {
    isActive: endsAt !== null,
    remainingSeconds,
    start,
    addTime,
    reset,
    skip,
    clear,
  }
}
