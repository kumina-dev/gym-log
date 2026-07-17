import type {
  SQLiteDatabase,
} from 'expo-sqlite'

import type {
  TrackingType,
} from '@/types/active-workout'
import type {
  HistoryExercise,
} from '@/types/workout-history'
import {
  formatMinutesInput,
  parseOptionalDecimal,
  parseOptionalInteger,
} from '@/utils/workout-format'

type HistoryRow = {
  exerciseId: number
  exerciseName: string
  exercisePosition: number
  trackingType: string

  setId: number
  setNumber: number

  weight: number | null
  reps: number | null
  rir: number | null

  durationSeconds: number | null
  distance: number | null
  level: number | null

  completed: number
}

function normalizeTrackingType(
  value: string,
): TrackingType {
  return value === 'cardio'
    ? 'cardio'
    : 'strength'
}

export async function loadWorkoutHistory(
  db: SQLiteDatabase,
  sessionId: number,
) {
  const rows =
    await db.getAllAsync<HistoryRow>(
      `
        SELECT
          session_exercises.id
            AS exerciseId,
          session_exercises.name
            AS exerciseName,
          session_exercises.position
            AS exercisePosition,
          session_exercises.tracking_type
            AS trackingType,

          set_logs.id AS setId,
          set_logs.set_number AS setNumber,
          set_logs.weight,
          set_logs.reps,
          set_logs.rir,
          set_logs.duration_seconds
            AS durationSeconds,
          set_logs.distance,
          set_logs.level,
          set_logs.completed

        FROM session_exercises

        INNER JOIN set_logs
          ON set_logs.session_exercise_id =
            session_exercises.id

        WHERE
          session_exercises.session_id = ?

        ORDER BY
          session_exercises.position,
          session_exercises.id,
          set_logs.set_number
      `,
      sessionId,
    )

  const exercises: HistoryExercise[] = []

  for (const row of rows) {
    let exercise = exercises.find(
      (item) =>
        item.id === row.exerciseId,
    )

    if (!exercise) {
      exercise = {
        id: row.exerciseId,
        name: row.exerciseName,
        position:
          row.exercisePosition,
        trackingType:
          normalizeTrackingType(
            row.trackingType,
          ),
        sets: [],
      }

      exercises.push(exercise)
    }

    exercise.sets.push({
      id: row.setId,
      setNumber: row.setNumber,

      weight:
        row.weight?.toString() ?? '',

      reps:
        row.reps?.toString() ?? '',

      rir:
        row.rir?.toString() ?? '',

      durationMinutes:
        row.durationSeconds === null
          ? ''
          : formatMinutesInput(
              row.durationSeconds,
            ),

      distance:
        row.distance?.toString() ?? '',

      level:
        row.level?.toString() ?? '',

      completed:
        row.completed === 1,
    })
  }

  return exercises
}

export async function saveWorkoutHistory(
  db: SQLiteDatabase,
  exercises: HistoryExercise[],
) {
  await db.withTransactionAsync(
    async () => {
      for (const exercise of exercises) {
        for (const set of exercise.sets) {
          const weight =
            parseOptionalDecimal(
              set.weight,
            )

          const reps =
            parseOptionalInteger(
              set.reps,
            )

          const rir =
            parseOptionalInteger(
              set.rir,
            )

          const durationMinutes =
            parseOptionalDecimal(
              set.durationMinutes,
            )

          const distance =
            parseOptionalDecimal(
              set.distance,
            )

          const level =
            parseOptionalDecimal(
              set.level,
            )

          await db.runAsync(
            `
              UPDATE set_logs
              SET
                weight = ?,
                reps = ?,
                rir = ?,
                duration_seconds = ?,
                distance = ?,
                level = ?,
                completed = ?
              WHERE id = ?
            `,
            weight,

            reps !== null &&
              reps >= 0
              ? reps
              : null,

            rir !== null &&
              rir >= 0 &&
              rir <= 10
              ? rir
              : null,

            durationMinutes !== null &&
              durationMinutes >= 0
              ? Math.round(
                  durationMinutes * 60,
                )
              : null,

            distance !== null &&
              distance >= 0
              ? distance
              : null,

            level !== null &&
              level >= 0
              ? level
              : null,

            set.completed ? 1 : 0,
            set.id,
          )
        }
      }
    },
  )
}
