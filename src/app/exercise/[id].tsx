import {
  router,
  Stack,
  useFocusEffect,
  useLocalSearchParams,
} from 'expo-router'
import { useSQLiteContext } from 'expo-sqlite'
import {
  Activity,
  Dumbbell,
  Save,
  Trash2,
} from 'lucide-react-native'
import {
  useCallback,
  useMemo,
  useState,
} from 'react'
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native'

import {
  ExercisePerformanceCard,
} from '@/components/exercise/ExercisePerformanceCard'
import {
  AppText,
  Button,
  Card,
  Screen,
  SegmentedControl,
  TextField,
} from '@/components/ui'
import {
  useAppTheme,
} from '@/theme/ThemeProvider'
import type {
  AppTheme,
} from '@/theme/types'
import type {
  TrackingType,
} from '@/types/active-workout'

type ExerciseRow = {
  id: number
  name: string
  targetSets: number
  targetRepsMin: number
  targetRepsMax: number
  trackingType: TrackingType
  targetDurationSeconds: number | null
  targetDistance: number | null
  targetLevel: number | null
}

const TRACKING_OPTIONS = [
  {
    label: 'Strength',
    value: 'strength',
  },
  {
    label: 'Cardio',
    value: 'cardio',
  },
] as const

export default function ExerciseScreen() {
  const db = useSQLiteContext()
  const { theme } = useAppTheme()

  const styles = useMemo(
    () => createStyles(theme),
    [theme],
  )

  const params = useLocalSearchParams<{
    id: string
  }>()

  const exerciseId = Number(params.id)

  const [name, setName] = useState('')
  const [sets, setSets] = useState('3')

  const [
    minimumReps,
    setMinimumReps,
  ] = useState('8')

  const [
    maximumReps,
    setMaximumReps,
  ] = useState('12')

  const [
    trackingType,
    setTrackingType,
  ] = useState<TrackingType>(
    'strength',
  )

  const [
    durationMinutes,
    setDurationMinutes,
  ] = useState('20')

  const [distance, setDistance] =
    useState('')

  const [
    machineLevel,
    setMachineLevel,
  ] = useState('')

  const [isLoading, setIsLoading] =
    useState(true)

  const [isSaving, setIsSaving] =
    useState(false)

  const loadExercise =
    useCallback(async () => {
      const exercise =
        await db.getFirstAsync<ExerciseRow>(
          `
            SELECT
              id,
              name,

              target_sets
                AS targetSets,

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
            WHERE id = ?
          `,
          exerciseId,
        )

      if (!exercise) {
        router.back()
        return
      }

      setName(exercise.name)

      setSets(
        exercise.targetSets.toString(),
      )

      setMinimumReps(
        exercise.targetRepsMin > 0
          ? exercise.targetRepsMin.toString()
          : '8',
      )

      setMaximumReps(
        exercise.targetRepsMax > 0
          ? exercise.targetRepsMax.toString()
          : '12',
      )

      setTrackingType(
        exercise.trackingType ===
          'cardio'
          ? 'cardio'
          : 'strength',
      )

      setDurationMinutes(
        exercise.targetDurationSeconds !==
          null
          ? (
              exercise
                .targetDurationSeconds / 60
            ).toString()
          : '20',
      )

      setDistance(
        exercise.targetDistance?.toString() ??
          '',
      )

      setMachineLevel(
        exercise.targetLevel?.toString() ??
          '',
      )

      setIsLoading(false)
    }, [db, exerciseId])

  useFocusEffect(
    useCallback(() => {
      void loadExercise()
    }, [loadExercise]),
  )

  function changeTrackingType(
    nextType: TrackingType,
  ) {
    if (nextType === 'strength') {
      const parsedMinimum =
        Number.parseInt(
          minimumReps,
          10,
        )

      const parsedMaximum =
        Number.parseInt(
          maximumReps,
          10,
        )

      if (
        !Number.isInteger(
          parsedMinimum,
        ) ||
        parsedMinimum < 1
      ) {
        setMinimumReps('8')
      }

      if (
        !Number.isInteger(
          parsedMaximum,
        ) ||
        parsedMaximum <
          (
            Number.isInteger(
              parsedMinimum,
            )
              ? parsedMinimum
              : 8
          )
      ) {
        setMaximumReps('12')
      }
    }

    if (nextType === 'cardio') {
      const parsedDuration =
        Number(
          durationMinutes.replace(
            ',',
            '.',
          ),
        )

      if (
        !Number.isFinite(
          parsedDuration,
        ) ||
        parsedDuration <= 0
      ) {
        setDurationMinutes('20')
      }
    }

    setTrackingType(nextType)
  }

  async function saveExercise() {
    const parsedSets =
      Number.parseInt(sets, 10)

    const parsedMinimum =
      Number.parseInt(
        minimumReps,
        10,
      )

    const parsedMaximum =
      Number.parseInt(
        maximumReps,
        10,
      )

    const parsedDurationMinutes =
      Number(
        durationMinutes.replace(
          ',',
          '.',
        ),
      )

    const parsedDistance =
      distance.trim() === ''
        ? null
        : Number(
            distance.replace(',', '.'),
          )

    const parsedLevel =
      machineLevel.trim() === ''
        ? null
        : Number(
            machineLevel.replace(
              ',',
              '.',
            ),
          )

    const strengthTargetIsValid =
      Number.isInteger(
        parsedMinimum,
      ) &&
      Number.isInteger(
        parsedMaximum,
      ) &&
      parsedMinimum >= 1 &&
      parsedMaximum >= parsedMinimum

    const cardioTargetIsValid =
      Number.isFinite(
        parsedDurationMinutes,
      ) &&
      parsedDurationMinutes > 0 &&
      (
        parsedDistance === null ||
        (
          Number.isFinite(
            parsedDistance,
          ) &&
          parsedDistance >= 0
        )
      ) &&
      (
        parsedLevel === null ||
        (
          Number.isFinite(
            parsedLevel,
          ) &&
          parsedLevel >= 0
        )
      )

    if (
      !name.trim() ||
      !Number.isInteger(parsedSets) ||
      parsedSets < 1 ||
      parsedSets > 20 ||
      (
        trackingType ===
          'strength' &&
        !strengthTargetIsValid
      ) ||
      (
        trackingType ===
          'cardio' &&
        !cardioTargetIsValid
      )
    ) {
      Alert.alert(
        'Invalid exercise',
        trackingType === 'strength'
          ? 'Use 1–20 sets and a valid rep range.'
          : 'Use 1–20 sets and a valid cardio target.',
      )

      return
    }

    const storedMinimum =
      strengthTargetIsValid
        ? parsedMinimum
        : 8

    const storedMaximum =
      strengthTargetIsValid
        ? parsedMaximum
        : 12

    const storedDurationSeconds =
      cardioTargetIsValid
        ? Math.round(
            parsedDurationMinutes *
              60,
          )
        : null

    setIsSaving(true)

    try {
      await db.runAsync(
        `
          UPDATE exercises
          SET
            name = ?,
            target_sets = ?,
            target_reps_min = ?,
            target_reps_max = ?,
            tracking_type = ?,
            target_duration_seconds = ?,
            target_distance = ?,
            target_level = ?
          WHERE id = ?
        `,
        name.trim(),
        parsedSets,
        storedMinimum,
        storedMaximum,
        trackingType,
        storedDurationSeconds,
        parsedDistance,
        parsedLevel,
        exerciseId,
      )

      router.back()
    } finally {
      setIsSaving(false)
    }
  }

  function confirmDelete() {
    Alert.alert(
      'Delete exercise?',
      'Completed workout history will remain unchanged.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void deleteExercise()
          },
        },
      ],
    )
  }

  async function deleteExercise() {
    await db.runAsync(
      `
        DELETE FROM exercises
        WHERE id = ?
      `,
      exerciseId,
    )

    router.back()
  }

  if (isLoading) {
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
          title: name || 'Exercise',
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
          <ScrollView
            contentContainerStyle={
              styles.content
            }
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={
              false
            }
          >
            <View>
              <AppText
                tone="primary"
                variant="caption"
                style={styles.eyebrow}
              >
                EXERCISE
              </AppText>

              <AppText variant="display">
                {name || 'Exercise'}
              </AppText>
            </View>

            <TextField
              label="Exercise name"
              value={name}
              onChangeText={setName}
              placeholder="Exercise name"
              returnKeyType="done"
            />

            <Card style={styles.targetCard}>
              <View style={styles.cardHeading}>
                <View
                  style={styles.headingIcon}
                >
                  {trackingType ===
                  'strength' ? (
                    <Dumbbell
                      color={
                        theme.colors.primary
                      }
                      size={20}
                    />
                  ) : (
                    <Activity
                      color={
                        theme.colors.primary
                      }
                      size={20}
                    />
                  )}
                </View>

                <View>
                  <AppText variant="heading">
                    Target
                  </AppText>

                  <AppText
                    tone="subtle"
                    variant="caption"
                  >
                    Configure how this
                    exercise is tracked.
                  </AppText>
                </View>
              </View>

              <SegmentedControl
                value={trackingType}
                options={TRACKING_OPTIONS}
                onChange={
                  changeTrackingType
                }
              />

              {trackingType ===
              'strength' ? (
                <View
                  key="strength-targets"
                  style={
                    styles.strengthFields
                  }
                >
                  <View style={styles.field}>
                    <TextField
                      label="Sets"
                      value={sets}
                      onChangeText={setSets}
                      keyboardType="number-pad"
                      selectTextOnFocus
                      style={
                        styles.numberInput
                      }
                    />
                  </View>

                  <View style={styles.field}>
                    <TextField
                      label="Min reps"
                      value={minimumReps}
                      onChangeText={
                        setMinimumReps
                      }
                      keyboardType="number-pad"
                      selectTextOnFocus
                      style={
                        styles.numberInput
                      }
                    />
                  </View>

                  <View style={styles.field}>
                    <TextField
                      label="Max reps"
                      value={maximumReps}
                      onChangeText={
                        setMaximumReps
                      }
                      keyboardType="number-pad"
                      selectTextOnFocus
                      style={
                        styles.numberInput
                      }
                    />
                  </View>
                </View>
              ) : (
                <View
                  key="cardio-targets"
                  style={styles.cardioFields}
                >
                  <View
                    style={
                      styles.cardioField
                    }
                  >
                    <TextField
                      label="Sets"
                      value={sets}
                      onChangeText={setSets}
                      keyboardType="number-pad"
                      selectTextOnFocus
                      style={
                        styles.numberInput
                      }
                    />
                  </View>

                  <View
                    style={
                      styles.cardioField
                    }
                  >
                    <TextField
                      label="Minutes"
                      value={durationMinutes}
                      onChangeText={
                        setDurationMinutes
                      }
                      keyboardType="decimal-pad"
                      selectTextOnFocus
                      style={
                        styles.numberInput
                      }
                    />
                  </View>

                  <View
                    style={
                      styles.cardioField
                    }
                  >
                    <TextField
                      label="Distance (km)"
                      value={distance}
                      onChangeText={
                        setDistance
                      }
                      keyboardType="decimal-pad"
                      placeholder="Optional"
                      selectTextOnFocus
                      style={
                        styles.numberInput
                      }
                    />
                  </View>

                  <View
                    style={
                      styles.cardioField
                    }
                  >
                    <TextField
                      label="Level / resistance"
                      value={machineLevel}
                      onChangeText={
                        setMachineLevel
                      }
                      keyboardType="decimal-pad"
                      placeholder="Optional"
                      selectTextOnFocus
                      style={
                        styles.numberInput
                      }
                    />
                  </View>
                </View>
              )}
            </Card>

            <ExercisePerformanceCard
              exerciseId={exerciseId}
              trackingType={trackingType}
            />

            <View style={styles.actions}>
              <Button
                disabled={isSaving}
                icon={
                  <Save
                    color={
                      theme.colors.primaryText
                    }
                    size={19}
                  />
                }
                label={
                  isSaving
                    ? 'Saving...'
                    : 'Save exercise'
                }
                onPress={() => {
                  void saveExercise()
                }}
              />

              <Button
                icon={
                  <Trash2
                    color={
                      theme.colors.danger
                    }
                    size={19}
                  />
                }
                label="Delete exercise"
                onPress={confirmDelete}
                variant="destructive"
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Screen>
    </>
  )
}

function createStyles(
  theme: AppTheme,
) {
  return StyleSheet.create({
    loading: {
      alignItems: 'center',
      backgroundColor:
        theme.colors.background,
      flex: 1,
      justifyContent: 'center',
    },
    container: {
      flex: 1,
    },
    content: {
      flexGrow: 1,
      gap: theme.spacing.xl,
      padding: theme.spacing.xl,
    },
    eyebrow: {
      fontWeight: '900',
      letterSpacing: 1.4,
    },
    targetCard: {
      gap: theme.spacing.lg,
      padding: theme.spacing.lg,
    },
    cardHeading: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: theme.spacing.md,
    },
    headingIcon: {
      alignItems: 'center',
      backgroundColor:
        theme.colors.primarySurface,
      borderRadius: theme.radius.md,
      height: 42,
      justifyContent: 'center',
      width: 42,
    },
    strengthFields: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
      width: '100%',
    },
    field: {
      flex: 1,
      minWidth: 0,
    },
    cardioFields: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      rowGap: theme.spacing.md,
      width: '100%',
    },
    cardioField: {
      flexBasis: '48%',
      flexGrow: 0,
      flexShrink: 0,
      minWidth: 0,
    },
    numberInput: {
      fontSize: 18,
      fontWeight: '800',
      minWidth: 0,
      textAlign: 'center',
      width: '100%',
    },
    actions: {
      gap: theme.spacing.sm,
      marginTop: 'auto',
      paddingTop: theme.spacing.md,
    },
  })
}
