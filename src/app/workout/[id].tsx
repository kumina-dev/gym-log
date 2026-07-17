import {
  CardioExerciseCard,
} from '@/components/workout/CardioExerciseCard'
import {
  RestTimerCard,
} from '@/components/workout/RestTimerCard'
import {
  StrengthExerciseCard,
} from '@/components/workout/StrengthExerciseCard'
import {
  WorkoutActions,
} from '@/components/workout/WorkoutActions'
import {
  WorkoutSummary,
} from '@/components/workout/WorkoutSummary'
import {
  addWorkoutSet,
  completeWorkoutSession,
  deleteWorkoutSession,
  getWorkoutStartedAt,
  loadActiveWorkout,
  removeLastWorkoutSet,
  saveWorkoutSet,
} from '@/database/workout-sessions'
import { useElapsedTime } from '@/hooks/useElapsedTime'
import { useRestTimer } from '@/hooks/useRestTimer'
import {
  type AppSettings,
  DEFAULT_APP_SETTINGS,
  getSettings,
} from '@/settings'
import { useAppTheme } from '@/theme/ThemeProvider'
import type {
  WorkoutExercise,
  WorkoutSet,
} from '@/types/active-workout'
import {
  formatMinutesInput,
} from '@/utils/workout-format'
import {
  router,
  Stack,
  useFocusEffect,
  useLocalSearchParams,
} from 'expo-router'
import { useSQLiteContext } from 'expo-sqlite'
import {
  useCallback,
  useMemo,
  useState,
} from 'react'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  View,
} from 'react-native'
import {
  useSafeAreaInsets,
} from 'react-native-safe-area-context'

export default function WorkoutScreen() {
  const db = useSQLiteContext()
  const { theme } = useAppTheme()
  const insets = useSafeAreaInsets()

  const styles = useMemo(
    () =>
      StyleSheet.create({
        loading: {
          alignItems: 'center',
          backgroundColor:
            theme.colors.background,
          flex: 1,
          justifyContent: 'center',
        },
        container: {
          backgroundColor:
            theme.colors.background,
          flex: 1,
          paddingHorizontal: 16,
        },
        list: {
          gap: 14,
          paddingBottom: 24,
        },
      }),
    [theme],
  )

  const params = useLocalSearchParams<{
    id: string
    name?: string
  }>()

  const sessionId = Number(params.id)

  const workoutName =
    typeof params.name === 'string'
      ? params.name
      : 'Workout'

  const [exercises, setExercises] =
    useState<WorkoutExercise[] | null>(null)

  const [isFinishing, setIsFinishing] =
    useState(false)

  const [settings, setSettings] =
    useState<AppSettings>(
      DEFAULT_APP_SETTINGS,
    )

  const [
    workoutStartedAt,
    setWorkoutStartedAt,
  ] = useState<number | null>(null)

  const elapsedSeconds = useElapsedTime(
    workoutStartedAt,
  )

  const restTimer = useRestTimer({
    sessionId,
    settings,
  })

  const loadWorkout = useCallback(async () => {
    if (!Number.isInteger(sessionId)) {
      return
    }

    const loadedExercises =
      await loadActiveWorkout(
        db,
        sessionId,
      )

    setExercises(loadedExercises)
  }, [db, sessionId])

  useFocusEffect(
    useCallback(() => {
      let active = true

      async function loadScreen() {
        const [
          storedSettings,
          startedAt,
          loadedExercises,
        ] = await Promise.all([
          getSettings(),

          getWorkoutStartedAt(
            db,
            sessionId,
          ),

          loadActiveWorkout(
            db,
            sessionId,
          ),
        ])

        if (!active) {
          return
        }

        setSettings(storedSettings)
        setWorkoutStartedAt(startedAt)
        setExercises(loadedExercises)
      }

      void loadScreen()

      return () => {
        active = false
      }
    }, [
      db,
      sessionId,
    ]),
  )

  async function addSet(
    exercise: WorkoutExercise,
  ) {
    await addWorkoutSet(db, exercise)
    await loadWorkout()
  }

  async function removeLastSet(
    exercise: WorkoutExercise,
  ) {
    await removeLastWorkoutSet(
      db,
      exercise,
    )

    await loadWorkout()
  }

  function updateSet(
    exerciseId: number,
    setId: number,
    changes: Partial<WorkoutSet>,
  ) {
    setExercises(
      (current) =>
        current?.map((exercise) =>
          exercise.id !== exerciseId
            ? exercise
            : {
                ...exercise,
                sets: exercise.sets.map(
                  (set) =>
                    set.id === setId
                      ? {
                          ...set,
                          ...changes,
                        }
                      : set,
                ),
              },
        ) ?? null,
    )
  }

  async function saveSet(
    set: WorkoutSet,
  ) {
    await saveWorkoutSet(db, set)
  }

  function applyPreviousStrengthSet(
    exerciseId: number,
    set: WorkoutSet,
  ) {
    if (
      set.previousWeight === null &&
      set.previousReps === null
    ) {
      return
    }

    updateSet(
      exerciseId,
      set.id,
      {
        weight:
          set.previousWeight?.toString() ??
          '',
        reps:
          set.previousReps?.toString() ??
          '',
      },
    )
  }

  function applyPreviousCardioSet(
    exerciseId: number,
    set: WorkoutSet,
  ) {
    if (
      set.previousDurationSeconds === null &&
      set.previousDistance === null &&
      set.previousLevel === null
    ) {
      return
    }

    updateSet(
      exerciseId,
      set.id,
      {
        durationMinutes:
          set.previousDurationSeconds === null
            ? ''
            : formatMinutesInput(
                set.previousDurationSeconds,
              ),

        distance:
          set.previousDistance?.toString() ??
          '',

        level:
          set.previousLevel?.toString() ??
          '',
      },
    )
  }

  async function toggleSet(
    exerciseId: number,
    set: WorkoutSet,
  ) {
    const updatedSet = {
      ...set,
      completed: !set.completed,
    }

    updateSet(
      exerciseId,
      set.id,
      {
        completed:
          updatedSet.completed,
      },
    )

    await saveWorkoutSet(
      db,
      updatedSet,
    )

    if (
      updatedSet.completed &&
      settings.autoStartRestTimer
    ) {
      restTimer.start()
    }
  }

  function requestFinishWorkout() {
    if (!exercises) {
      return
    }

    const incompleteSets =
      exercises.reduce(
        (total, exercise) =>
          total +
          exercise.sets.filter(
            (set) => !set.completed,
          ).length,
        0,
      )

    if (incompleteSets === 0) {
      void finishWorkout()
      return
    }

    Alert.alert(
      'Finish with incomplete sets?',
      `${incompleteSets} ${
        incompleteSets === 1
          ? 'set is'
          : 'sets are'
      } still incomplete.`,
      [
        {
          text: 'Keep training',
          style: 'cancel',
        },
        {
          text: 'Finish anyway',
          onPress: () =>
            void finishWorkout(),
        },
      ],
    )
  }

  async function finishWorkout() {
    if (
      !exercises ||
      !Number.isInteger(sessionId) ||
      isFinishing
    ) {
      return
    }

    setIsFinishing(true)

    try {
      await completeWorkoutSession(
        db,
        sessionId,
        exercises,
      )

      await restTimer.clear()

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
          onPress: () =>
            void discardWorkout(),
        },
      ],
    )
  }

  async function discardWorkout() {
    await deleteWorkoutSession(
      db,
      sessionId,
    )

    await restTimer.clear()

    router.dismissAll()
  }

  const completedSets =
    exercises?.reduce(
      (total, exercise) =>
        total +
        exercise.sets.filter(
          (set) => set.completed,
        ).length,
      0,
    ) ?? 0

  const totalSets =
    exercises?.reduce(
      (total, exercise) =>
        total + exercise.sets.length,
      0,
    ) ?? 0

  if (exercises === null) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator
          color={theme.colors.primary}
        />
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
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : undefined
        }
        style={[
          styles.container,
          {
            paddingBottom: Math.max(
              insets.bottom,
              16,
            ),
          },
        ]}
      >
        <WorkoutSummary
          workoutName={workoutName}
          elapsedSeconds={elapsedSeconds}
          completedSets={completedSets}
          totalSets={totalSets}
        />

        {restTimer.isActive && (
          <RestTimerCard
            remainingSeconds={
              restTimer.remainingSeconds
            }
            onAddTime={restTimer.addTime}
            onReset={restTimer.reset}
            onSkip={restTimer.skip}
          />
        )}

        <FlatList
          data={exercises}
          keyExtractor={(exercise) =>
            exercise.id.toString()
          }
          contentContainerStyle={
            styles.list
          }
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) =>
            item.trackingType === 'cardio'
              ? (
                  <CardioExerciseCard
                    exercise={item}
                    onUpdateSet={updateSet}
                    onSaveSet={saveSet}
                    onApplyPreviousSet={
                      applyPreviousCardioSet
                    }
                    onToggleSet={toggleSet}
                    onAddSet={addSet}
                    onRemoveLastSet={
                      removeLastSet
                    }
                  />
                )
              : (
                  <StrengthExerciseCard
                    exercise={item}
                    onUpdateSet={updateSet}
                    onSaveSet={saveSet}
                    onApplyPreviousSet={
                      applyPreviousStrengthSet
                    }
                    onToggleSet={toggleSet}
                    onAddSet={addSet}
                    onRemoveLastSet={
                      removeLastSet
                    }
                  />
                )
          }
        />

        <WorkoutActions
          isFinishing={isFinishing}
          onFinish={requestFinishWorkout}
          onDiscard={
            confirmDiscardWorkout
          }
        />
      </KeyboardAvoidingView>
    </>
  )
}
