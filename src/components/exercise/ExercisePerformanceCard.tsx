import {
  ProgressChart,
  type ProgressChartPoint,
} from '@/components/ProgressChart'
import {
  AppText,
  Card,
  SegmentedControl,
} from '@/components/ui'
import { useAppTheme } from '@/theme/ThemeProvider'
import type {
  AppTheme,
} from '@/theme/types'
import type {
  TrackingType,
} from '@/types/active-workout'
import {
  useFocusEffect,
} from 'expo-router'
import {
  useSQLiteContext,
} from 'expo-sqlite'
import {
  TrendingUp,
} from 'lucide-react-native'
import {
  useCallback,
  useMemo,
  useState,
} from 'react'
import {
  ActivityIndicator,
  StyleSheet,
  View,
} from 'react-native'

type CardioMetric =
  | 'duration'
  | 'distance'
  | 'level'

type PerformanceSetRow = {
  sessionId: number
  completedAt: string
  weight: number | null
  reps: number | null
  rir: number | null
  durationSeconds: number | null
  distance: number | null
  level: number | null
}

type PerformanceSession = {
  sessionId: number
  completedAt: string
  completedSets: number

  bestWeight: number | null
  bestReps: number | null
  totalVolume: number
  averageRir: number | null

  totalDurationSeconds: number | null
  totalDistance: number | null
  highestLevel: number | null
}

type CardioMetricOption = {
  label: string
  value: CardioMetric
}

type ExercisePerformanceCardProps = {
  exerciseId: number
  trackingType: TrackingType
}

function parseDatabaseDate(
  value: string,
) {
  return new Date(
    `${value.replace(' ', 'T')}Z`,
  )
}

function formatPerformanceDate(
  value: string,
) {
  return parseDatabaseDate(
    value,
  ).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatChartDate(
  value: string,
) {
  const date =
    parseDatabaseDate(value)

  return `${date.getDate()}.${
    date.getMonth() + 1
  }.`
}

function formatNumber(
  value: number,
) {
  return Number(
    value.toFixed(2),
  ).toString()
}

export function ExercisePerformanceCard({
  exerciseId,
  trackingType,
}: ExercisePerformanceCardProps) {
  const db = useSQLiteContext()
  const { theme } = useAppTheme()

  const styles = useMemo(
    () => createStyles(theme),
    [theme],
  )

  const [
    performance,
    setPerformance,
  ] = useState<PerformanceSession[]>([])

  const [
    cardioMetric,
    setCardioMetric,
  ] = useState<CardioMetric>('distance')

  const [isLoading, setIsLoading] =
    useState(true)

  const loadPerformance =
    useCallback(async () => {
      setIsLoading(true)

      try {
        const rows =
          await db.getAllAsync<PerformanceSetRow>(
            `
              SELECT
                workout_sessions.id
                  AS sessionId,

                workout_sessions.completed_at
                  AS completedAt,

                set_logs.weight,
                set_logs.reps,
                set_logs.rir,

                set_logs.duration_seconds
                  AS durationSeconds,

                set_logs.distance,
                set_logs.level

              FROM session_exercises

              INNER JOIN workout_sessions
                ON workout_sessions.id =
                  session_exercises.session_id

              INNER JOIN set_logs
                ON set_logs.session_exercise_id =
                  session_exercises.id

              WHERE
                session_exercises.source_exercise_id = ?
                AND session_exercises.tracking_type = ?
                AND workout_sessions.completed_at
                  IS NOT NULL
                AND set_logs.completed = 1

              ORDER BY
                workout_sessions.completed_at DESC,
                set_logs.set_number
            `,
            exerciseId,
            trackingType,
          )

        const sessions:
          PerformanceSession[] = []

        const sessionRirs =
          new Map<number, number[]>()

        for (const row of rows) {
          let session = sessions.find(
            (item) =>
              item.sessionId ===
              row.sessionId,
          )

          if (!session) {
            session = {
              sessionId:
                row.sessionId,
              completedAt:
                row.completedAt,
              completedSets: 0,

              bestWeight: null,
              bestReps: null,
              totalVolume: 0,
              averageRir: null,

              totalDurationSeconds:
                null,
              totalDistance: null,
              highestLevel: null,
            }

            sessions.push(session)
          }

          session.completedSets += 1

          if (
            row.weight !== null ||
            row.reps !== null
          ) {
            session.totalVolume +=
              (row.weight ?? 0) *
              (row.reps ?? 0)

            const currentWeight =
              row.weight ?? 0

            const bestWeight =
              session.bestWeight ?? 0

            const currentReps =
              row.reps ?? 0

            const bestReps =
              session.bestReps ?? 0

            if (
              session.bestReps === null ||
              currentWeight >
                bestWeight ||
              (
                currentWeight ===
                  bestWeight &&
                currentReps > bestReps
              )
            ) {
              session.bestWeight =
                row.weight

              session.bestReps =
                row.reps
            }
          }

          if (
            row.durationSeconds !== null
          ) {
            session.totalDurationSeconds =
              (
                session
                  .totalDurationSeconds ??
                0
              ) + row.durationSeconds
          }

          if (row.distance !== null) {
            session.totalDistance =
              (
                session.totalDistance ??
                0
              ) + row.distance
          }

          if (row.level !== null) {
            session.highestLevel =
              Math.max(
                session.highestLevel ??
                  row.level,
                row.level,
              )
          }

          if (row.rir !== null) {
            const values =
              sessionRirs.get(
                row.sessionId,
              ) ?? []

            values.push(row.rir)

            sessionRirs.set(
              row.sessionId,
              values,
            )
          }
        }

        for (const session of sessions) {
          const values =
            sessionRirs.get(
              session.sessionId,
            )

          if (
            values &&
            values.length > 0
          ) {
            session.averageRir =
              values.reduce(
                (total, value) =>
                  total + value,
                0,
              ) / values.length
          }
        }

        setPerformance(
          sessions.slice(0, 5),
        )
      } finally {
        setIsLoading(false)
      }
    }, [
      db,
      exerciseId,
      trackingType,
    ])

  useFocusEffect(
    useCallback(() => {
      void loadPerformance()
    }, [loadPerformance]),
  )

  const availableCardioMetrics =
    useMemo(() => {
      const options:
        CardioMetricOption[] = []

      if (
        performance.some(
          (session) =>
            session.totalDurationSeconds !==
            null,
        )
      ) {
        options.push({
          label: 'Duration',
          value: 'duration',
        })
      }

      if (
        performance.some(
          (session) =>
            session.totalDistance !== null,
        )
      ) {
        options.push({
          label: 'Distance',
          value: 'distance',
        })
      }

      if (
        performance.some(
          (session) =>
            session.highestLevel !== null,
        )
      ) {
        options.push({
          label: 'Level',
          value: 'level',
        })
      }

      return options
    }, [performance])

  const selectedCardioMetric =
    availableCardioMetrics.some(
      (option) =>
        option.value === cardioMetric,
    )
      ? cardioMetric
      : (
          availableCardioMetrics[0]
            ?.value ?? 'duration'
        )

  const chronologicalPerformance =
    [...performance].reverse()

  const strengthWeightProgress:
    ProgressChartPoint[] =
    chronologicalPerformance
      .filter(
        (
          session,
        ): session is
          PerformanceSession & {
            bestWeight: number
          } =>
          session.bestWeight !== null,
      )
      .map((session) => ({
        label: formatChartDate(
          session.completedAt,
        ),
        value: session.bestWeight,
      }))

  const strengthRepetitionProgress:
    ProgressChartPoint[] =
    chronologicalPerformance
      .filter(
        (
          session,
        ): session is
          PerformanceSession & {
            bestReps: number
          } =>
          session.bestReps !== null,
      )
      .map((session) => ({
        label: formatChartDate(
          session.completedAt,
        ),
        value: session.bestReps,
      }))

  const strengthChartData =
    strengthWeightProgress.length >= 2
      ? strengthWeightProgress
      : strengthRepetitionProgress

  const strengthChartSuffix =
    strengthWeightProgress.length >= 2
      ? 'kg'
      : 'reps'

  const cardioChartData =
    chronologicalPerformance
      .map((session) => {
        let value: number | null = null

        if (
          selectedCardioMetric ===
          'duration'
        ) {
          value =
            session
              .totalDurationSeconds ===
            null
              ? null
              : session
                  .totalDurationSeconds /
                60
        }

        if (
          selectedCardioMetric ===
          'distance'
        ) {
          value =
            session.totalDistance
        }

        if (
          selectedCardioMetric ===
          'level'
        ) {
          value =
            session.highestLevel
        }

        return {
          label: formatChartDate(
            session.completedAt,
          ),
          value,
        }
      })
      .filter(
        (
          point,
        ): point is {
          label: string
          value: number
        } => point.value !== null,
      )

  const cardioChartSuffix =
    selectedCardioMetric === 'duration'
      ? 'min'
      : selectedCardioMetric ===
          'distance'
        ? 'km'
        : 'level'

  const chartData =
    trackingType === 'cardio'
      ? cardioChartData
      : strengthChartData

  const chartSuffix =
    trackingType === 'cardio'
      ? cardioChartSuffix
      : strengthChartSuffix

  return (
    <Card style={styles.card}>
      <View style={styles.heading}>
        <View style={styles.headingIcon}>
          <TrendingUp
            color={theme.colors.primary}
            size={20}
          />
        </View>

        <View>
          <AppText variant="heading">
            Recent performance
          </AppText>

          <AppText
            tone="subtle"
            variant="caption"
          >
            Last five completed workouts
          </AppText>
        </View>
      </View>

      {trackingType === 'cardio' &&
        availableCardioMetrics.length >
          1 && (
          <View style={styles.metricPicker}>
            <SegmentedControl
              value={
                selectedCardioMetric
              }
              options={
                availableCardioMetrics
              }
              onChange={setCardioMetric}
            />
          </View>
        )}

      {chartData.length >= 2 && (
        <View style={styles.chartContainer}>
          <ProgressChart
            data={chartData}
            suffix={chartSuffix}
          />
        </View>
      )}

      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator
            color={theme.colors.primary}
          />
        </View>
      ) : performance.length === 0 ? (
        <View style={styles.empty}>
          <AppText variant="label">
            No completed sets yet
          </AppText>

          <AppText
            tone="subtle"
            variant="caption"
            style={styles.emptyText}
          >
            Performance appears after
            completing this exercise.
          </AppText>
        </View>
      ) : (
        performance.map(
          (session, index) => (
            <View
              key={session.sessionId}
              style={[
                styles.row,
                index ===
                  performance.length - 1 &&
                  styles.rowLast,
              ]}
            >
              <View style={styles.rowMain}>
                <AppText variant="label">
                  {formatPerformanceDate(
                    session.completedAt,
                  )}
                </AppText>

                <AppText
                  tone="subtle"
                  variant="caption"
                >
                  {session.completedSets}{' '}
                  {session.completedSets === 1
                    ? 'set'
                    : 'sets'}
                  {trackingType ===
                    'strength' &&
                    ` · ${Math.round(
                      session.totalVolume,
                    )} kg volume`}
                </AppText>
              </View>

              {trackingType ===
              'strength' ? (
                <View
                  style={styles.rowResult}
                >
                  <AppText
                    tone="primary"
                    variant="caption"
                    style={styles.resultLabel}
                  >
                    BEST
                  </AppText>

                  <AppText
                    tone="primary"
                    variant="label"
                  >
                    {session.bestWeight !==
                    null
                      ? `${session.bestWeight} kg`
                      : 'BW'}

                    {session.bestReps !==
                    null
                      ? ` × ${session.bestReps}`
                      : ''}
                  </AppText>

                  {session.averageRir !==
                    null && (
                    <AppText
                      tone="subtle"
                      variant="caption"
                    >
                      Avg. RIR{' '}
                      {session.averageRir.toFixed(
                        1,
                      )}
                    </AppText>
                  )}
                </View>
              ) : (
                <View
                  style={styles.rowResult}
                >
                  {session
                    .totalDurationSeconds !==
                    null && (
                    <AppText
                      tone="primary"
                      variant="label"
                    >
                      {formatNumber(
                        session
                          .totalDurationSeconds /
                          60,
                      )}{' '}
                      min
                    </AppText>
                  )}

                  {session.totalDistance !==
                    null && (
                    <AppText
                      tone="primary"
                      variant="caption"
                    >
                      {formatNumber(
                        session.totalDistance,
                      )}{' '}
                      km
                    </AppText>
                  )}

                  {session.highestLevel !==
                    null && (
                    <AppText
                      tone="subtle"
                      variant="caption"
                    >
                      Level{' '}
                      {formatNumber(
                        session.highestLevel,
                      )}
                    </AppText>
                  )}
                </View>
              )}
            </View>
          ),
        )
      )}
    </Card>
  )
}

function createStyles(
  theme: AppTheme,
) {
  return StyleSheet.create({
    card: {
      overflow: 'hidden',
    },
    heading: {
      alignItems: 'center',
      borderBottomColor:
        theme.colors.border,
      borderBottomWidth: 1,
      flexDirection: 'row',
      gap: theme.spacing.md,
      padding: theme.spacing.lg,
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
    metricPicker: {
      borderBottomColor:
        theme.colors.border,
      borderBottomWidth: 1,
      padding: theme.spacing.md,
    },
    chartContainer: {
      borderBottomColor:
        theme.colors.border,
      borderBottomWidth: 1,
      paddingHorizontal: 4,
      paddingTop: 4,
    },
    loading: {
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 100,
      padding: theme.spacing.xl,
    },
    empty: {
      padding: theme.spacing.xl,
    },
    emptyText: {
      marginTop: theme.spacing.xs,
    },
    row: {
      alignItems: 'center',
      borderBottomColor:
        theme.colors.border,
      borderBottomWidth: 1,
      flexDirection: 'row',
      justifyContent: 'space-between',
      padding: theme.spacing.lg,
    },
    rowLast: {
      borderBottomWidth: 0,
    },
    rowMain: {
      flex: 1,
      gap: 3,
      paddingRight: theme.spacing.md,
    },
    rowResult: {
      alignItems: 'flex-end',
      gap: 2,
    },
    resultLabel: {
      fontSize: 9,
      fontWeight: '900',
      letterSpacing: 0.8,
    },
  })
}
