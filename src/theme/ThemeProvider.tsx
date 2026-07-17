import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react'
import { useColorScheme } from 'react-native'

import {
  getSettings,
  saveSettings,
} from '@/settings'

import { createTheme } from '@/theme/tokens'
import type {
  AppTheme,
  ThemeMode,
} from '@/theme/types'

type ThemeContextValue = {
  theme: AppTheme
  themeMode: ThemeMode
  setThemeMode: (mode: ThemeMode) => Promise<void>
}

const ThemeContext =
  createContext<ThemeContextValue | null>(null)

export function ThemeProvider({
  children,
}: PropsWithChildren) {
  const systemTheme = useColorScheme()
  const [themeMode, setThemeModeState] =
    useState<ThemeMode>('system')

  useEffect(() => {
    let active = true

    async function loadTheme() {
      const settings = await getSettings()

      if (active) {
        setThemeModeState(settings.themeMode)
      }
    }

    void loadTheme()

    return () => {
      active = false
    }
  }, [])

  const resolvedMode =
    themeMode === 'system'
      ? systemTheme === 'light'
        ? 'light'
        : 'dark'
      : themeMode

  const theme = useMemo(
    () => createTheme(resolvedMode),
    [resolvedMode],
  )

  async function setThemeMode(mode: ThemeMode) {
    setThemeModeState(mode)

    const settings = await getSettings()

    await saveSettings({
      ...settings,
      themeMode: mode,
    })
  }

  const value = useMemo(
    () => ({
      theme,
      themeMode,
      setThemeMode,
    }),
    [theme, themeMode],
  )

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useAppTheme() {
  const context = useContext(ThemeContext)

  if (!context) {
    throw new Error(
      'useAppTheme must be used within ThemeProvider',
    )
  }

  return context
}
