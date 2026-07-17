import type {
  SQLiteDatabase,
} from 'expo-sqlite'

import type {
  TrackingType,
  WorkoutExercise,
  WorkoutSet,
} from '@/types/active-workout'
import {
  formatMinutesInput,
  parseOptionalDecimal,
  parseOptionalInteger,
} from '@/utils/workout-format'

type WorkoutRow = {
  exerciseId: number
  exerciseName: string
  exercisePosition: number
  trackingType: string
  targetDurationSeconds: number | null
  targetDistance: number | null
  targetLevel: number | null

  setId: number
  setNumber: number

  previousWeight: number | null
  weight: number | null
  previousReps: number | null
  reps: number | null
  rir: number | null

  previousDurationSeconds: number | null
  durationSeconds: number | null
  previousDistance: number | null
  distance: number | null
  previousLevel: number | null
  level: number | null

  completed: number
}

type SessionMetadataRow = {
  startedAt: string
}

function normalizeTrackingType(
  value: string,
): TrackingType {
  return value === 'cardio'
    ? 'cardio'
    : 'strength'
}

export async function loadActiveWorkout(
  db: SQLiteDatabase,
  sessionId: number,
) {
  const rows =
    await db.getAllAsync<WorkoutRow>(
      `
        SELECT
          current_exercise.id AS exerciseId,
          current_exercise.name AS exerciseName,
          current_exercise.position AS exercisePosition,
          current_exercise.tracking_type AS trackingType,
          current_exercise.target_duration_seconds
            AS targetDurationSeconds,
          current_exercise.target_distance
            AS targetDistance,
          current_exercise.target_level
            AS targetLevel,

          current_set.id AS setId,
          current_set.set_number AS setNumber,
          current_set.weight,
          current_set.reps,
          current_set.rir,
          current_set.duration_seconds
            AS durationSeconds,
          current_set.distance,
          current_set.level,
          current_set.completed,

          previous_set.weight
            AS previousWeight,
          previous_set.reps
            AS previousReps,
          previous_set.duration_seconds
            AS previousDurationSeconds,
          previous_set.distance
            AS previousDistance,
          previous_set.level
            AS previousLevel

        FROM session_exercises
          AS current_exercise

        INNER JOIN set_logs AS current_set
          ON current_set.session_exercise_id =
            current_exercise.id

        LEFT JOIN session_exercises
          AS previous_exercise
          ON previous_exercise.id = (
            SELECT candidate_exercise.id

            FROM session_exercises
              AS candidate_exercise

            INNER JOIN workout_sessions
              AS candidate_session
              ON candidate_session.id =
                candidate_exercise.session_id

            WHERE
              candidate_exercise.source_exercise_id =
                current_exercise.source_exercise_id
              AND candidate_session.completed_at
                IS NOT NULL
              AND candidate_session.id <>
                current_exercise.session_id

            ORDER BY
              candidate_session.completed_at DESC

            LIMIT 1
          )

        LEFT JOIN set_logs AS previous_set
          ON previous_set.session_exercise_id =
            previous_exercise.id
          AND previous_set.set_number =
            current_set.set_number
          AND previous_set.completed = 1

        WHERE current_exercise.session_id = ?

        ORDER BY
          current_exercise.position,
          current_exercise.id,
          current_set.set_number
      `,
      sessionId,
    )

  const exercises: WorkoutExercise[] = []

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
        targetDurationSeconds:
          row.targetDurationSeconds,
        targetDistance:
          row.targetDistance,
        targetLevel:
          row.targetLevel,
        sets: [],
      }

      exercises.push(exercise)
    }

    exercise.sets.push({
      id: row.setId,
      setNumber: row.setNumber,

      previousWeight:
        row.previousWeight,
      weight:
        row.weight?.toString() ?? '',

      previousReps:
        row.previousReps,
      reps:
        row.reps?.toString() ?? '',

      rir:
        row.rir?.toString() ?? '',

      previousDurationSeconds:
        row.previousDurationSeconds,

      durationMinutes:
        row.durationSeconds === null
          ? ''
          : formatMinutesInput(
              row.durationSeconds,
            ),

      previousDistance:
        row.previousDistance,

      distance:
        row.distance?.toString() ?? '',

      previousLevel:
        row.previousLevel,

      level:
        row.level?.toString() ?? '',

      completed:
        row.completed === 1,
    })
  }

  return exercises
}

export async function getWorkoutStartedAt(
  db: SQLiteDatabase,
  sessionId: number,
) {
  const session =
    await db.getFirstAsync<SessionMetadataRow>(
      `
        SELECT
          started_at AS startedAt
        FROM workout_sessions
        WHERE id = ?
      `,
      sessionId,
    )

  if (!session) {
    return null
  }

  const timestamp = Date.parse(
    `${session.startedAt.replace(
      ' ',
      'T',
    )}Z`,
  )

  return Number.isFinite(timestamp)
    ? timestamp
    : null
}

export async function addWorkoutSet(
  db: SQLiteDatabase,
  exercise: WorkoutExercise,
) {
  const nextSetNumber =
    Math.max(
      0,
      ...exercise.sets.map(
        (set) => set.setNumber,
      ),
    ) + 1

  await db.runAsync(
    `
      INSERT INTO set_logs (
        session_exercise_id,
        set_number
      )
      VALUES (?, ?)
    `,
    exercise.id,
    nextSetNumber,
  )
}

export async function removeLastWorkoutSet(
  db: SQLiteDatabase,
  exercise: WorkoutExercise,
) {
  if (exercise.sets.length <= 1) {
    return
  }

  const lastSet = exercise.sets.reduce(
    (latest, set) =>
      set.setNumber > latest.setNumber
        ? set
        : latest,
  )

  await db.runAsync(
    `
      DELETE FROM set_logs
      WHERE id = ?
    `,
    lastSet.id,
  )
}

export async function saveWorkoutSet(
  db: SQLiteDatabase,
  set: WorkoutSet,
) {
  const weight =
    parseOptionalDecimal(set.weight)

  const reps =
    parseOptionalInteger(set.reps)

  const rir =
    parseOptionalInteger(set.rir)

  const durationMinutes =
    parseOptionalDecimal(
      set.durationMinutes,
    )

  const distance =
    parseOptionalDecimal(set.distance)

  const level =
    parseOptionalDecimal(set.level)

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

    reps !== null && reps >= 0
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

export async function completeWorkoutSession(
  db: SQLiteDatabase,
  sessionId: number,
  exercises: WorkoutExercise[],
) {
  await db.withTransactionAsync(
    async () => {
      for (const exercise of exercises) {
        for (const set of exercise.sets) {
          await saveWorkoutSet(
            db,
            set,
          )
        }
      }

      await db.runAsync(
        `
          UPDATE workout_sessions
          SET
            completed_at =
              CURRENT_TIMESTAMP
          WHERE id = ?
        `,
        sessionId,
      )
    },
  )
}

export async function deleteWorkoutSession(
  db: SQLiteDatabase,
  sessionId: number,
) {
  await db.runAsync(
    `
      DELETE FROM workout_sessions
      WHERE id = ?
    `,
    sessionId,
  )
}
