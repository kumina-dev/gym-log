import { Card } from '@/components/ui'
import { useAppTheme } from '@/theme/ThemeProvider'
import type { AppTheme } from '@/theme/types'
import type {
  HistoryExercise,
  HistorySet,
} from '@/types/workout-history'
import {
  Check,
  Minus,
} from 'lucide-react-native'
import { useMemo } from 'react'
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'

type StrengthHistoryCardProps = {
  exercise: HistoryExercise
  isEditing: boolean
  onUpdateSet: (
    exerciseId: number,
    setId: number,
    changes: Partial<HistorySet>,
  ) => void
}

export function StrengthHistoryCard({
  exercise,
  isEditing,
  onUpdateSet,
}: StrengthHistoryCardProps) {
  const { theme } = useAppTheme()

  const styles = useMemo(
    () => createStyles(theme),
    [theme],
  )

  return (
    <Card style={styles.card}>
      <Text style={styles.exerciseName}>
        {exercise.name}
      </Text>

      <View style={styles.headerRow}>
        <Text style={styles.setColumn}>
          SET
        </Text>

        <Text style={styles.valueColumn}>
          KG
        </Text>

        <Text style={styles.valueColumn}>
          REPS
        </Text>

        <Text style={styles.valueColumn}>
          RIR
        </Text>

        <Text style={styles.doneColumn}>
          DONE
        </Text>
      </View>

      {exercise.sets.map((set) => (
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
                accessibilityLabel={
                  `Weight for set ${set.setNumber}`
                }
                value={set.weight}
                onChangeText={(weight) =>
                  onUpdateSet(
                    exercise.id,
                    set.id,
                    { weight },
                  )
                }
                keyboardType="decimal-pad"
                placeholder="—"
                placeholderTextColor={
                  theme.colors.textSubtle
                }
                selectTextOnFocus
                style={styles.input}
              />

              <TextInput
                accessibilityLabel={
                  `Reps for set ${set.setNumber}`
                }
                value={set.reps}
                onChangeText={(reps) =>
                  onUpdateSet(
                    exercise.id,
                    set.id,
                    { reps },
                  )
                }
                keyboardType="number-pad"
                placeholder="—"
                placeholderTextColor={
                  theme.colors.textSubtle
                }
                selectTextOnFocus
                style={styles.input}
              />

              <TextInput
                accessibilityLabel={
                  `RIR for set ${set.setNumber}`
                }
                value={set.rir}
                onChangeText={(rir) =>
                  onUpdateSet(
                    exercise.id,
                    set.id,
                    { rir },
                  )
                }
                keyboardType="number-pad"
                maxLength={2}
                placeholder="—"
                placeholderTextColor={
                  theme.colors.textSubtle
                }
                selectTextOnFocus
                style={styles.input}
              />

              <Pressable
                accessibilityLabel={
                  set.completed
                    ? `Mark set ${set.setNumber} incomplete`
                    : `Mark set ${set.setNumber} complete`
                }
                onPress={() =>
                  onUpdateSet(
                    exercise.id,
                    set.id,
                    {
                      completed:
                        !set.completed,
                    },
                  )
                }
                style={[
                  styles.checkbox,
                  set.completed &&
                    styles.checkboxCompleted,
                ]}
              >
                {set.completed && (
                  <Check
                    color={
                      theme.colors.primaryText
                    }
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
                    color={
                      theme.colors.primary
                    }
                    size={18}
                    strokeWidth={3}
                  />
                ) : (
                  <Minus
                    color={
                      theme.colors.textSubtle
                    }
                    size={18}
                  />
                )}
              </View>
            </>
          )}
        </View>
      ))}
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
      borderTopColor:
        theme.colors.border,
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
      backgroundColor:
        theme.colors.input,
      borderColor:
        theme.colors.borderStrong,
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
      borderColor:
        theme.colors.borderStrong,
      borderRadius: 8,
      borderWidth: 2,
      height: 32,
      justifyContent: 'center',
      marginLeft: 5,
      width: 32,
    },
    checkboxCompleted: {
      backgroundColor:
        theme.colors.primary,
      borderColor: theme.colors.primary,
    },
  })
