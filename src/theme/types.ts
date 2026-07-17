export type ThemeMode = 'light' | 'dark' | 'system'

export type ResolvedThemeMode = Exclude<
  ThemeMode,
  'system'
>

export type ThemeColors = {
  background: string
  surface: string
  surfaceRaised: string
  input: string
  border: string
  borderStrong: string
  text: string
  textMuted: string
  textSubtle: string
  primary: string
  primaryText: string
  primarySurface: string
  danger: string
  dangerSurface: string
  dangerBorder: string
  tabBar: string
  transparent: string
}

export type AppTheme = {
  mode: ResolvedThemeMode
  isDark: boolean
  colors: ThemeColors
  spacing: {
    xs: number
    sm: number
    md: number
    lg: number
    xl: number
    xxl: number
  }
  radius: {
    sm: number
    md: number
    lg: number
    xl: number
    round: number
  }
}
