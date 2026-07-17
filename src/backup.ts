import type { SQLiteDatabase } from "expo-sqlite"

import {
  getSettings,
  saveSettings,
  type AppSettings,
} from "@/settings"

type WorkoutDayRow = {
  id: number
  name: string
  position: number
  created_at: string
}

type ExerciseRow = {
  id: number
  workout_day_id: number
  name: string
  position: number
  target_sets: number
  target_reps_min: number
  target_reps_max: number
  tracking_type?: string
  target_duration_seconds?: number | null
  target_distance?: number | null
  target_level?: number | null
  created_at: string
}

type WorkoutSessionRow = {
  id: number
  workout_day_id: number | null
  workout_day_name: string
  started_at: string
  completed_at: string | null
}

type SessionExerciseRow = {
  id: number
  session_id: number
  source_exercise_id: number | null
  name: string
  position: number
  tracking_type?: string
  target_duration_seconds?: number | null
  target_distance?: number | null
  target_level?: number | null
}

type SetLogRow = {
  id: number
  session_exercise_id: number
  set_number: number
  weight: number | null
  reps: number | null
  rir: number | null
  duration_seconds?: number | null
  distance?: number | null
  level?: number | null
  completed: number
}

export type GymLogBackup = {
  format: 'gym-log-backup'
  version: 1
  exportedAt: string
  settings: AppSettings
  data: {
    workoutDays: WorkoutDayRow[]
    exercises: ExerciseRow[]
    workoutSessions: WorkoutSessionRow[]
    sessionExercises: SessionExerciseRow[]
    setLogs: SetLogRow[]
  }
}

export async function createBackup(
  db: SQLiteDatabase,
): Promise<GymLogBackup> {
  const [
    workoutDays,
    exercises,
    workoutSessions,
    sessionExercises,
    setLogs,
    settings,
  ] = await Promise.all([
    db.getAllAsync<WorkoutDayRow>(
      'SELECT * FROM workout_days ORDER BY id',
    ),
    db.getAllAsync<ExerciseRow>(
      'SELECT * FROM exercises ORDER BY id',
    ),
    db.getAllAsync<WorkoutSessionRow>(
      'SELECT * FROM workout_sessions ORDER BY id',
    ),
    db.getAllAsync<SessionExerciseRow>(
      'SELECT * FROM session_exercises ORDER BY id',
    ),
    db.getAllAsync<SetLogRow>(
      'SELECT * FROM set_logs ORDER BY id',
    ),
    getSettings(),
  ])

  return {
    format: 'gym-log-backup',
    version: 1,
    exportedAt: new Date().toISOString(),
    settings,
    data: {
      workoutDays,
      exercises,
      workoutSessions,
      sessionExercises,
      setLogs,
    },
  }
}

export function parseBackup(value: unknown): GymLogBackup {
  if (
    typeof value !== 'object' ||
    value === null
  ) {
    throw new Error('Invalid backup file')
  }

  const backup = value as Partial<GymLogBackup>

  if (
    backup.format !== 'gym-log-backup' ||
    backup.version !== 1 ||
    typeof backup.exportedAt !== 'string' ||
    !backup.settings ||
    !backup.data ||
    !Array.isArray(backup.data.workoutDays) ||
    !Array.isArray(backup.data.exercises) ||
    !Array.isArray(backup.data.workoutSessions) ||
    !Array.isArray(backup.data.sessionExercises) ||
    !Array.isArray(backup.data.setLogs)
  ) {
    throw new Error('Unsupported or corrupted backup file')
  }

  return backup as GymLogBackup
}

export async function restoreBackup(
  db: SQLiteDatabase,
  backup: GymLogBackup,
) {
  await db.withTransactionAsync(async () => {
    await db.execAsync(`
      DELETE FROM set_logs;
      DELETE FROM session_exercises;
      DELETE FROM workout_sessions;
      DELETE FROM exercises;
      DELETE FROM workout_days;

      DELETE FROM sqlite_sequence
      WHERE name IN (
        'set_logs',
        'session_exercises',
        'workout_sessions',
        'exercises',
        'workout_days'
      );
    `)

    for (const workout of backup.data.workoutDays) {
      await db.runAsync(
        `
          INSERT INTO workout_days (
            id,
            name,
            position,
            created_at
          )
          VALUES (?, ?, ?, ?)
        `,
        workout.id,
        workout.name,
        workout.position,
        workout.created_at,
      )
    }

    for (const exercise of backup.data.exercises) {
      await db.runAsync(
        `
          INSERT INTO exercises (
            id,
            workout_day_id,
            name,
            position,
            target_sets,
            target_reps_min,
            target_reps_max,
            created_at,
            tracking_type,
            target_duration_seconds,
            target_distance,
            target_level
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        exercise.id,
        exercise.workout_day_id,
        exercise.name,
        exercise.position,
        exercise.target_sets,
        exercise.target_reps_min,
        exercise.target_reps_max,
        exercise.created_at,
        exercise.tracking_type ?? 'strength',
        exercise.target_duration_seconds ?? null,
        exercise.target_distance ?? null,
        exercise.target_level ?? null,
      )
    }

    for (const session of backup.data.workoutSessions) {
      await db.runAsync(
        `
          INSERT INTO workout_sessions (
            id,
            workout_day_id,
            workout_day_name,
            started_at,
            completed_at
          )
          VALUES (?, ?, ?, ?, ?)
        `,
        session.id,
        session.workout_day_id,
        session.workout_day_name,
        session.started_at,
        session.completed_at,
      )
    }

    for (const exercise of backup.data.sessionExercises) {
      await db.runAsync(
        `
          INSERT INTO session_exercises (
            id,
            session_id,
            source_exercise_id,
            name,
            position,
            tracking_type,
            target_duration_seconds,
            target_distance,
            target_level
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        exercise.id,
        exercise.session_id,
        exercise.source_exercise_id,
        exercise.name,
        exercise.position,
        exercise.tracking_type ?? 'strength',
        exercise.target_duration_seconds ?? null,
        exercise.target_distance ?? null,
        exercise.target_level ?? null,
      )
    }

    for (const set of backup.data.setLogs) {
      await db.runAsync(
        `
          INSERT INTO set_logs (
            id,
            session_exercise_id,
            set_number,
            weight,
            reps,
            rir,
            completed,
            duration_seconds,
            distance,
            level
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        set.id,
        set.session_exercise_id,
        set.set_number,
        set.weight,
        set.reps,
        set.rir,
        set.completed,
        set.duration_seconds ?? null,
        set.distance ?? null,
        set.level ?? null,
      )
    }
  })

  await saveSettings(backup.settings)
}
