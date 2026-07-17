import {
  router,
  Stack,
  useFocusEffect,
  useLocalSearchParams,
} from 'expo-router'
import { useSQLiteContext } from 'expo-sqlite'
import {
  ArrowDown,
  ArrowUp,
  ChevronRight,
  Dumbbell,
  Pencil,
  Play,
  Plus,
  Save,
  Trash2,
  X,
} from 'lucide-react-native'
import {
  useCallback,
  useMemo,
  useState,
} from 'react'
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native'

import {
  AppText,
  Button,
  Card,
  IconButton,
  Screen,
  TextField,
} from '@/components/ui'
import {
  useAppTheme,
} from '@/theme/ThemeProvider'
import type {
  AppTheme,
} from '@/theme/types'

type TrackingType = 'strength' | 'cardio'

type WorkoutRow = {
  id: number
  name: string
}

type ActiveSession = {
  id: number
  workoutName: string
}

type Exercise = {
  id: number
  name: string
  position: number
  targetSets: number
  targetRepsMin: number
  targetRepsMax: number
  trackingType: TrackingType
  targetDurationSeconds: number | null
  targetDistance: number | null
  targetLevel: number | null
}

function formatCardioTarget(
  exercise: Exercise,
) {
  const parts = [
    `${exercise.targetSets} ${
      exercise.targetSets === 1
        ? 'set'
        : 'sets'
    }`,
  ]

  if (
    exercise.targetDurationSeconds !== null
  ) {
    parts.push(
      `${exercise.targetDurationSeconds / 60} min`,
    )
  }

  if (exercise.targetDistance !== null) {
    parts.push(
      `${exercise.targetDistance} km`,
    )
  }

  if (exercise.targetLevel !== null) {
    parts.push(
      `level ${exercise.targetLevel}`,
    )
  }

  return parts.join(' · ')
}

export default function WorkoutScreen() {
  const db = useSQLiteContext()
  const { theme } = useAppTheme()

  const styles = useMemo(
    () => createStyles(theme),
    [theme],
  )

  const params = useLocalSearchParams<{
    id: string
    name?: string
  }>()

  const workoutId = Number(params.id)

  const initialWorkoutName =
    typeof params.name === 'string'
      ? params.name
      : 'Workout'

  const [workoutName, setWorkoutName] =
    useState(initialWorkoutName)

  const [
    draftWorkoutName,
    setDraftWorkoutName,
  ] = useState(initialWorkoutName)

  const [isRenaming, setIsRenaming] =
    useState(false)

  const [exercises, setExercises] =
    useState<Exercise[]>([])

  const [exerciseName, setExerciseName] =
    useState('')

  const [isStarting, setIsStarting] =
    useState(false)

  const loadWorkout = useCallback(async () => {
    if (!Number.isInteger(workoutId)) {
      return
    }

    const [workout, exerciseRows] =
      await Promise.all([
        db.getFirstAsync<WorkoutRow>(
          `
            SELECT id, name
            FROM workout_days
            WHERE id = ?
          `,
          workoutId,
        ),
        db.getAllAsync<Exercise>(
          `
            SELECT
              id,
              name,
              position,
              target_sets AS targetSets,
              target_reps_min
                AS targetRepsMin,
              target_reps_max
                AS targetRepsMax,
              tracking_type
                AS trackingType,
              target_duration_seconds
                AS targetDurationSeconds,
              target_distance
                AS targetDistance,
              target_level
                AS targetLevel
            FROM exercises
            WHERE workout_day_id = ?
            ORDER BY position, id
          `,
          workoutId,
        ),
      ])

    if (!workout) {
      router.back()
      return
    }

    setWorkoutName(workout.name)
    setDraftWorkoutName(workout.name)
    setExercises(exerciseRows)
  }, [db, workoutId])

  useFocusEffect(
    useCallback(() => {
      void loadWorkout()
    }, [loadWorkout]),
  )

  async function addExercise() {
    const trimmedName =
      exerciseName.trim()

    if (!trimmedName) {
      return
    }

    await db.runAsync(
      `
        INSERT INTO exercises (
          workout_day_id,
          name,
          position,
          target_sets,
          target_reps_min,
          target_reps_max,
          tracking_type
        )
        VALUES (?, ?, ?, 3, 8, 12, 'strength')
      `,
      workoutId,
      trimmedName,
      exercises.length,
    )

    setExerciseName('')
    await loadWorkout()
  }

  async function saveWorkoutName() {
    const trimmedName =
      draftWorkoutName.trim()

    if (!trimmedName) {
      return
    }

    await db.runAsync(
      `
        UPDATE workout_days
        SET name = ?
        WHERE id = ?
      `,
      trimmedName,
      workoutId,
    )

    setWorkoutName(trimmedName)
    setDraftWorkoutName(trimmedName)
    setIsRenaming(false)
  }

  function cancelRenaming() {
    setDraftWorkoutName(workoutName)
    setIsRenaming(false)
  }

  async function moveExercise(
    exercise: Exercise,
    direction: -1 | 1,
  ) {
    const currentIndex =
      exercises.findIndex(
        (item) =>
          item.id === exercise.id,
      )

    const targetIndex =
      currentIndex + direction

    const targetExercise =
      exercises[targetIndex]

    if (
      currentIndex < 0 ||
      !targetExercise
    ) {
      return
    }

    await db.withTransactionAsync(
      async () => {
        await db.runAsync(
          `
            UPDATE exercises
            SET position = ?
            WHERE id = ?
          `,
          targetExercise.position,
          exercise.id,
        )

        await db.runAsync(
          `
            UPDATE exercises
            SET position = ?
            WHERE id = ?
          `,
          exercise.position,
          targetExercise.id,
        )
      },
    )

    await loadWorkout()
  }

  async function startWorkout() {
    if (
      exercises.length === 0 ||
      !Number.isInteger(workoutId) ||
      isStarting
    ) {
      return
    }

    const activeSession =
      await db.getFirstAsync<ActiveSession>(
        `
          SELECT
            id,
            workout_day_name
              AS workoutName
          FROM workout_sessions
          WHERE completed_at IS NULL
          ORDER BY started_at DESC
          LIMIT 1
        `,
      )

    if (activeSession) {
      Alert.alert(
        'Workout already active',
        `${activeSession.workoutName} is still in progress.`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Resume',
            onPress: () => {
              router.push({
                pathname:
                  '/workout/[id]',
                params: {
                  id: activeSession.id.toString(),
                  name:
                    activeSession.workoutName,
                },
              })
            },
          },
        ],
      )

      return
    }

    setIsStarting(true)

    try {
      let sessionId: number | undefined

      await db.withTransactionAsync(
        async () => {
          const sessionResult =
            await db.runAsync(
              `
                INSERT INTO workout_sessions (
                  workout_day_id,
                  workout_day_name
                )
                VALUES (?, ?)
              `,
              workoutId,
              workoutName,
            )

          sessionId = Number(
            sessionResult.lastInsertRowId,
          )

          for (const exercise of exercises) {
            const exerciseResult =
              await db.runAsync(
                `
                  INSERT INTO session_exercises (
                    session_id,
                    source_exercise_id,
                    name,
                    position,
                    tracking_type,
                    target_duration_seconds,
                    target_distance,
                    target_level
                  )
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `,
                sessionId,
                exercise.id,
                exercise.name,
                exercise.position,
                exercise.trackingType,
                exercise.targetDurationSeconds,
                exercise.targetDistance,
                exercise.targetLevel,
              )

            const sessionExerciseId =
              Number(
                exerciseResult.lastInsertRowId,
              )

            for (
              let setNumber = 1;
              setNumber <=
              exercise.targetSets;
              setNumber += 1
            ) {
              await db.runAsync(
                `
                  INSERT INTO set_logs (
                    session_exercise_id,
                    set_number
                  )
                  VALUES (?, ?)
                `,
                sessionExerciseId,
                setNumber,
              )
            }
          }
        },
      )

      if (sessionId !== undefined) {
        router.push({
          pathname: '/workout/[id]',
          params: {
            id: sessionId.toString(),
            name: workoutName,
          },
        })
      }
    } finally {
      setIsStarting(false)
    }
  }

  function confirmDeleteWorkout() {
    Alert.alert(
      'Delete workout?',
      'The workout and its exercises will be removed. Completed history will remain.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void deleteWorkout()
          },
        },
      ],
    )
  }

  async function deleteWorkout() {
    await db.runAsync(
      `
        DELETE FROM workout_days
        WHERE id = ?
      `,
      workoutId,
    )

    router.back()
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: workoutName,
          headerRight: () => (
            <Pressable
              accessibilityLabel="Rename workout"
              hitSlop={10}
              onPress={() =>
                setIsRenaming(true)
              }
            >
              <Pencil
                color={
                  theme.colors.textMuted
                }
                size={20}
              />
            </Pressable>
          ),
        }}
      />

      <Screen edges={['bottom']}>
        <KeyboardAvoidingView
          behavior={
            Platform.OS === 'ios'
              ? 'padding'
              : undefined
          }
          style={styles.container}
        >
          <FlatList
            data={exercises}
            keyExtractor={(exercise) =>
              exercise.id.toString()
            }
            contentContainerStyle={[
              styles.list,
              exercises.length === 0 &&
                styles.emptyList,
            ]}
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
            ListHeaderComponent={
              <View style={styles.header}>
                <AppText
                  tone="primary"
                  variant="caption"
                  style={styles.eyebrow}
                >
                  EXERCISES
                </AppText>

                <AppText variant="display">
                  {workoutName}
                </AppText>

                <AppText
                  tone="muted"
                  style={styles.description}
                >
                  Configure the exercises
                  performed during this workout.
                </AppText>

                {isRenaming && (
                  <Card
                    style={
                      styles.renameCard
                    }
                  >
                    <View
                      style={
                        styles.renameForm
                      }
                    >
                      <View
                        style={
                          styles.renameInput
                        }
                      >
                        <TextField
                          autoFocus
                          value={
                            draftWorkoutName
                          }
                          onChangeText={
                            setDraftWorkoutName
                          }
                          onSubmitEditing={() => {
                            void saveWorkoutName()
                          }}
                          placeholder="Workout name"
                          returnKeyType="done"
                          selectTextOnFocus
                        />
                      </View>

                      <IconButton
                        accessibilityLabel="Save workout name"
                        disabled={
                          !draftWorkoutName.trim()
                        }
                        icon={
                          <Save
                            color={
                              theme.colors.primary
                            }
                            size={18}
                          />
                        }
                        onPress={() => {
                          void saveWorkoutName()
                        }}
                      />

                      <IconButton
                        accessibilityLabel="Cancel renaming"
                        icon={
                          <X
                            color={
                              theme.colors.textMuted
                            }
                            size={19}
                          />
                        }
                        onPress={
                          cancelRenaming
                        }
                      />
                    </View>
                  </Card>
                )}
              <View style={styles.form}>
                  <View
                    style={
                      styles.formInput
                    }
                  >
                    <TextField
                      value={exerciseName}
                      onChangeText={
                        setExerciseName
                      }
                      onSubmitEditing={() => {
                        void addExercise()
                      }}
                      placeholder="Incline machine press..."
                      returnKeyType="done"
                    />
                  </View>

                  <Button
                    disabled={
                      !exerciseName.trim()
                    }
                    icon={
                      <Plus
                        color={
                          theme.colors.primaryText
                        }
                        size={18}
                        strokeWidth={3}
                      />
                    }
                    label="Add"
                    onPress={() => {
                      void addExercise()
                    }}
                    style={styles.addButton}
                  />
                </View>

                <AppText
                  variant="heading"
                  style={
                    styles.sectionTitle
                  }
                >
                  Exercise order
                </AppText>
              </View>
            }
            renderItem={({
              item,
              index,
            }) => (
              <Card
                style={
                  styles.exerciseCard
                }
              >
                <Pressable
                  onPress={() =>
                    router.push({
                      pathname:
                        '/exercise/[id]',
                      params: {
                        id: item.id.toString(),
                      },
                    })
                  }
                  style={({ pressed }) => [
                    styles.exerciseMain,
                    pressed &&
                      styles.pressed,
                  ]}
                >
                  <View
                    style={
                      styles.exerciseIcon
                    }
                  >
                    <Dumbbell
                      color={
                        item.trackingType ===
                        'cardio'
                          ? theme.colors.primary
                          : theme.colors.textMuted
                      }
                      size={19}
                    />
                  </View>

                  <View
                    style={
                      styles.exerciseContent
                    }
                  >
                    <View
                      style={
                        styles.exerciseTitleRow
                      }
                    >
                      <AppText
                        variant="heading"
                        numberOfLines={1}
                        style={
                          styles.exerciseTitle
                        }
                      >
                        {item.name}
                      </AppText>

                      <View
                        style={[
                          styles.typeBadge,
                          item.trackingType ===
                            'cardio' &&
                            styles.cardioBadge,
                        ]}
                      >
                        <AppText
                          tone={
                            item.trackingType ===
                            'cardio'
                              ? 'primary'
                              : 'subtle'
                          }
                          variant="caption"
                          style={
                            styles.typeBadgeText
                          }
                        >
                          {item.trackingType ===
                          'cardio'
                            ? 'CARDIO'
                            : 'STRENGTH'}
                        </AppText>
                      </View>
                    </View>

                    <AppText
                      tone="subtle"
                      variant="caption"
                      numberOfLines={2}
                    >
                      {item.trackingType ===
                      'strength'
                        ? `${item.targetSets} sets · ${item.targetRepsMin}–${item.targetRepsMax} reps`
                        : formatCardioTarget(
                            item,
                          )}
                    </AppText>
                  </View>

                  <ChevronRight
                    color={
                      theme.colors.textSubtle
                    }
                    size={20}
                  />
                </Pressable>

                <View
                  style={
                    styles.reorderActions
                  }
                >
                  <Pressable
                    accessibilityLabel="Move exercise up"
                    disabled={index === 0}
                    onPress={() => {
                      void moveExercise(
                        item,
                        -1,
                      )
                    }}
                    style={({ pressed }) => [
                      styles.reorderButton,
                      index === 0 &&
                        styles.disabled,
                      pressed &&
                        styles.pressed,
                    ]}
                  >
                    <ArrowUp
                      color={
                        theme.colors.textMuted
                      }
                      size={16}
                    />
                  </Pressable>

                  <Pressable
                    accessibilityLabel="Move exercise down"
                    disabled={
                      index ===
                      exercises.length - 1
                    }
                    onPress={() => {
                      void moveExercise(
                        item,
                        1,
                      )
                    }}
                    style={({ pressed }) => [
                      styles.reorderButton,
                      index ===
                        exercises.length -
                          1 &&
                        styles.disabled,
                      pressed &&
                        styles.pressed,
                    ]}
                  >
                    <ArrowDown
                      color={
                        theme.colors.textMuted
                      }
                      size={16}
                    />
                  </Pressable>
                </View>
              </Card>
            )}
            ListEmptyComponent={
              <View
                style={styles.emptyState}
              >
                <View
                  style={styles.emptyIcon}
                >
                  <Dumbbell
                    color={
                      theme.colors.textSubtle
                    }
                    size={34}
                  />
                </View>

                <AppText variant="heading">
                  No exercises yet
                </AppText>

                <AppText
                  tone="subtle"
                  variant="caption"
                  style={styles.emptyText}
                >
                  Add the first exercise for
                  this workout.
                </AppText>
              </View>
            }
            ListFooterComponent={
              <View style={styles.footer}>
                <Button
                  disabled={
                    exercises.length === 0 ||
                    isStarting
                  }
                  icon={
                    <Play
                      color={
                        theme.colors.primaryText
                      }
                      fill={
                        theme.colors.primaryText
                      }
                      size={18}
                    />
                  }
                  label={
                    isStarting
                      ? 'Starting...'
                      : 'Start workout'
                  }
                  onPress={() => {
                    void startWorkout()
                  }}
                />

                <Button
                  icon={
                    <Trash2
                      color={
                        theme.colors.danger
                      }
                      size={18}
                    />
                  }
                  label="Delete workout"
                  onPress={
                    confirmDeleteWorkout
                  }
                  variant="destructive"
                />
              </View>
            }
          />
        </KeyboardAvoidingView>
      </Screen>
    </>
  )
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    list: {
      gap: theme.spacing.md,
      padding: theme.spacing.xl,
      paddingBottom:
        theme.spacing.xxl,
    },
    emptyList: {
      flexGrow: 1,
    },
    header: {
      paddingBottom: theme.spacing.sm,
    },
    eyebrow: {
      fontWeight: '900',
      letterSpacing: 1.4,
    },
    description: {
      marginTop: theme.spacing.sm,
    },
    renameCard: {
      marginTop: theme.spacing.lg,
      padding: theme.spacing.sm,
    },
    renameForm: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: theme.spacing.sm,
    },
    renameInput: {
      flex: 1,
    },
    form: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: theme.spacing.sm,
      marginTop: theme.spacing.xl,
    },
    formInput: {
      flex: 1,
    },
    addButton: {
      minWidth: 92,
    },
    sectionTitle: {
      marginBottom: theme.spacing.sm,
      marginTop: theme.spacing.xxl,
    },
    exerciseCard: {
      alignItems: 'stretch',
      flexDirection: 'row',
      overflow: 'hidden',
    },
    exerciseMain: {
      alignItems: 'center',
      flex: 1,
      flexDirection: 'row',
      padding: theme.spacing.lg,
    },
    exerciseIcon: {
      alignItems: 'center',
      backgroundColor:
        theme.colors.surfaceRaised,
      borderRadius: theme.radius.md,
      height: 42,
      justifyContent: 'center',
      width: 42,
    },
    exerciseContent: {
      flex: 1,
      marginHorizontal:
        theme.spacing.md,
    },
    exerciseTitleRow: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: theme.spacing.sm,
      marginBottom: 3,
    },
    exerciseTitle: {
      flexShrink: 1,
    },
    typeBadge: {
      backgroundColor:
        theme.colors.surfaceRaised,
      borderRadius: theme.radius.round,
      paddingHorizontal:
        theme.spacing.sm,
      paddingVertical: 2,
    },
    cardioBadge: {
      backgroundColor:
        theme.colors.primarySurface,
    },
    typeBadgeText: {
      fontSize: 8,
      fontWeight: '900',
      letterSpacing: 0.6,
    },
    reorderActions: {
      borderLeftColor:
        theme.colors.border,
      borderLeftWidth: 1,
    },
    reorderButton: {
      alignItems: 'center',
      flex: 1,
      justifyContent: 'center',
      minHeight: 42,
      width: 42,
    },
    emptyState: {
      alignItems: 'center',
      flex: 1,
      justifyContent: 'center',
      paddingBottom: 60,
    },
    emptyIcon: {
      alignItems: 'center',
      backgroundColor:
        theme.colors.surfaceRaised,
      borderRadius: theme.radius.round,
      height: 64,
      justifyContent: 'center',
      marginBottom: theme.spacing.lg,
      width: 64,
    },
    emptyText: {
      marginTop: theme.spacing.xs,
    },
    footer: {
      gap: theme.spacing.sm,
      paddingTop: theme.spacing.xxl,
    },
    pressed: {
      opacity: 0.65,
    },
    disabled: {
      opacity: 0.2,
    },
  })
}
