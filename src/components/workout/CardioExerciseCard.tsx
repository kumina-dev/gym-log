import { Card } from '@/components/ui'
import { useAppTheme } from '@/theme/ThemeProvider'
import type { AppTheme } from '@/theme/types'
import type {
  WorkoutExercise,
  WorkoutSet,
} from '@/types/active-workout'
import {
  formatCardioValues,
} from '@/utils/workout-format'
import {
  Minus,
  Plus,
} from 'lucide-react-native'
import { useMemo } from 'react'
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'

type CardioExerciseCardProps = {
  exercise: WorkoutExercise
  onUpdateSet: (
    exerciseId: number,
    setId: number,
    changes: Partial<WorkoutSet>,
  ) => void
  onSaveSet: (
    set: WorkoutSet,
  ) => Promise<void>
  onApplyPreviousSet: (
    exerciseId: number,
    set: WorkoutSet,
  ) => void
  onToggleSet: (
    exerciseId: number,
    set: WorkoutSet,
  ) => Promise<void>
  onAddSet: (
    exercise: WorkoutExercise,
  ) => Promise<void>
  onRemoveLastSet: (
    exercise: WorkoutExercise,
  ) => Promise<void>
}

export function CardioExerciseCard({
  exercise,
  onUpdateSet,
  onSaveSet,
  onApplyPreviousSet,
  onToggleSet,
  onAddSet,
  onRemoveLastSet,
}: CardioExerciseCardProps) {
  const { theme } = useAppTheme()

  const styles = useMemo(
    () => createStyles(theme),
    [theme],
  )

  const target = formatCardioValues(
    exercise.targetDurationSeconds,
    exercise.targetDistance,
    exercise.targetLevel,
  )

  return (
    <Card style={styles.card}>
      <View style={styles.heading}>
        <View style={styles.headingText}>
          <Text style={styles.exerciseName}>
            {exercise.name}
          </Text>

          <Text style={styles.trackingLabel}>
            CARDIO
          </Text>
        </View>
      </View>

      {target !== '' && (
        <Text style={styles.target}>
          Target: {target}
        </Text>
      )}

      {exercise.sets.map((set) => {
        const previous =
          formatCardioValues(
            set.previousDurationSeconds,
            set.previousDistance,
            set.previousLevel,
          )

        return (
          <View
            key={set.id}
            style={styles.setContainer}
          >
            <View style={styles.setHeader}>
              <Text style={styles.setTitle}>
                Set {set.setNumber}
              </Text>

              <Pressable
                accessibilityLabel={
                  previous === ''
                    ? `No previous result for set ${set.setNumber}`
                    : `Copy previous result for set ${set.setNumber}`
                }
                disabled={previous === ''}
                onPress={() =>
                  onApplyPreviousSet(
                    exercise.id,
                    set,
                  )
                }
                style={({ pressed }) => [
                  styles.previousButton,
                  pressed &&
                    styles.previousButtonPressed,
                ]}
              >
                <Text
                  numberOfLines={1}
                  style={[
                    styles.previousText,
                    previous === '' &&
                      styles.previousTextEmpty,
                  ]}
                >
                  {previous === ''
                    ? 'No previous result'
                    : `Previous: ${previous}`}
                </Text>
              </Pressable>

              <Pressable
                accessibilityLabel={
                  set.completed
                    ? `Mark set ${set.setNumber} incomplete`
                    : `Mark set ${set.setNumber} complete`
                }
                onPress={() =>
                  void onToggleSet(
                    exercise.id,
                    set,
                  )
                }
                style={[
                  styles.checkbox,
                  set.completed &&
                    styles.checkboxCompleted,
                ]}
              >
                <Text style={styles.checkmark}>
                  {set.completed ? '✓' : ''}
                </Text>
              </Pressable>
            </View>

            <View style={styles.fields}>
              <View style={styles.halfField}>
                <Text style={styles.fieldLabel}>
                  MINUTES
                </Text>

                <TextInput
                  accessibilityLabel={
                    `Minutes for set ${set.setNumber}`
                  }
                  value={set.durationMinutes}
                  onChangeText={(
                    durationMinutes,
                  ) =>
                    onUpdateSet(
                      exercise.id,
                      set.id,
                      {
                        durationMinutes,
                      },
                    )
                  }
                  onBlur={() =>
                    void onSaveSet(set)
                  }
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor={
                    theme.colors.textSubtle
                  }
                  selectTextOnFocus
                  style={styles.input}
                />
              </View>

              <View style={styles.halfField}>
                <Text style={styles.fieldLabel}>
                  DISTANCE (KM)
                </Text>

                <TextInput
                  accessibilityLabel={
                    `Distance for set ${set.setNumber}`
                  }
                  value={set.distance}
                  onChangeText={(distance) =>
                    onUpdateSet(
                      exercise.id,
                      set.id,
                      { distance },
                    )
                  }
                  onBlur={() =>
                    void onSaveSet(set)
                  }
                  keyboardType="decimal-pad"
                  placeholder="Optional"
                  placeholderTextColor={
                    theme.colors.textSubtle
                  }
                  selectTextOnFocus
                  style={styles.input}
                />
              </View>

              <View style={styles.fullField}>
                <Text style={styles.fieldLabel}>
                  LEVEL / RESISTANCE
                </Text>

                <TextInput
                  accessibilityLabel={
                    `Level or resistance for set ${set.setNumber}`
                  }
                  value={set.level}
                  onChangeText={(level) =>
                    onUpdateSet(
                      exercise.id,
                      set.id,
                      { level },
                    )
                  }
                  onBlur={() =>
                    void onSaveSet(set)
                  }
                  keyboardType="decimal-pad"
                  placeholder="Optional"
                  placeholderTextColor={
                    theme.colors.textSubtle
                  }
                  selectTextOnFocus
                  style={styles.input}
                />
              </View>
            </View>
          </View>
        )
      })}

      <View style={styles.setActions}>
        <Pressable
          accessibilityLabel="Remove last set"
          disabled={
            exercise.sets.length <= 1
          }
          onPress={() =>
            void onRemoveLastSet(exercise)
          }
          style={({ pressed }) => [
            styles.setActionButton,
            exercise.sets.length <= 1 &&
              styles.setActionButtonDisabled,
            pressed &&
              styles.setActionButtonPressed,
          ]}
        >
          <Minus
            color={theme.colors.textMuted}
            size={16}
          />

          <Text style={styles.setActionText}>
            Remove set
          </Text>
        </Pressable>

        <Pressable
          accessibilityLabel="Add set"
          onPress={() =>
            void onAddSet(exercise)
          }
          style={({ pressed }) => [
            styles.setActionButton,
            pressed &&
              styles.setActionButtonPressed,
          ]}
        >
          <Plus
            color={theme.colors.textMuted}
            size={16}
          />

          <Text style={styles.setActionText}>
            Add set
          </Text>
        </Pressable>
      </View>
    </Card>
  )
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    card: {
      backgroundColor:
        theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: 16,
      borderWidth: 1,
      padding: 16,
    },
    heading: {
      alignItems: 'flex-start',
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    headingText: {
      flex: 1,
      minWidth: 0,
    },
    exerciseName: {
      color: theme.colors.text,
      fontSize: 18,
      fontWeight: '800',
    },
    trackingLabel: {
      color: theme.colors.primary,
      fontSize: 10,
      fontWeight: '900',
      letterSpacing: 1.1,
      marginTop: 5,
    },
    target: {
      color: theme.colors.textMuted,
      fontSize: 12,
      fontWeight: '600',
      marginTop: 10,
    },
    setContainer: {
      borderTopColor:
        theme.colors.border,
      borderTopWidth: 1,
      marginTop: 14,
      paddingTop: 14,
    },
    setHeader: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 10,
    },
    setTitle: {
      color: theme.colors.text,
      fontSize: 14,
      fontWeight: '800',
    },
    previousButton: {
      flex: 1,
      minWidth: 0,
    },
    previousButtonPressed: {
      opacity: 0.55,
    },
    previousText: {
      color: theme.colors.primary,
      fontSize: 11,
      fontWeight: '700',
      textAlign: 'center',
    },
    previousTextEmpty: {
      color: theme.colors.textSubtle,
    },
    checkbox: {
      alignItems: 'center',
      borderColor:
        theme.colors.borderStrong,
      borderRadius: 8,
      borderWidth: 2,
      height: 34,
      justifyContent: 'center',
      width: 34,
    },
    checkboxCompleted: {
      backgroundColor:
        theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    checkmark: {
      color: theme.colors.primaryText,
      fontSize: 20,
      fontWeight: '900',
    },
    fields: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 12,
    },
    halfField: {
      flexBasis: '48%',
      flexGrow: 1,
    },
    fullField: {
      flexBasis: '100%',
      flexGrow: 1,
    },
    fieldLabel: {
      color: theme.colors.textSubtle,
      fontSize: 9,
      fontWeight: '800',
      marginBottom: 5,
    },
    input: {
      backgroundColor:
        theme.colors.input,
      borderColor: theme.colors.border,
      borderRadius: 10,
      borderWidth: 1,
      color: theme.colors.text,
      fontSize: 15,
      fontWeight: '700',
      paddingHorizontal: 10,
      paddingVertical: 11,
      textAlign: 'center',
    },
    setActions: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 14,
    },
    setActionButton: {
      alignItems: 'center',
      borderColor:
        theme.colors.borderStrong,
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
  })
