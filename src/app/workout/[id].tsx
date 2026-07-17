import * as Haptics from 'expo-haptics'
import { Storage } from 'expo-sqlite/kv-store'

import { Card } from '@/components/ui'
import { cancelRestTimerNotification, scheduleRestTimerNotification } from '@/rest-timer-notifications'
import { type AppSettings, DEFAULT_APP_SETTINGS, getSettings } from '@/settings'
import { useAppTheme } from '@/theme/ThemeProvider'
import type { AppTheme } from '@/theme/types'
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router'
import { useSQLiteContext } from 'expo-sqlite'
import { Clock3, Minus, Plus, RotateCcw, TimerReset } from 'lucide-react-native'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Alert, AppState, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

type WorkoutSet = {
  id: number
  setNumber: number
  previousWeight: number | null
  weight: string
  previousReps: number | null
  reps: string
  rir: string
  completed: boolean
}

type WorkoutExercise = {
  id: number
  name: string
  position: number
  sets: WorkoutSet[]
}

type WorkoutRow = {
  exerciseId: number
  exerciseName: string
  exercisePosition: number
  setId: number
  setNumber: number
  previousWeight: number | null
  weight: number | null
  previousReps: number | null
  reps: number | null
  rir: number | null
  completed: number
}

type SessionMetadata = {
  startedAt: string
}

export default function WorkoutScreen() {
  const db = useSQLiteContext()
  const { theme } = useAppTheme()
  const insets = useSafeAreaInsets()
  const styles = useMemo(() => createStyles(theme), [theme])
  const params = useLocalSearchParams<{
    id: string
    name?: string
  }>()

  const sessionId = Number(params.id)
  const restTimerStorageKey = `rest-timer:${sessionId}`
  const restNotificationStorageKey =
    `rest-notification:${sessionId}`
  const workoutName =
    typeof params.name === 'string' ? params.name : 'Workout'

  const [exercises, setExercises] = useState<WorkoutExercise[] | null>(null)
  const [isFinishing, setIsFinishing] = useState(false)
  const [restEndsAt, setRestEndsAt] = useState<number | null>(null)
  const [remainingRestSeconds, setRemainingRestSeconds] = useState(0)
  const [settings, setSettings] = useState<AppSettings>(
    DEFAULT_APP_SETTINGS,
  )

  const [workoutStartedAt, setWorkoutStartedAt] =
    useState<number | null>(null)

  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  const loadWorkout = useCallback(async () => {
    if (!Number.isInteger(sessionId)) {
      return
    }

    const rows = await db.getAllAsync<WorkoutRow>(
      `
        SELECT
          current_exercise.id AS exerciseId,
          current_exercise.name AS exerciseName,
          current_exercise.position AS exercisePosition,
          current_set.id AS setId,
          current_set.set_number AS setNumber,
          current_set.weight,
          current_set.reps,
          current_set.rir,
          current_set.completed,
          previous_set.weight AS previousWeight,
          previous_set.reps AS previousReps
        FROM session_exercises AS current_exercise
        INNER JOIN set_logs AS current_set
          ON current_set.session_exercise_id = current_exercise.id
        LEFT JOIN session_exercises AS previous_exercise
          ON previous_exercise.id = (
            SELECT candidate_exercise.id
            FROM session_exercises AS candidate_exercise
            INNER JOIN workout_sessions AS candidate_session
              ON candidate_session.id = candidate_exercise.session_id
            WHERE
              candidate_exercise.source_exercise_id =
                current_exercise.source_exercise_id
              AND candidate_session.completed_at IS NOT NULL
              AND candidate_session.id <> current_exercise.session_id
            ORDER BY candidate_session.completed_at DESC
            LIMIT 1
          )
        LEFT JOIN set_logs AS previous_set
          ON previous_set.session_exercise_id = previous_exercise.id
          AND previous_set.set_number = current_set.set_number
          AND previous_set.completed = 1
        WHERE current_exercise.session_id = ?
        ORDER BY
          current_exercise.position,
          current_exercise.id,
          current_set.set_number
      `,
      sessionId,
    )

    const groupedExercises: WorkoutExercise[] = []

    for (const row of rows) {
      let exercise = groupedExercises.find(
        (item) => item.id === row.exerciseId,
      )

      if (!exercise) {
        exercise = {
          id: row.exerciseId,
          name: row.exerciseName,
          position: row.exercisePosition,
          sets: [],
        }

        groupedExercises.push(exercise)
      }

      exercise.sets.push({
        id: row.setId,
        setNumber: row.setNumber,
        previousWeight: row.previousWeight,
        weight: row.weight?.toString() ?? '',
        previousReps: row.previousReps,
        reps: row.reps?.toString() ?? '',
        rir: row.rir?.toString() ?? '',
        completed: row.completed === 1,
      })
    }

    setExercises(groupedExercises)
  }, [db, sessionId])

  useEffect(() => {
    if (restEndsAt === null) {
      setRemainingRestSeconds(0)
      return
    }

    function updateTimer() {
      if (restEndsAt === null) {
        return
      }

      const remaining = Math.max(
        0,
        Math.ceil((restEndsAt - Date.now()) / 1000),
      )

      setRemainingRestSeconds(remaining)

      if (remaining === 0) {
        setRestEndsAt(null)

        void Storage.removeItem(restTimerStorageKey)
        void clearRestTimerNotification()

        if (AppState.currentState === 'active') {
          void Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Success,
          )
        }
      }
    }

    updateTimer()

    const interval = setInterval(updateTimer, 250)

    return () => {
      clearInterval(interval)
    }
  }, [restEndsAt])

  useFocusEffect(
    useCallback(() => {
      let active = true

      async function loadScreen() {
        const [
          storedSettings,
          storedRestTimer,
          session,
        ] = await Promise.all([
          getSettings(),
          Storage.getItem(restTimerStorageKey),
          db.getFirstAsync<SessionMetadata>(
            `
              SELECT started_at AS startedAt
              FROM workout_sessions
              WHERE id = ?
            `,
            sessionId,
          ),
        ])

        await loadWorkout()

        if (!active) {
          return
        }

        setSettings(storedSettings)

        if (session) {
          const startedAt = Date.parse(
            `${session.startedAt.replace(' ', 'T')}Z`,
          )

          if (Number.isFinite(startedAt)) {
            setWorkoutStartedAt(startedAt)
          }
        }

        const parsedEndTime = Number(storedRestTimer)

        if (
          Number.isFinite(parsedEndTime) &&
          parsedEndTime > Date.now()
        ) {
          setRestEndsAt(parsedEndTime)
        } else {
          setRestEndsAt(null)
          await Storage.removeItem(restTimerStorageKey)
        }
      }

      void loadScreen()

      return () => {
        active = false
      }
    }, [
      db,
      loadWorkout,
      restTimerStorageKey,
      sessionId,
    ]),
  )

  useEffect(() => {
    if (workoutStartedAt === null) {
      setElapsedSeconds(0)
      return
    }

    function updateElapsedTime() {
      if (workoutStartedAt === null) {
        return
      }

      setElapsedSeconds(
        Math.max(
          0,
          Math.floor(
            (Date.now() - workoutStartedAt) / 1000,
          ),
        ),
      )
    }

    updateElapsedTime()

    const interval = setInterval(updateElapsedTime, 1000)

    return () => {
      clearInterval(interval)
    }
  }, [workoutStartedAt])

  function formatElapsedTime(seconds: number) {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const remainingSeconds = seconds % 60

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

  async function addSet(exercise: WorkoutExercise) {
    const nextSetNumber =
      Math.max(0, ...exercise.sets.map((set) => set.setNumber)) + 1

    await db.runAsync(
      `
        INSERT INTO set_logs (
          session_exercise_id,
          set_number
        )
        VALUES (?, ?)
      `,
      exercise.id,
      nextSetNumber,
    )

    await loadWorkout()
  }

  async function removeLastSet(exercise: WorkoutExercise) {
    if (exercise.sets.length <= 1) {
      return
    }

    const lastSet = exercise.sets.reduce((latest, set) =>
      set.setNumber > latest.setNumber ? set : latest,
    )

    await db.runAsync(
      'DELETE FROM set_logs WHERE id = ?',
      lastSet.id,
    )

    await loadWorkout()
  }

  function updateSet(
    exerciseId: number,
    setId: number,
    changes: Partial<WorkoutSet>,
  ) {
    setExercises((current) =>
      current?.map((exercise) =>
        exercise.id !== exerciseId
          ? exercise
          : {
              ...exercise,
              sets: exercise.sets.map((set) =>
                set.id === setId ? { ...set, ...changes } : set,
              ),
            },
      ) ?? null,
    )
  }

  async function saveSet(set: WorkoutSet) {
    const normalizedWeight = set.weight.replace(',', '.')

    const parsedWeight =
      normalizedWeight.trim() === ''
        ? null
        : Number(normalizedWeight)

    const parsedReps =
      set.reps.trim() === ''
        ? null
        : Number.parseInt(set.reps, 10)

    const parsedRir =
      set.rir.trim() === ''
        ? null
        : Number.parseInt(set.rir, 10)

    await db.runAsync(
      `
        UPDATE set_logs
        SET
          weight = ?,
          reps = ?,
          rir = ?,
          completed = ?
        WHERE id = ?
      `,
      parsedWeight !== null && Number.isFinite(parsedWeight)
        ? parsedWeight
        : null,
      parsedReps !== null && Number.isFinite(parsedReps)
        ? parsedReps
        : null,
      parsedRir !== null &&
        Number.isInteger(parsedRir) &&
        parsedRir >= 0 &&
        parsedRir <= 10
        ? parsedRir
        : null,
      set.completed ? 1 : 0,
      set.id,
    )
  }

  function applyPreviousSet(
    exerciseId: number,
    set: WorkoutSet,
  ) {
    if (
      set.previousWeight === null &&
      set.previousReps === null
    ) {
      return
    }

    updateSet(exerciseId, set.id, {
      weight: set.previousWeight?.toString() ?? '',
      reps: set.previousReps?.toString() ?? '',
    })
  }

  async function toggleSet(exerciseId: number, set: WorkoutSet) {
    const updatedSet = {
      ...set,
      completed: !set.completed,
    }

    updateSet(exerciseId, set.id, {
      completed: updatedSet.completed,
    })

    await saveSet(updatedSet)

    if (updatedSet.completed && settings.autoStartRestTimer) {
      startRestTimer()
    }
  }

  function requestFinishWorkout() {
    if (!exercises) {
      return
    }

    const incompleteSets = exercises.reduce(
      (total, exercise) =>
        total +
        exercise.sets.filter((set) => !set.completed).length,
      0,
    )

    if (incompleteSets === 0) {
      void finishWorkout()
      return
    }

    Alert.alert(
      'Finish with incomplete sets?',
      `${incompleteSets} ${
        incompleteSets === 1 ? 'set is' : 'sets are'
      } still incomplete.`,
      [
        {
          text: 'Keep training',
          style: 'cancel',
        },
        {
          text: 'Finish anyway',
          onPress: () => void finishWorkout(),
        },
      ],
    )
  }

  async function finishWorkout() {
    if (!exercises || !Number.isInteger(sessionId) || isFinishing) {
      return
    }

    setIsFinishing(true)

    try {
      for (const exercise of exercises) {
        for (const set of exercise.sets) {
          await saveSet(set)
        }
      }

      await db.runAsync(
        `
          UPDATE workout_sessions
          SET completed_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `,
        sessionId,
      )

      await clearRestTimerNotification()
      await Storage.removeItem(restTimerStorageKey)

      router.dismissAll()
    } finally {
      setIsFinishing(false)
    }
  }

  function confirmDiscardWorkout() {
    Alert.alert(
      'Discard workout?',
      'The workout and all sets recorded during it will be deleted.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => void discardWorkout(),
        },
      ],
    )
  }

  async function discardWorkout() {
    await db.runAsync(
      'DELETE FROM workout_sessions WHERE id = ?',
      sessionId,
    )

    await clearRestTimerNotification()
    await Storage.removeItem(restTimerStorageKey)

    router.dismissAll()
  }

  function startRestTimer(
    seconds = settings.restTimerSeconds,
  ) {
    const endTime = Date.now() + seconds * 1000

    setRestEndsAt(endTime)

    void Storage.setItem(
      restTimerStorageKey,
      endTime.toString(),
    )

    void replaceRestTimerNotification(endTime)
  }

  function addRestTime(seconds: number) {
    setRestEndsAt((current) => {
      const endTime =
        (current ?? Date.now()) + seconds * 1000

      void Storage.setItem(
        restTimerStorageKey,
        endTime.toString(),
      )

      void replaceRestTimerNotification(endTime)

      return endTime
    })
  }

  function resetRestTimer() {
    startRestTimer()
  }

  function skipRestTimer() {
    setRestEndsAt(null)
    void Storage.removeItem(restTimerStorageKey)
    void clearRestTimerNotification()
  }

  function formatTimer(seconds: number) {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60

    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  async function replaceRestTimerNotification(
    endTime: number,
  ) {
    const currentIdentifier = await Storage.getItem(
      restNotificationStorageKey,
    )

    await cancelRestTimerNotification(currentIdentifier)
    await Storage.removeItem(restNotificationStorageKey)

    if (!settings.restTimerNotifications) {
      return
    }

    const remainingSeconds =
      Math.ceil((endTime - Date.now()) / 1000)

    if (remainingSeconds <= 0) {
      return
    }

    const identifier =
      await scheduleRestTimerNotification(
        remainingSeconds,
      )

    if (identifier) {
      await Storage.setItem(
        restNotificationStorageKey,
        identifier,
      )
    }
  }

  async function clearRestTimerNotification() {
    const identifier = await Storage.getItem(
      restNotificationStorageKey,
    )

    await cancelRestTimerNotification(identifier)
    await Storage.removeItem(restNotificationStorageKey)
  }

  const completedSets =
    exercises?.reduce(
      (total, exercise) =>
        total + exercise.sets.filter((set) => set.completed).length,
      0,
    ) ?? 0

  const totalSets =
    exercises?.reduce(
      (total, exercise) => total + exercise.sets.length,
      0,
    ) ?? 0

  if (exercises === null) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    )
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: workoutName,
          headerBackVisible: false,
        }}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[
          styles.container,
          { paddingBottom: Math.max(insets.bottom, 16) },
        ]}
      >
        <View style={styles.summary}>
          <View>
            <Text style={styles.eyebrow}>ACTIVE WORKOUT</Text>
            <Text style={styles.title}>{workoutName}</Text>
          </View>

          <View style={styles.summaryStats}>
            <View style={styles.duration}>
              <Clock3 color={theme.colors.textSubtle} size={15} />
              <Text style={styles.durationText}>
                {formatElapsedTime(elapsedSeconds)}
              </Text>
            </View>

            <Text style={styles.progress}>
              {completedSets}/{totalSets}
            </Text>
          </View>
        </View>

        {restEndsAt !== null && (
          <Card style={styles.restTimer}>
            <View style={styles.restTimerMain}>
              <View style={styles.restTimerIcon}>
                <TimerReset color={theme.colors.primary} size={21} />
              </View>

              <View>
                <Text style={styles.restTimerLabel}>REST TIMER</Text>
                <Text style={styles.restTimerValue}>
                  {formatTimer(remainingRestSeconds)}
                </Text>
              </View>
            </View>

            <View style={styles.restTimerActions}>
              <Pressable
                accessibilityLabel="Add 30 seconds"
                hitSlop={8}
                onPress={() => addRestTime(30)}
                style={({ pressed }) => [
                  styles.timerAction,
                  pressed && styles.timerActionPressed,
                ]}
              >
                <Text style={styles.timerActionText}>+30</Text>
              </Pressable>

              <Pressable
                accessibilityLabel="Restart timer"
                hitSlop={8}
                onPress={resetRestTimer}
                style={({ pressed }) => [
                  styles.timerAction,
                  pressed && styles.timerActionPressed,
                ]}
              >
                <RotateCcw color={theme.colors.textMuted} size={17} />
              </Pressable>

              <Pressable
                hitSlop={8}
                onPress={skipRestTimer}
                style={({ pressed }) => [
                  styles.timerAction,
                  pressed && styles.timerActionPressed,
                ]}
              >
                <Text style={styles.timerActionText}>Skip</Text>
              </Pressable>
            </View>
          </Card>
        )}

        <FlatList
          data={exercises}
          keyExtractor={(exercise) => exercise.id.toString()}
          contentContainerStyle={styles.list}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <Card style={styles.exerciseCard}>
              <Text style={styles.exerciseName}>{item.name}</Text>

              <View style={styles.columnHeader}>
                <Text style={styles.setColumn}>SET</Text>
                <Text style={styles.previousColumn}>PREVIOUS</Text>
                <Text style={styles.inputColumn}>KG</Text>
                <Text style={styles.inputColumn}>REPS</Text>
                <Text style={styles.rirColumn}>RIR</Text>
                <Text style={styles.doneColumn}>DONE</Text>
              </View>

              {item.sets.map((set) => (
                <View key={set.id} style={styles.setRow}>
                  <Text style={styles.setNumber}>{set.setNumber}</Text>

                  <Pressable
                    disabled={
                      set.previousWeight === null &&
                      set.previousReps === null
                    }
                    onPress={() => applyPreviousSet(item.id, set)}
                    style={({ pressed }) => [
                      styles.previousButton,
                      pressed && styles.previousButtonPressed,
                    ]}
                  >
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.previousValue,
                        set.previousWeight === null &&
                          set.previousReps === null &&
                          styles.previousValueEmpty,
                      ]}
                    >
                      {set.previousWeight !== null ||
                      set.previousReps !== null
                        ? `${set.previousWeight ?? '—'}×${set.previousReps ?? '—'}`
                        : '—'}
                    </Text>
                  </Pressable>

                  <TextInput
                    value={set.weight}
                    onChangeText={(weight) =>
                      updateSet(item.id, set.id, { weight })
                    }
                    onBlur={() => void saveSet(set)}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor={theme.colors.textSubtle}
                    selectTextOnFocus
                    style={styles.setInput}
                  />

                  <TextInput
                    value={set.reps}
                    onChangeText={(reps) =>
                      updateSet(item.id, set.id, { reps })
                    }
                    onBlur={() => void saveSet(set)}
                    keyboardType="number-pad"
                    placeholder="0"
                    placeholderTextColor={theme.colors.textSubtle}
                    selectTextOnFocus
                    style={styles.setInput}
                  />

                  <TextInput
                    value={set.rir}
                    onChangeText={(rir) =>
                      updateSet(item.id, set.id, { rir })
                    }
                    onBlur={() => void saveSet(set)}
                    keyboardType="number-pad"
                    maxLength={2}
                    placeholder="—"
                    placeholderTextColor={theme.colors.textSubtle}
                    selectTextOnFocus
                    style={[styles.setInput, styles.rirInput]}
                  />

                  <Pressable
                    onPress={() => void toggleSet(item.id, set)}
                    style={[
                      styles.checkbox,
                      set.completed && styles.checkboxCompleted,
                    ]}
                  >
                    <Text style={styles.checkmark}>
                      {set.completed ? '✓' : ''}
                    </Text>
                  </Pressable>
                </View>
              ))}

              <View style={styles.setActions}>
                <Pressable
                  disabled={item.sets.length <= 1}
                  onPress={() => void removeLastSet(item)}
                  style={({ pressed }) => [
                    styles.setActionButton,
                    item.sets.length <= 1 && styles.setActionButtonDisabled,
                    pressed && styles.setActionButtonPressed,
                  ]}
                >
                  <Minus color={theme.colors.textMuted} size={16} />
                  <Text style={styles.setActionText}>Remove set</Text>
                </Pressable>

                <Pressable
                  onPress={() => void addSet(item)}
                  style={({ pressed }) => [
                    styles.setActionButton,
                    pressed && styles.setActionButtonPressed,
                  ]}
                >
                  <Plus color={theme.colors.textMuted} size={16} />
                  <Text style={styles.setActionText}>Add set</Text>
                </Pressable>
              </View>
            </Card>
          )}
        />

        <Pressable
          disabled={isFinishing}
          onPress={requestFinishWorkout}
          style={({ pressed }) => [
            styles.finishButton,
            pressed && styles.finishButtonPressed,
          ]}
        >
          <Text style={styles.finishButtonText}>
            {isFinishing ? 'Finishing...' : 'Finish workout'}
          </Text>
        </Pressable>

        <Pressable
          onPress={confirmDiscardWorkout}
          style={({ pressed }) => [
            styles.discardButton,
            pressed && styles.discardButtonPressed,
          ]}
        >
          <Text style={styles.discardButtonText}>Discard workout</Text>
        </Pressable>
      </KeyboardAvoidingView>
    </>
  )
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  loading: {
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    flex: 1,
    justifyContent: 'center',
  },
  container: {
    backgroundColor: theme.colors.background,
    flex: 1,
    paddingHorizontal: 16,
  },
  summary: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 20,
    paddingTop: 20,
  },
  eyebrow: {
    color: theme.colors.primary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.4,
  },
  title: {
    color: theme.colors.text,
    fontSize: 28,
    fontWeight: '800',
    marginTop: 4,
  },
  summaryStats: {
    alignItems: 'flex-end',
    gap: 7,
  },
  duration: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
  },
  durationText: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
  },
  progress: {
    color: theme.colors.primary,
    fontSize: 18,
    fontWeight: '800',
  },
  restTimer: {
    alignItems: 'center',
    backgroundColor: theme.colors.primarySurface,
    borderColor: theme.colors.primary,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
    padding: 12,
  },
  restTimerMain: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  restTimerIcon: {
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceRaised,
    borderRadius: 10,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  restTimerLabel: {
    color: theme.colors.primary,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  restTimerValue: {
    color: theme.colors.text,
    fontSize: 20,
    fontVariant: ['tabular-nums'],
    fontWeight: '900',
    marginTop: 1,
  },
  restTimerActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
  },
  timerAction: {
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceRaised,
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 34,
    minWidth: 40,
    paddingHorizontal: 8,
  },
  timerActionPressed: {
    opacity: 0.65,
  },
  timerActionText: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: '800',
  },
  setActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  setActionButton: {
    alignItems: 'center',
    borderColor: theme.colors.borderStrong,
    borderRadius: 10,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    paddingVertical: 10,
  },
  setActionButtonDisabled: {
    opacity: 0.3,
  },
  setActionButtonPressed: {
    opacity: 0.65,
  },
  setActionText: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  list: {
    gap: 14,
    paddingBottom: 24,
  },
  exerciseCard: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  exerciseName: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 16,
  },
  columnHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 8,
  },
  setColumn: {
    color: theme.colors.textSubtle,
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
    width: 30,
  },
  previousColumn: {
    color: theme.colors.textSubtle,
    fontSize: 9,
    fontWeight: '700',
    textAlign: 'center',
    width: 64,
  },
  inputColumn: {
    color: theme.colors.textSubtle,
    flex: 1,
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },
  rirColumn: {
    color: theme.colors.textSubtle,
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
    width: 48,
  },
  doneColumn: {
    color: theme.colors.textSubtle,
    fontSize: 9,
    fontWeight: '700',
    textAlign: 'center',
    width: 44,
  },
  setRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: 8,
  },
  setNumber: {
    color: theme.colors.textMuted,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    width: 30,
  },
  previousButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 64,
  },
  previousButtonPressed: {
    opacity: 0.55,
  },
  previousValue: {
    color: theme.colors.primary,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  previousValueEmpty: {
    color: theme.colors.textSubtle,
  },
  rirInput: {
    flex: 0,
    width: 44,
  },
  setInput: {
    backgroundColor: theme.colors.input,
    borderColor: theme.colors.border,
    borderRadius: 10,
    borderWidth: 1,
    color: theme.colors.text,
    flex: 1,
    fontSize: 16,
    marginHorizontal: 3,
    paddingHorizontal: 8,
    paddingVertical: 10,
    textAlign: 'center',
  },
  checkbox: {
    alignItems: 'center',
    borderColor: theme.colors.borderStrong,
    borderRadius: 8,
    borderWidth: 2,
    height: 34,
    justifyContent: 'center',
    marginLeft: 5,
    width: 34,
  },
  checkboxCompleted: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  checkmark: {
    color: theme.colors.primaryText,
    fontSize: 20,
    fontWeight: '900',
  },
  finishButton: {
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: 14,
    marginBottom: 20,
    paddingVertical: 16,
  },
  finishButtonPressed: {
    opacity: 0.75,
  },
  finishButtonText: {
    color: theme.colors.primaryText,
    fontSize: 16,
    fontWeight: '800',
  },
  discardButton: {
    alignItems: 'center',
    borderColor: theme.colors.dangerBorder,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 20,
    paddingVertical: 14,
  },
  discardButtonPressed: {
    opacity: 0.7,
  },
  discardButtonText: {
    color: theme.colors.danger,
    fontSize: 14,
    fontWeight: '800',
  },
})
