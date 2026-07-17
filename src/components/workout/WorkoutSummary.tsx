import { useAppTheme } from '@/theme/ThemeProvider'
import type { AppTheme } from '@/theme/types'
import { formatElapsedTime } from '@/utils/workout-format'
import { Clock3 } from 'lucide-react-native'
import { useMemo } from 'react'
import {
  StyleSheet,
  Text,
  View,
} from 'react-native'

type WorkoutSummaryProps = {
  workoutName: string
  elapsedSeconds: number
  completedSets: number
  totalSets: number
}

export function WorkoutSummary({
  workoutName,
  elapsedSeconds,
  completedSets,
  totalSets,
}: WorkoutSummaryProps) {
  const { theme } = useAppTheme()

  const styles = useMemo(
    () => createStyles(theme),
    [theme],
  )

  return (
    <View style={styles.container}>
      <View style={styles.nameContainer}>
        <Text style={styles.eyebrow}>
          ACTIVE WORKOUT
        </Text>

        <Text
          numberOfLines={2}
          style={styles.title}
        >
          {workoutName}
        </Text>
      </View>

      <View style={styles.stats}>
        <View style={styles.duration}>
          <Clock3
            color={theme.colors.textSubtle}
            size={15}
          />

          <Text style={styles.durationText}>
            {formatElapsedTime(
              elapsedSeconds,
            )}
          </Text>
        </View>

        <Text style={styles.progress}>
          {completedSets}/{totalSets}
        </Text>
      </View>
    </View>
  )
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingBottom: 20,
      paddingTop: 20,
    },
    nameContainer: {
      flex: 1,
      marginRight: 16,
      minWidth: 0,
    },
    eyebrow: {
      color: theme.colors.primary,
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 1.4,
    },
    title: {
      color: theme.colors.text,
      fontSize: 28,
      fontWeight: '800',
      marginTop: 4,
    },
    stats: {
      alignItems: 'flex-end',
      gap: 7,
    },
    duration: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 5,
    },
    durationText: {
      color: theme.colors.textMuted,
      fontSize: 13,
      fontVariant: ['tabular-nums'],
      fontWeight: '700',
    },
    progress: {
      color: theme.colors.primary,
      fontSize: 18,
      fontWeight: '800',
    },
  })
