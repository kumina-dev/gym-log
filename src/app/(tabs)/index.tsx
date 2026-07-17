import {
  router,
  useFocusEffect,
} from 'expo-router'
import { useSQLiteContext } from 'expo-sqlite'
import {
  ArrowDown,
  ArrowUp,
  ChevronRight,
  Dumbbell,
  Play,
  Plus,
  Settings,
} from 'lucide-react-native'
import {
  useCallback,
  useMemo,
  useState,
} from 'react'
import {
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

type Workout = {
  id: number
  name: string
  position: number
  exerciseCount: number
}

type ActiveSession = {
  id: number
  workoutName: string
  startedAt: string
}

export default function HomeScreen() {
  const db = useSQLiteContext()
  const { theme } = useAppTheme()

  const styles = useMemo(
    () => createStyles(theme),
    [theme],
  )

  const [workouts, setWorkouts] =
    useState<Workout[]>([])

  const [activeSession, setActiveSession] =
    useState<ActiveSession | null>(null)

  const [name, setName] = useState('')

  const loadWorkouts = useCallback(async () => {
    const [workoutRows, activeWorkout] =
      await Promise.all([
        db.getAllAsync<Workout>(`
          SELECT
            workout_days.id,
            workout_days.name,
            workout_days.position,
            COUNT(exercises.id) AS exerciseCount
          FROM workout_days
          LEFT JOIN exercises
            ON exercises.workout_day_id =
              workout_days.id
          GROUP BY workout_days.id
          ORDER BY
            workout_days.position,
            workout_days.id
        `),
        db.getFirstAsync<ActiveSession>(`
          SELECT
            id,
            workout_day_name AS workoutName,
            started_at AS startedAt
          FROM workout_sessions
          WHERE completed_at IS NULL
          ORDER BY started_at DESC
          LIMIT 1
        `),
      ])

    setWorkouts(workoutRows)
    setActiveSession(activeWorkout ?? null)
  }, [db])

  useFocusEffect(
    useCallback(() => {
      void loadWorkouts()
    }, [loadWorkouts]),
  )

  async function addWorkout() {
    const trimmedName = name.trim()

    if (!trimmedName) {
      return
    }

    await db.runAsync(
      `
        INSERT INTO workout_days (
          name,
          position
        )
        VALUES (?, ?)
      `,
      trimmedName,
      workouts.length,
    )

    setName('')
    await loadWorkouts()
  }

  async function moveWorkout(
    workout: Workout,
    direction: -1 | 1,
  ) {
    const currentIndex =
      workouts.findIndex(
        (item) => item.id === workout.id,
      )

    const targetIndex =
      currentIndex + direction

    const targetWorkout =
      workouts[targetIndex]

    if (
      currentIndex < 0 ||
      !targetWorkout
    ) {
      return
    }

    await db.withTransactionAsync(
      async () => {
        await db.runAsync(
          `
            UPDATE workout_days
            SET position = ?
            WHERE id = ?
          `,
          targetWorkout.position,
          workout.id,
        )

        await db.runAsync(
          `
            UPDATE workout_days
            SET position = ?
            WHERE id = ?
          `,
          workout.position,
          targetWorkout.id,
        )
      },
    )

    await loadWorkouts()
  }

  return (
    <Screen edges={['top']}>
      <KeyboardAvoidingView
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : undefined
        }
        style={styles.container}
      >
        <FlatList
          data={workouts}
          keyExtractor={(workout) =>
            workout.id.toString()
          }
          contentContainerStyle={[
            styles.list,
            workouts.length === 0 &&
              styles.emptyList,
          ]}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <View style={styles.header}>
              <View style={styles.headingRow}>
                <View style={styles.headingText}>
                  <AppText
                    tone="primary"
                    variant="caption"
                    style={styles.eyebrow}
                  >
                    YOUR SPLIT
                  </AppText>

                  <AppText variant="display">
                    Workouts
                  </AppText>
                </View>

                <IconButton
                  accessibilityLabel="Open settings"
                  icon={
                    <Settings
                      color={
                        theme.colors.textMuted
                      }
                      size={21}
                    />
                  }
                  onPress={() =>
                    router.push('/settings')
                  }
                />
              </View>

              <AppText
                tone="muted"
                style={styles.description}
              >
                Create the workouts in your
                gym split.
              </AppText>

              <View style={styles.form}>
                <View style={styles.formInput}>
                  <TextField
                    value={name}
                    onChangeText={setName}
                    onSubmitEditing={() => {
                      void addWorkout()
                    }}
                    placeholder="Push, Pull, Legs..."
                    returnKeyType="done"
                  />
                </View>

                <Button
                  disabled={!name.trim()}
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
                    void addWorkout()
                  }}
                  style={styles.addButton}
                />
              </View>

              {activeSession && (
                <Card style={styles.activeCard}>
                  <Pressable
                    onPress={() =>
                      router.push({
                        pathname:
                          '/workout/[id]',
                        params: {
                          id: activeSession.id.toString(),
                          name: activeSession.workoutName,
                        },
                      })
                    }
                    style={({ pressed }) => [
                      styles.activeMain,
                      pressed &&
                        styles.pressed,
                    ]}
                  >
                    <View
                      style={
                        styles.activeIcon
                      }
                    >
                      <Play
                        color={
                          theme.colors.primaryText
                        }
                        fill={
                          theme.colors.primaryText
                        }
                        size={18}
                      />
                    </View>

                    <View
                      style={
                        styles.activeContent
                      }
                    >
                      <AppText
                        tone="primary"
                        variant="caption"
                        style={
                          styles.activeLabel
                        }
                      >
                        WORKOUT IN PROGRESS
                      </AppText>

                      <AppText
                        variant="heading"
                        numberOfLines={1}
                      >
                        {
                          activeSession.workoutName
                        }
                      </AppText>
                    </View>

                    <AppText
                      tone="primary"
                      variant="label"
                    >
                      Resume
                    </AppText>
                  </Pressable>
                </Card>
              )}

              <AppText
                variant="heading"
                style={styles.sectionTitle}
              >
                Your workouts
              </AppText>
            </View>
          }
          renderItem={({ item, index }) => (
            <Card style={styles.workoutCard}>
              <Pressable
                onPress={() =>
                  router.push({
                    pathname:
                      '/workout-day/[id]',
                    params: {
                      id: item.id.toString(),
                      name: item.name,
                    },
                  })
                }
                style={({ pressed }) => [
                  styles.workoutMain,
                  pressed &&
                    styles.pressed,
                ]}
              >
                <View
                  style={styles.workoutIcon}
                >
                  <Dumbbell
                    color={
                      theme.colors.textMuted
                    }
                    size={19}
                  />
                </View>

                <View
                  style={
                    styles.workoutContent
                  }
                >
                  <AppText
                    variant="heading"
                    numberOfLines={1}
                  >
                    {item.name}
                  </AppText>

                  <AppText
                    tone="subtle"
                    variant="caption"
                  >
                    {item.exerciseCount === 1
                      ? '1 exercise'
                      : `${item.exerciseCount} exercises`}
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
                  accessibilityLabel="Move workout up"
                  disabled={index === 0}
                  onPress={() => {
                    void moveWorkout(
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
                  accessibilityLabel="Move workout down"
                  disabled={
                    index ===
                    workouts.length - 1
                  }
                  onPress={() => {
                    void moveWorkout(
                      item,
                      1,
                    )
                  }}
                  style={({ pressed }) => [
                    styles.reorderButton,
                    index ===
                      workouts.length - 1 &&
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
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Dumbbell
                  color={
                    theme.colors.textSubtle
                  }
                  size={34}
                />
              </View>

              <AppText variant="heading">
                Your split is empty
              </AppText>

              <AppText
                tone="subtle"
                variant="caption"
                style={styles.emptyText}
              >
                Add your first workout above.
              </AppText>
            </View>
          }
        />
      </KeyboardAvoidingView>
    </Screen>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    list: {
      gap: theme.spacing.md,
      padding: theme.spacing.xl,
      paddingBottom: theme.spacing.xxl,
    },
    emptyList: {
      flexGrow: 1,
    },
    header: {
      paddingBottom: theme.spacing.sm,
    },
    headingRow: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    headingText: {
      flex: 1,
    },
    eyebrow: {
      fontWeight: '900',
      letterSpacing: 1.4,
    },
    description: {
      marginTop: theme.spacing.sm,
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
      minWidth: 94,
    },
    activeCard: {
      backgroundColor:
        theme.colors.primarySurface,
      borderColor: theme.colors.primary,
      marginTop: theme.spacing.lg,
      overflow: 'hidden',
    },
    activeMain: {
      alignItems: 'center',
      flexDirection: 'row',
      padding: theme.spacing.md,
    },
    activeIcon: {
      alignItems: 'center',
      backgroundColor:
        theme.colors.primary,
      borderRadius: theme.radius.md,
      height: 40,
      justifyContent: 'center',
      width: 40,
    },
    activeContent: {
      flex: 1,
      marginHorizontal:
        theme.spacing.md,
    },
    activeLabel: {
      fontSize: 10,
      fontWeight: '900',
      letterSpacing: 0.8,
    },
    sectionTitle: {
      marginBottom: theme.spacing.sm,
      marginTop: theme.spacing.xxl,
    },
    workoutCard: {
      alignItems: 'stretch',
      flexDirection: 'row',
      overflow: 'hidden',
    },
    workoutMain: {
      alignItems: 'center',
      flex: 1,
      flexDirection: 'row',
      padding: theme.spacing.lg,
    },
    workoutIcon: {
      alignItems: 'center',
      backgroundColor:
        theme.colors.surfaceRaised,
      borderRadius: theme.radius.md,
      height: 42,
      justifyContent: 'center',
      width: 42,
    },
    workoutContent: {
      flex: 1,
      gap: 2,
      marginLeft: theme.spacing.md,
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
      paddingBottom: 70,
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
    pressed: {
      opacity: 0.65,
    },
    disabled: {
      opacity: 0.2,
    },
  })
}
