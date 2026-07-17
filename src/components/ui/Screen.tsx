import { useAppTheme } from '@/theme/ThemeProvider'
import type { PropsWithChildren } from 'react'
import type { ViewStyle } from 'react-native'
import {
  SafeAreaView,
  type Edge,
} from 'react-native-safe-area-context'

type ScreenProps = PropsWithChildren<{
  edges?: Edge[]
  padded?: boolean
  style?: ViewStyle
}>

export function Screen({
  children,
  edges = ['bottom'],
  padded = false,
  style,
}: ScreenProps) {
  const { theme } = useAppTheme()

  return (
    <SafeAreaView
      edges={edges}
      style={[
        {
          backgroundColor: theme.colors.background,
          flex: 1,
          paddingHorizontal: padded
            ? theme.spacing.xl
            : 0,
        },
        style,
      ]}
    >
      {children}
    </SafeAreaView>
  )
}
