import { useAppTheme } from '@/theme/ThemeProvider'
import type { AppTheme } from '@/theme/types'
import { useMemo } from 'react'
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'

type WorkoutActionsProps = {
  isFinishing: boolean
  onFinish: () => void
  onDiscard: () => void
}

export function WorkoutActions({
  isFinishing,
  onFinish,
  onDiscard,
}: WorkoutActionsProps) {
  const { theme } = useAppTheme()

  const styles = useMemo(
    () => createStyles(theme),
    [theme],
  )

  return (
    <View>
      <Pressable
        accessibilityRole="button"
        disabled={isFinishing}
        onPress={onFinish}
        style={({ pressed }) => [
          styles.finishButton,
          pressed &&
            styles.finishButtonPressed,
          isFinishing &&
            styles.buttonDisabled,
        ]}
      >
        <Text style={styles.finishButtonText}>
          {isFinishing
            ? 'Finishing...'
            : 'Finish workout'}
        </Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        disabled={isFinishing}
        onPress={onDiscard}
        style={({ pressed }) => [
          styles.discardButton,
          pressed &&
            styles.discardButtonPressed,
          isFinishing &&
            styles.buttonDisabled,
        ]}
      >
        <Text style={styles.discardButtonText}>
          Discard workout
        </Text>
      </Pressable>
    </View>
  )
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    finishButton: {
      alignItems: 'center',
      backgroundColor:
        theme.colors.primary,
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
      borderColor:
        theme.colors.dangerBorder,
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
    buttonDisabled: {
      opacity: 0.55,
    },
  })
