import { useAppTheme } from '@/theme/ThemeProvider'
import { View, ViewProps } from 'react-native'

export function Card({
  style,
  ...props
}: ViewProps) {
  const { theme } = useAppTheme()

  return (
    <View
      {...props}
      style={[
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          borderRadius: theme.radius.xl,
          borderWidth: 1,
        },
        style,
      ]}
    />
  )
}
