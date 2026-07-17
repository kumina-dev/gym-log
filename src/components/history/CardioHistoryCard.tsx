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

type CardioHistoryCardProps = {
  exercise: HistoryExercise
  isEditing: boolean
  onUpdateSet: (
    exerciseId: number,
    setId: number,
    changes: Partial<HistorySet>,
  ) => void
}

export function CardioHistoryCard({
  exercise,
  isEditing,
  onUpdateSet,
}: CardioHistoryCardProps) {
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

      <Text style={styles.trackingLabel}>
        CARDIO
      </Text>

      {exercise.sets.map((set) => (
        <View
          key={set.id}
          style={[
            styles.setContainer,
            !set.completed &&
              !isEditing &&
              styles.incompleteSet,
          ]}
        >
          <View style={styles.setHeader}>
            <Text style={styles.setTitle}>
              Set {set.setNumber}
            </Text>

            {isEditing ? (
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
            ) : set.completed ? (
              <Check
                color={theme.colors.primary}
                size={19}
                strokeWidth={3}
              />
            ) : (
              <Minus
                color={
                  theme.colors.textSubtle
                }
                size={19}
              />
            )}
          </View>

          <View style={styles.fields}>
            <View style={styles.halfField}>
              <Text style={styles.fieldLabel}>
                MINUTES
              </Text>

              {isEditing ? (
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
                  keyboardType="decimal-pad"
                  placeholder="—"
                  placeholderTextColor={
                    theme.colors.textSubtle
                  }
                  selectTextOnFocus
                  style={styles.input}
                />
              ) : (
                <Text style={styles.value}>
                  {set.durationMinutes || '—'}
                </Text>
              )}
            </View>

            <View style={styles.halfField}>
              <Text style={styles.fieldLabel}>
                DISTANCE (KM)
              </Text>

              {isEditing ? (
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
                  keyboardType="decimal-pad"
                  placeholder="—"
                  placeholderTextColor={
                    theme.colors.textSubtle
                  }
                  selectTextOnFocus
                  style={styles.input}
                />
              ) : (
                <Text style={styles.value}>
                  {set.distance || '—'}
                </Text>
              )}
            </View>

            <View style={styles.fullField}>
              <Text style={styles.fieldLabel}>
                LEVEL / RESISTANCE
              </Text>

              {isEditing ? (
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
                  keyboardType="decimal-pad"
                  placeholder="—"
                  placeholderTextColor={
                    theme.colors.textSubtle
                  }
                  selectTextOnFocus
                  style={styles.input}
                />
              ) : (
                <Text style={styles.value}>
                  {set.level || '—'}
                </Text>
              )}
            </View>
          </View>
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
    },
    trackingLabel: {
      color: theme.colors.primary,
      fontSize: 10,
      fontWeight: '900',
      letterSpacing: 1.1,
      marginTop: 5,
    },
    setContainer: {
      borderTopColor:
        theme.colors.border,
      borderTopWidth: 1,
      marginTop: 14,
      paddingTop: 14,
    },
    incompleteSet: {
      opacity: 0.4,
    },
    setHeader: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    setTitle: {
      color: theme.colors.text,
      fontSize: 14,
      fontWeight: '800',
    },
    checkbox: {
      alignItems: 'center',
      borderColor:
        theme.colors.borderStrong,
      borderRadius: 8,
      borderWidth: 2,
      height: 32,
      justifyContent: 'center',
      width: 32,
    },
    checkboxCompleted: {
      backgroundColor:
        theme.colors.primary,
      borderColor: theme.colors.primary,
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
    value: {
      backgroundColor:
        theme.colors.surfaceRaised,
      borderColor: theme.colors.border,
      borderRadius: 8,
      borderWidth: 1,
      color: theme.colors.text,
      fontSize: 14,
      fontWeight: '700',
      minHeight: 42,
      paddingHorizontal: 8,
      paddingVertical: 11,
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
      fontSize: 14,
      paddingHorizontal: 8,
      paddingVertical: 10,
      textAlign: 'center',
    },
  })
