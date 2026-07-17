import { AppText } from '@/components/ui/AppText'
import { useAppTheme } from '@/theme/ThemeProvider'
import { ReactNode } from 'react'
import { Pressable, PressableProps, ViewStyle } from 'react-native'

type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'destructive'
  | 'ghost'

type ButtonProps = Omit<
  PressableProps,
  'children' | 'style'
> & {
  label: string
  icon?: ReactNode
  variant?: ButtonVariant
  style?: ViewStyle
}

export function Button({
  label,
  icon,
  variant = 'primary',
  disabled,
  style,
  ...props
}: ButtonProps) {
  const { theme } = useAppTheme()

  const variants: Record<ButtonVariant, ViewStyle> = {
    primary: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    secondary: {
      backgroundColor: theme.colors.surfaceRaised,
      borderColor: theme.colors.borderStrong,
    },
    destructive: {
      backgroundColor: theme.colors.dangerSurface,
      borderColor: theme.colors.dangerBorder,
    },
    ghost: {
      backgroundColor: theme.colors.transparent,
      borderColor: theme.colors.border,
    },
  }

  const tone =
    variant === 'destructive'
      ? 'danger'
      : variant === 'primary'
        ? 'default'
        : 'muted'

  return (
    <Pressable
      {...props}
      disabled={disabled}
      style={({ pressed }) => [
        {
          alignItems: 'center',
          borderRadius: theme.radius.lg,
          borderWidth: 1,
          flexDirection: 'row',
          gap: theme.spacing.sm,
          justifyContent: 'center',
          minHeight: 48,
          paddingHorizontal: theme.spacing.lg,
          paddingVertical: theme.spacing.md,
        },
        variants[variant],
        pressed && { opacity: 0.7 },
        disabled && { opacity: 0.4 },
        style,
      ]}
    >
      {icon}

      <AppText
        tone={tone}
        variant="label"
        style={
          variant === 'primary'
            ? { color: theme.colors.primaryText }
            : undefined
        }
      >
        {label}
      </AppText>
    </Pressable>
  )
}
