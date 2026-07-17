import type {
  TrackingType,
} from '@/types/active-workout'

export type HistorySet = {
  id: number
  setNumber: number

  weight: string
  reps: string
  rir: string

  durationMinutes: string
  distance: string
  level: string

  completed: boolean
}

export type HistoryExercise = {
  id: number
  name: string
  position: number
  trackingType: TrackingType
  sets: HistorySet[]
}
