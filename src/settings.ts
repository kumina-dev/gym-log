import type { ThemeMode } from '@/theme/types'
import Storage from 'expo-sqlite/kv-store'

const SETTINGS_KEY = 'app-settings'

export type AppSettings = {
  autoStartRestTimer: boolean
  restTimerSeconds: number
  restTimerNotifications: boolean
  themeMode: ThemeMode
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  autoStartRestTimer: true,
  restTimerSeconds: 90,
  restTimerNotifications: true,
  themeMode: 'system',
}

function isThemeMode(value: unknown): value is ThemeMode {
  return (
    value === 'light' ||
    value === 'dark' ||
    value === 'system'
  )
}

function parseAppSettings(
  value: unknown,
): AppSettings | null {
  if (typeof value !== 'object' || value === null) {
    return null
  }

  const settings = value as Partial<AppSettings>

  if (
    typeof settings.autoStartRestTimer !== 'boolean' ||
    typeof settings.restTimerSeconds !== 'number' ||
    !Number.isInteger(settings.restTimerSeconds) ||
    settings.restTimerSeconds < 30
  ) {
    return null
  }

  return {
    autoStartRestTimer: settings.autoStartRestTimer,
    restTimerSeconds: settings.restTimerSeconds,
    restTimerNotifications:
      typeof settings.restTimerNotifications === 'boolean'
        ? settings.restTimerNotifications
        : true,
    themeMode: isThemeMode(settings.themeMode)
      ? settings.themeMode
      : 'system',
  }
}

export async function getSettings(): Promise<AppSettings> {
  const storedSettings = await Storage.getItem(SETTINGS_KEY)

  if (!storedSettings) {
    return DEFAULT_APP_SETTINGS
  }

  try {
    const parsedValue: unknown = JSON.parse(storedSettings)

    return (
      parseAppSettings(parsedValue) ??
      DEFAULT_APP_SETTINGS
    )
  } catch {
    return DEFAULT_APP_SETTINGS
  }
}

export async function saveSettings(settings: AppSettings) {
  await Storage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}
