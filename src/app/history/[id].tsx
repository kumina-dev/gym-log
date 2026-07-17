import { Card } from '@/components/ui'
import { useAppTheme } from '@/theme/ThemeProvider'
import type { AppTheme } from '@/theme/types'
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router'
import { useSQLiteContext } from 'expo-sqlite'
import { Check, Minus, Pencil, Save, Trash2, X } from 'lucide-react-native'
import { useCallback, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

type HistoryRow = {
  exerciseId: number
  exerciseName: string
  exercisePosition: number
  setId: number
  setNumber: number
  weight: number | null
  reps: number | null
  rir: number | null
  completed: number
}

type HistorySet = {
  id: number
  setNumber: number
  weight: string
  reps: string
  rir: string
  completed: boolean
}

type HistoryExercise = {
  id: number
  name: string
  position: number
  sets: HistorySet[]
}

export default function HistoryDetailScreen() {
  const db = useSQLiteContext()
  const { theme } = useAppTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
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
    useState<HistoryExercise[] | null>(null)

  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const loadWorkout = useCallback(async () => {
    const rows = await db.getAllAsync<HistoryRow>(
      `
        SELECT
          session_exercises.id AS exerciseId,
          session_exercises.name AS exerciseName,
          session_exercises.position AS exercisePosition,
          set_logs.id AS setId,
          set_logs.set_number AS setNumber,
          set_logs.weight,
          set_logs.reps,
          set_logs.rir,
          set_logs.completed
        FROM session_exercises
        INNER JOIN set_logs
          ON set_logs.session_exercise_id =
            session_exercises.id
        WHERE session_exercises.session_id = ?
        ORDER BY
          session_exercises.position,
          session_exercises.id,
          set_logs.set_number
      `,
      sessionId,
    )

    const grouped: HistoryExercise[] = []

    for (const row of rows) {
      let exercise = grouped.find(
        (item) => item.id === row.exerciseId,
      )

      if (!exercise) {
        exercise = {
          id: row.exerciseId,
          name: row.exerciseName,
          position: row.exercisePosition,
          sets: [],
        }

        grouped.push(exercise)
      }

      exercise.sets.push({
        id: row.setId,
        setNumber: row.setNumber,
        weight: row.weight?.toString() ?? '',
        reps: row.reps?.toString() ?? '',
        rir: row.rir?.toString() ?? '',
        completed: row.completed === 1,
      })
    }

    setExercises(grouped)
  }, [db, sessionId])

  useFocusEffect(
    useCallback(() => {
      void loadWorkout()
    }, [loadWorkout]),
  )

  function updateSet(
    exerciseId: number,
    setId: number,
    changes: Partial<HistorySet>,
  ) {
    setExercises((current) =>
      current?.map((exercise) =>
        exercise.id !== exerciseId
          ? exercise
          : {
              ...exercise,
              sets: exercise.sets.map((set) =>
                set.id === setId
                  ? { ...set, ...changes }
                  : set,
              ),
            },
      ) ?? null,
    )
  }

  async function saveWorkout() {
    if (!exercises || isSaving) {
      return
    }

    setIsSaving(true)

    try {
      await db.withTransactionAsync(async () => {
        for (const exercise of exercises) {
          for (const set of exercise.sets) {
            const normalizedWeight =
              set.weight.replace(',', '.')

            const weight =
              normalizedWeight.trim() === ''
                ? null
                : Number(normalizedWeight)

            const reps =
              set.reps.trim() === ''
                ? null
                : Number.parseInt(set.reps, 10)

            const rir =
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
              weight !== null && Number.isFinite(weight)
                ? weight
                : null,
              reps !== null &&
                Number.isInteger(reps) &&
                reps >= 0
                ? reps
                : null,
              rir !== null &&
                Number.isInteger(rir) &&
                rir >= 0 &&
                rir <= 10
                ? rir
                : null,
              set.completed ? 1 : 0,
              set.id,
            )
          }
        }
      })

      setIsEditing(false)
      await loadWorkout()
    } finally {
      setIsSaving(false)
    }
  }

  async function cancelEditing() {
    setIsEditing(false)
    await loadWorkout()
  }

  function confirmDelete() {
    Alert.alert(
      'Delete workout history?',
      'This permanently removes every recorded set from this workout.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => void deleteWorkout(),
        },
      ],
    )
  }

  async function deleteWorkout() {
    await db.runAsync(
      'DELETE FROM workout_sessions WHERE id = ?',
      sessionId,
    )

    router.back()
  }

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
          headerRight: () =>
            isEditing ? (
              <View style={styles.headerActions}>
                <Pressable
                  accessibilityLabel="Cancel editing"
                  hitSlop={10}
                  onPress={() => void cancelEditing()}
                >
                  <X color={theme.colors.textMuted} size={21} />
                </Pressable>

                <Pressable
                  accessibilityLabel="Save workout"
                  disabled={isSaving}
                  hitSlop={10}
                  onPress={() => void saveWorkout()}
                >
                  <Save color={theme.colors.primary} size={21} />
                </Pressable>
              </View>
            ) : (
              <View style={styles.headerActions}>
                <Pressable
                  accessibilityLabel="Edit workout"
                  hitSlop={10}
                  onPress={() => setIsEditing(true)}
                >
                  <Pencil color={theme.colors.textMuted} size={20} />
                </Pressable>

                <Pressable
                  accessibilityLabel="Delete workout"
                  hitSlop={10}
                  onPress={confirmDelete}
                >
                  <Trash2 color={theme.colors.danger} size={21} />
                </Pressable>
              </View>
            ),
        }}
      />

      <SafeAreaView
        edges={['bottom']}
        style={styles.container}
      >
        <KeyboardAvoidingView
          behavior={
            Platform.OS === 'ios' ? 'padding' : undefined
          }
          style={styles.container}
        >
          {isEditing && (
            <View style={styles.editBanner}>
              <Pencil color={theme.colors.primary} size={17} />
              <Text style={styles.editBannerText}>
                Editing recorded sets
              </Text>
            </View>
          )}

          <FlatList
            data={exercises}
            keyExtractor={(exercise) =>
              exercise.id.toString()
            }
            contentContainerStyle={styles.list}
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Card style={styles.card}>
                <Text style={styles.exerciseName}>
                  {item.name}
                </Text>

                <View style={styles.headerRow}>
                  <Text style={styles.setColumn}>SET</Text>
                  <Text style={styles.valueColumn}>KG</Text>
                  <Text style={styles.valueColumn}>REPS</Text>
                  <Text style={styles.valueColumn}>RIR</Text>
                  <Text style={styles.doneColumn}>DONE</Text>
                </View>

                {item.sets.map((set) => (
                  <View
                    key={set.id}
                    style={[
                      styles.setRow,
                      !set.completed &&
                        !isEditing &&
                        styles.incompleteSet,
                    ]}
                  >
                    <Text style={styles.setNumber}>
                      {set.setNumber}
                    </Text>

                    {isEditing ? (
                      <>
                        <TextInput
                          value={set.weight}
                          onChangeText={(weight) =>
                            updateSet(item.id, set.id, {
                              weight,
                            })
                          }
                          keyboardType="decimal-pad"
                          placeholder="—"
                          placeholderTextColor={theme.colors.textSubtle}
                          selectTextOnFocus
                          style={styles.input}
                        />

                        <TextInput
                          value={set.reps}
                          onChangeText={(reps) =>
                            updateSet(item.id, set.id, {
                              reps,
                            })
                          }
                          keyboardType="number-pad"
                          placeholder="—"
                          placeholderTextColor={theme.colors.textSubtle}
                          selectTextOnFocus
                          style={styles.input}
                        />

                        <TextInput
                          value={set.rir}
                          onChangeText={(rir) =>
                            updateSet(item.id, set.id, {
                              rir,
                            })
                          }
                          keyboardType="number-pad"
                          maxLength={2}
                          placeholder="—"
                          placeholderTextColor={theme.colors.textSubtle}
                          selectTextOnFocus
                          style={styles.input}
                        />

                        <Pressable
                          accessibilityLabel={
                            set.completed
                              ? 'Mark set incomplete'
                              : 'Mark set complete'
                          }
                          onPress={() =>
                            updateSet(item.id, set.id, {
                              completed: !set.completed,
                            })
                          }
                          style={[
                            styles.checkbox,
                            set.completed &&
                              styles.checkboxCompleted,
                          ]}
                        >
                          {set.completed && (
                            <Check
                              color={theme.colors.primaryText}
                              size={18}
                              strokeWidth={3}
                            />
                          )}
                        </Pressable>
                      </>
                    ) : (
                      <>
                        <Text style={styles.value}>
                          {set.weight || '—'}
                        </Text>

                        <Text style={styles.value}>
                          {set.reps || '—'}
                        </Text>

                        <Text style={styles.value}>
                          {set.rir || '—'}
                        </Text>

                        <View style={styles.doneColumn}>
                          {set.completed ? (
                            <Check
                              color={theme.colors.primary}
                              size={18}
                              strokeWidth={3}
                            />
                          ) : (
                            <Minus
                              color={theme.colors.textSubtle}
                              size={18}
                            />
                          )}
                        </View>
                      </>
                    )}
                  </View>
                ))}
              </Card>
            )}
          />
        </KeyboardAvoidingView>
      </SafeAreaView>
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
  },
  headerActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 20,
  },
  editBanner: {
    alignItems: 'center',
    backgroundColor: theme.colors.primarySurface,
    borderBottomColor: theme.colors.primary,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  editBannerText: {
    color: theme.colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  list: {
    gap: 14,
    padding: 16,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  exerciseName: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 16,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 6,
  },
  setRow: {
    alignItems: 'center',
    borderTopColor: theme.colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    paddingVertical: 9,
  },
  incompleteSet: {
    opacity: 0.4,
  },
  setColumn: {
    color: theme.colors.textSubtle,
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
    width: 34,
  },
  valueColumn: {
    color: theme.colors.textSubtle,
    flex: 1,
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },
  doneColumn: {
    alignItems: 'center',
    color: theme.colors.textSubtle,
    fontSize: 9,
    fontWeight: '700',
    justifyContent: 'center',
    width: 42,
  },
  setNumber: {
    color: theme.colors.textMuted,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    width: 34,
  },
  value: {
    color: theme.colors.text,
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  input: {
    backgroundColor: theme.colors.input,
    borderColor: theme.colors.borderStrong,
    borderRadius: 8,
    borderWidth: 1,
    color: theme.colors.text,
    flex: 1,
    fontSize: 14,
    marginHorizontal: 3,
    paddingHorizontal: 4,
    paddingVertical: 9,
    textAlign: 'center',
  },
  checkbox: {
    alignItems: 'center',
    borderColor: theme.colors.borderStrong,
    borderRadius: 8,
    borderWidth: 2,
    height: 32,
    justifyContent: 'center',
    marginLeft: 5,
    width: 32,
  },
  checkboxCompleted: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
})
