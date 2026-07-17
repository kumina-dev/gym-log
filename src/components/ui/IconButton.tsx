import { useAppTheme } from '@/theme/ThemeProvider'
import { ReactNode } from 'react'
import { Pressable, PressableProps } from 'react-native'

type IconButtonProps = Omit<
  PressableProps,
  'children' | 'style'
> & {
  icon: ReactNode
  size?: number
}

export function IconButton({
  icon,
  size = 42,
  disabled,
  ...props
}: IconButtonProps) {
  const { theme } = useAppTheme()

  return (
    <Pressable
      {...props}
      disabled={disabled}
      hitSlop={8}
      style={({ pressed }) => ({
        alignItems: 'center',
        backgroundColor: theme.colors.surfaceRaised,
        borderColor: theme.colors.border,
        borderRadius: theme.radius.md,
        borderWidth: 1,
        height: size,
        justifyContent: 'center',
        opacity: disabled
          ? 0.3
          : pressed
            ? 0.65
            : 1,
        width: size,
      })}
    >
      {icon}
    </Pressable>
  )
}
