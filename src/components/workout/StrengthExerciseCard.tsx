import { Card } from '@/components/ui'
import { useAppTheme } from '@/theme/ThemeProvider'
import type { AppTheme } from '@/theme/types'
import type {
  WorkoutExercise,
  WorkoutSet,
} from '@/types/active-workout'
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

type StrengthExerciseCardProps = {
  exercise: WorkoutExercise
  onUpdateSet: (
    exerciseId: number,
    setId: number,
    changes: Partial<WorkoutSet>,
  ) => void
  onSaveSet: (set: WorkoutSet) => Promise<void>
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

export function StrengthExerciseCard({
  exercise,
  onUpdateSet,
  onSaveSet,
  onApplyPreviousSet,
  onToggleSet,
  onAddSet,
  onRemoveLastSet,
}: StrengthExerciseCardProps) {
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

      <View style={styles.columnHeader}>
        <Text style={styles.setColumn}>
          SET
        </Text>

        <Text style={styles.previousColumn}>
          PREVIOUS
        </Text>

        <Text style={styles.inputColumn}>
          KG
        </Text>

        <Text style={styles.inputColumn}>
          REPS
        </Text>

        <Text style={styles.rirColumn}>
          RIR
        </Text>

        <Text style={styles.doneColumn}>
          DONE
        </Text>
      </View>

      {exercise.sets.map((set) => {
        const hasPrevious =
          set.previousWeight !== null ||
          set.previousReps !== null

        return (
          <View
            key={set.id}
            style={styles.setRow}
          >
            <Text style={styles.setNumber}>
              {set.setNumber}
            </Text>

            <Pressable
              accessibilityLabel={
                hasPrevious
                  ? `Copy previous result for set ${set.setNumber}`
                  : `No previous result for set ${set.setNumber}`
              }
              disabled={!hasPrevious}
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
                  styles.previousValue,
                  !hasPrevious &&
                    styles.previousValueEmpty,
                ]}
              >
                {hasPrevious
                  ? `${set.previousWeight ?? '—'}×${set.previousReps ?? '—'}`
                  : '—'}
              </Text>
            </Pressable>

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
              onBlur={() =>
                void onSaveSet(set)
              }
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={
                theme.colors.textSubtle
              }
              selectTextOnFocus
              style={styles.setInput}
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
              onBlur={() =>
                void onSaveSet(set)
              }
              keyboardType="number-pad"
              placeholder="0"
              placeholderTextColor={
                theme.colors.textSubtle
              }
              selectTextOnFocus
              style={styles.setInput}
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
              onBlur={() =>
                void onSaveSet(set)
              }
              keyboardType="number-pad"
              maxLength={2}
              placeholder="—"
              placeholderTextColor={
                theme.colors.textSubtle
              }
              selectTextOnFocus
              style={[
                styles.setInput,
                styles.rirInput,
              ]}
            />

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
        )
      })}

      <View style={styles.setActions}>
        <Pressable
          accessibilityLabel="Remove last set"
          disabled={exercise.sets.length <= 1}
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
    rirInput: {
      flex: 0,
      width: 44,
    },
    checkbox: {
      alignItems: 'center',
      borderColor:
        theme.colors.borderStrong,
      borderRadius: 8,
      borderWidth: 2,
      height: 34,
      justifyContent: 'center',
      marginLeft: 5,
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
