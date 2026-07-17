import {
  router,
  useFocusEffect,
} from 'expo-router'
import { useSQLiteContext } from 'expo-sqlite'
import {
  CalendarDays,
  ChevronRight,
  Clock3,
  Dumbbell,
  Weight,
} from 'lucide-react-native'
import {
  ReactNode,
  useCallback,
  useMemo,
  useState,
} from 'react'
import {
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from 'react-native'

import {
  AppText,
  Card,
  Screen,
} from '@/components/ui'
import {
  useAppTheme,
} from '@/theme/ThemeProvider'
import type {
  AppTheme,
} from '@/theme/types'

type HistoryItem = {
  id: number
  workoutName: string
  startedAt: string
  completedAt: string
  completedSets: number
  totalSets: number
  totalVolume: number
}

function parseDatabaseDate(value: string) {
  return new Date(
    `${value.replace(' ', 'T')}Z`,
  )
}

function formatDate(value: string) {
  const date = parseDatabaseDate(value)

  return `${date.toLocaleDateString()} · ${date.toLocaleTimeString(
    [],
    {
      hour: '2-digit',
      minute: '2-digit',
    },
  )}`
}

function formatDuration(
  startedAt: string,
  completedAt: string,
) {
  const start =
    parseDatabaseDate(startedAt).getTime()

  const end =
    parseDatabaseDate(completedAt).getTime()

  if (
    !Number.isFinite(start) ||
    !Number.isFinite(end)
  ) {
    return '—'
  }

  const totalMinutes = Math.max(
    0,
    Math.round((end - start) / 60000),
  )

  const hours = Math.floor(
    totalMinutes / 60,
  )

  const minutes = totalMinutes % 60

  return hours > 0
    ? `${hours}h ${minutes}m`
    : `${minutes} min`
}

export default function HistoryScreen() {
  const db = useSQLiteContext()
  const { theme } = useAppTheme()

  const styles = useMemo(
    () => createStyles(theme),
    [theme],
  )

  const [history, setHistory] =
    useState<HistoryItem[]>([])

  const loadHistory = useCallback(async () => {
    const rows =
      await db.getAllAsync<HistoryItem>(`
        SELECT
          workout_sessions.id,
          workout_sessions.workout_day_name
            AS workoutName,
          workout_sessions.started_at
            AS startedAt,
          workout_sessions.completed_at
            AS completedAt,
          SUM(
            CASE
              WHEN set_logs.completed = 1
                THEN 1
              ELSE 0
            END
          ) AS completedSets,
          COUNT(set_logs.id) AS totalSets,
          COALESCE(
            SUM(
              CASE
                WHEN set_logs.completed = 1
                  THEN
                    COALESCE(
                      set_logs.weight,
                      0
                    ) *
                    COALESCE(
                      set_logs.reps,
                      0
                    )
                ELSE 0
              END
            ),
            0
          ) AS totalVolume
        FROM workout_sessions
        LEFT JOIN session_exercises
          ON session_exercises.session_id =
            workout_sessions.id
        LEFT JOIN set_logs
          ON set_logs.session_exercise_id =
            session_exercises.id
        WHERE
          workout_sessions.completed_at
            IS NOT NULL
        GROUP BY workout_sessions.id
        ORDER BY
          workout_sessions.completed_at DESC
      `)

    setHistory(rows)
  }, [db])

  useFocusEffect(
    useCallback(() => {
      void loadHistory()
    }, [loadHistory]),
  )

  function formatWorkoutDuration(
    startedAt: string,
    completedAt: string,
  ) {
    const start = Date.parse(
      `${startedAt.replace(' ', 'T')}Z`,
    )

    const end = Date.parse(
      `${completedAt.replace(' ', 'T')}Z`,
    )

    if (!Number.isFinite(start) || !Number.isFinite(end)) {
      return '—'
    }

    const totalMinutes = Math.max(
      0,
      Math.round((end - start) / 60000),
    )

    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60

    return hours > 0
      ? `${hours}h ${minutes}m`
      : `${minutes} min`
  }

  return (
    <Screen edges={['top']}>
      <FlatList
        data={history}
        keyExtractor={(item) =>
          item.id.toString()
        }
        contentContainerStyle={[
          styles.list,
          history.length === 0 &&
            styles.emptyList,
        ]}
        ListHeaderComponent={
          <View style={styles.heading}>
            <AppText
              tone="primary"
              variant="caption"
              style={styles.eyebrow}
            >
              PROGRESS
            </AppText>

            <AppText variant="display">
              Workout history
            </AppText>

            <AppText
              tone="muted"
              style={styles.description}
            >
              Every completed workout and
              recorded set.
            </AppText>
          </View>
        }
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <Pressable
              onPress={() =>
                router.push({
                  pathname: '/history/[id]',
                  params: {
                    id: item.id.toString(),
                    name: item.workoutName,
                  },
                })
              }
              style={({ pressed }) => [
                styles.cardMain,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.cardIcon}>
                <Dumbbell
                  color={
                    theme.colors.primary
                  }
                  size={21}
                />
              </View>

              <View style={styles.cardContent}>
                <AppText variant="heading">
                  {item.workoutName}
                </AppText>

                <View style={styles.dateRow}>
                  <CalendarDays
                    color={
                      theme.colors.textSubtle
                    }
                    size={13}
                  />

                  <AppText
                    tone="subtle"
                    variant="caption"
                  >
                    {formatDate(
                      item.completedAt,
                    )}
                  </AppText>
                </View>

                <View style={styles.stats}>
                  <HistoryStat
                    icon={
                      <Dumbbell
                        color={
                          theme.colors.textSubtle
                        }
                        size={13}
                      />
                    }
                    text={`${item.completedSets}/${item.totalSets} sets`}
                  />

                  <HistoryStat
                    icon={
                      <Weight
                        color={
                          theme.colors.textSubtle
                        }
                        size={13}
                      />
                    }
                    text={`${Math.round(
                      item.totalVolume,
                    )} kg`}
                  />

                  <HistoryStat
                    icon={
                      <Clock3
                        color={
                          theme.colors.textSubtle
                        }
                        size={13}
                      />
                    }
                    text={formatDuration(
                      item.startedAt,
                      item.completedAt,
                    )}
                  />
                </View>
              </View>

              <ChevronRight
                color={
                  theme.colors.textSubtle
                }
                size={21}
              />
            </Pressable>
          </Card>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Dumbbell
                color={
                  theme.colors.textSubtle
                }
                size={36}
              />
            </View>

            <AppText variant="heading">
              No completed workouts
            </AppText>

            <AppText
              tone="subtle"
              variant="caption"
              style={styles.emptyText}
            >
              Finished workouts will appear
              here.
            </AppText>
          </View>
        }
      />
    </Screen>
  )
}

type HistoryStatProps = {
  icon: ReactNode
  text: string
}

function HistoryStat({
  icon,
  text,
}: HistoryStatProps) {
  return (
    <View
      style={{
        alignItems: 'center',
        flexDirection: 'row',
        gap: 5,
      }}
    >
      {icon}

      <AppText
        tone="muted"
        variant="caption"
      >
        {text}
      </AppText>
    </View>
  )
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    list: {
      gap: theme.spacing.md,
      padding: theme.spacing.xl,
      paddingBottom: theme.spacing.xxl,
    },
    emptyList: {
      flexGrow: 1,
    },
    heading: {
      paddingBottom: theme.spacing.lg,
    },
    eyebrow: {
      fontWeight: '900',
      letterSpacing: 1.4,
    },
    description: {
      marginTop: theme.spacing.sm,
    },
    card: {
      overflow: 'hidden',
    },
    cardMain: {
      alignItems: 'center',
      flexDirection: 'row',
      padding: theme.spacing.lg,
    },
    cardIcon: {
      alignItems: 'center',
      backgroundColor:
        theme.colors.primarySurface,
      borderRadius: theme.radius.md,
      height: 44,
      justifyContent: 'center',
      width: 44,
    },
    cardContent: {
      flex: 1,
      marginLeft: theme.spacing.md,
    },
    dateRow: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 5,
      marginTop: 4,
    },
    stats: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.md,
      marginTop: theme.spacing.sm,
    },
    emptyState: {
      alignItems: 'center',
      flex: 1,
      justifyContent: 'center',
      paddingBottom: 80,
    },
    emptyIcon: {
      alignItems: 'center',
      backgroundColor:
        theme.colors.surfaceRaised,
      borderRadius: theme.radius.round,
      height: 68,
      justifyContent: 'center',
      marginBottom: theme.spacing.lg,
      width: 68,
    },
    emptyText: {
      marginTop: theme.spacing.xs,
    },
    pressed: {
      opacity: 0.65,
    },
  })
}
