import { Card } from '@/components/ui'
import { useAppTheme } from '@/theme/ThemeProvider'
import type { AppTheme } from '@/theme/types'
import { formatTimer } from '@/utils/workout-format'
import {
  RotateCcw,
  TimerReset,
} from 'lucide-react-native'
import { useMemo } from 'react'
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'

type RestTimerCardProps = {
  remainingSeconds: number
  onAddTime: (seconds: number) => void
  onReset: () => void
  onSkip: () => void
}

export function RestTimerCard({
  remainingSeconds,
  onAddTime,
  onReset,
  onSkip,
}: RestTimerCardProps) {
  const { theme } = useAppTheme()

  const styles = useMemo(
    () => createStyles(theme),
    [theme],
  )

  return (
    <Card style={styles.card}>
      <View style={styles.main}>
        <View style={styles.icon}>
          <TimerReset
            color={theme.colors.primary}
            size={21}
          />
        </View>

        <View>
          <Text style={styles.label}>
            REST TIMER
          </Text>

          <Text style={styles.value}>
            {formatTimer(remainingSeconds)}
          </Text>
        </View>
      </View>

      <View style={styles.actions}>
        <Pressable
          accessibilityLabel="Add 30 seconds"
          hitSlop={8}
          onPress={() => onAddTime(30)}
          style={({ pressed }) => [
            styles.action,
            pressed && styles.actionPressed,
          ]}
        >
          <Text style={styles.actionText}>
            +30
          </Text>
        </Pressable>

        <Pressable
          accessibilityLabel="Restart timer"
          hitSlop={8}
          onPress={onReset}
          style={({ pressed }) => [
            styles.action,
            pressed && styles.actionPressed,
          ]}
        >
          <RotateCcw
            color={theme.colors.textMuted}
            size={17}
          />
        </Pressable>

        <Pressable
          accessibilityLabel="Skip rest timer"
          hitSlop={8}
          onPress={onSkip}
          style={({ pressed }) => [
            styles.action,
            pressed && styles.actionPressed,
          ]}
        >
          <Text style={styles.actionText}>
            Skip
          </Text>
        </Pressable>
      </View>
    </Card>
  )
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    card: {
      alignItems: 'center',
      backgroundColor:
        theme.colors.primarySurface,
      borderColor: theme.colors.primary,
      borderRadius: 14,
      borderWidth: 1,
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 14,
      padding: 12,
    },
    main: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 10,
    },
    icon: {
      alignItems: 'center',
      backgroundColor:
        theme.colors.surfaceRaised,
      borderRadius: 10,
      height: 40,
      justifyContent: 'center',
      width: 40,
    },
    label: {
      color: theme.colors.primary,
      fontSize: 9,
      fontWeight: '900',
      letterSpacing: 1,
    },
    value: {
      color: theme.colors.text,
      fontSize: 20,
      fontVariant: ['tabular-nums'],
      fontWeight: '900',
      marginTop: 1,
    },
    actions: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 5,
    },
    action: {
      alignItems: 'center',
      backgroundColor:
        theme.colors.surfaceRaised,
      borderRadius: 8,
      justifyContent: 'center',
      minHeight: 34,
      minWidth: 40,
      paddingHorizontal: 8,
    },
    actionPressed: {
      opacity: 0.65,
    },
    actionText: {
      color: theme.colors.text,
      fontSize: 12,
      fontWeight: '800',
    },
  })
