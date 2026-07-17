import type { SQLiteDatabase } from 'expo-sqlite'

const DATABASE_VERSION = 4

export async function migrateDatabase(db: SQLiteDatabase) {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
  `)

  const result = await db.getFirstAsync<{ user_version: number }>(
    'PRAGMA user_version',
  )

  let currentVersion = result?.user_version ?? 0

  if (currentVersion < 1) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS workout_days (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        position INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      PRAGMA user_version = 1;
    `)

    currentVersion = 1
  }

  if (currentVersion < 2) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS exercises (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        workout_day_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        position INTEGER NOT NULL DEFAULT 0,
        target_sets INTEGER NOT NULL DEFAULT 3,
        target_reps_min INTEGER NOT NULL DEFAULT 8,
        target_reps_max INTEGER NOT NULL DEFAULT 12,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (workout_day_id)
          REFERENCES workout_days (id)
          ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS exercises_workout_day_id_index
        ON exercises (workout_day_id);

      PRAGMA user_version = 2;
    `)

    currentVersion = 2
  }

  if (currentVersion < 3) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS workout_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        workout_day_id INTEGER,
        workout_day_name TEXT NOT NULL,
        started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        completed_at TEXT,
        FOREIGN KEY (workout_day_id)
          REFERENCES workout_days (id)
          ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS session_exercises (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER NOT NULL,
        source_exercise_id INTEGER,
        name TEXT NOT NULL,
        position INTEGER NOT NULL,
        FOREIGN KEY (session_id)
          REFERENCES workout_sessions (id)
          ON DELETE CASCADE,
        FOREIGN KEY (source_exercise_id)
          REFERENCES exercises (id)
          ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS set_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_exercise_id INTEGER NOT NULL,
        set_number INTEGER NOT NULL,
        weight REAL,
        reps INTEGER,
        rir INTEGER,
        completed INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (session_exercise_id)
          REFERENCES session_exercises (id)
          ON DELETE CASCADE,
        UNIQUE (session_exercise_id, set_number)
      );

      CREATE INDEX IF NOT EXISTS session_exercises_session_id_index
        ON session_exercises (session_id);

      CREATE INDEX IF NOT EXISTS set_logs_session_exercise_id_index
        ON set_logs (session_exercise_id);

      PRAGMA user_version = 3;
    `)

    currentVersion = 3
  }

  if (currentVersion < 4) {
    await db.execAsync(`
      ALTER TABLE exercises
        ADD COLUMN tracking_type TEXT NOT NULL DEFAULT 'strength';

      ALTER TABLE exercises
        ADD COLUMN target_duration_seconds INTEGER;

      ALTER TABLE exercises
        ADD COLUMN target_distance REAL;

      ALTER TABLE exercises
        ADD COLUMN target_level REAL;

      ALTER TABLE session_exercises
        ADD COLUMN tracking_type TEXT NOT NULL DEFAULT 'strength';

      ALTER TABLE session_exercises
        ADD COLUMN target_duration_seconds INTEGER;

      ALTER TABLE session_exercises
        ADD COLUMN target_distance REAL;

      ALTER TABLE session_exercises
        ADD COLUMN target_level REAL;

      ALTER TABLE set_logs
        ADD COLUMN duration_seconds INTEGER;

      ALTER TABLE set_logs
        ADD COLUMN distance REAL;

      ALTER TABLE set_logs
        ADD COLUMN level REAL;

      PRAGMA user_version = 4;
    `)

    currentVersion = 4
  }

  if (currentVersion !== DATABASE_VERSION) {
    throw new Error(`Unsupported database version: ${currentVersion}`)
  }
}
