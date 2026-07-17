import type {
  AppTheme,
  ResolvedThemeMode,
  ThemeColors,
} from '@/theme/types'

const darkColors: ThemeColors = {
  background: '#0b0d10',
  surface: '#141417',
  surfaceRaised: '#18181b',
  input: '#202024',
  border: '#27272a',
  borderStrong: '#3f3f46',
  text: '#fafafa',
  textMuted: '#a1a1aa',
  textSubtle: '#71717a',
  primary: '#a3e635',
  primaryText: '#18230b',
  primarySurface: '#25310f',
  danger: '#f87171',
  dangerSurface: '#2b1215',
  dangerBorder: '#7f1d1d',
  tabBar: '#111114',
  transparent: 'transparent',
}

const lightColors: ThemeColors = {
  background: '#f5f6f2',
  surface: '#ffffff',
  surfaceRaised: '#f0f1ec',
  input: '#f7f7f4',
  border: '#dedfd8',
  borderStrong: '#c5c7bd',
  text: '#18181b',
  textMuted: '#52525b',
  textSubtle: '#71717a',
  primary: '#65a30d',
  primaryText: '#ffffff',
  primarySurface: '#ecfccb',
  danger: '#dc2626',
  dangerSurface: '#fef2f2',
  dangerBorder: '#fecaca',
  tabBar: '#ffffff',
  transparent: 'transparent',
}

export function createTheme(
  mode: ResolvedThemeMode,
): AppTheme {
  return {
    mode,
    isDark: mode === 'dark',
    colors:
      mode === 'dark' ? darkColors : lightColors,
    spacing: {
      xs: 4,
      sm: 8,
      md: 12,
      lg: 16,
      xl: 20,
      xxl: 24,
    },
    radius: {
      sm: 8,
      md: 10,
      lg: 12,
      xl: 16,
      round: 999,
    },
  }
}
