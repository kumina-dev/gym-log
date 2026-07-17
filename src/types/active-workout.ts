export type TrackingType =
  | 'strength'
  | 'cardio'

export type WorkoutSet = {
  id: number
  setNumber: number

  previousWeight: number | null
  weight: string
  previousReps: number | null
  reps: string
  rir: string

  previousDurationSeconds: number | null
  durationMinutes: string
  previousDistance: number | null
  distance: string
  previousLevel: number | null
  level: string

  completed: boolean
}

export type WorkoutExercise = {
  id: number
  name: string
  position: number
  trackingType: TrackingType
  targetDurationSeconds: number | null
  targetDistance: number | null
  targetLevel: number | null
  sets: WorkoutSet[]
}
