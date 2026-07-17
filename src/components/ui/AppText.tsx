import {
  Text,
  type TextProps,
  type TextStyle,
} from 'react-native'

import { useAppTheme } from '@/theme/ThemeProvider'

type TextVariant =
  | 'display'
  | 'title'
  | 'heading'
  | 'body'
  | 'label'
  | 'caption'

type TextTone =
  | 'default'
  | 'muted'
  | 'subtle'
  | 'primary'
  | 'danger'

type AppTextProps = TextProps & {
  variant?: TextVariant
  tone?: TextTone
}

const variants: Record<TextVariant, TextStyle> = {
  display: {
    fontSize: 32,
    fontWeight: '800',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
  },
  heading: {
    fontSize: 18,
    fontWeight: '800',
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
  },
  caption: {
    fontSize: 12,
    lineHeight: 18,
  },
}

export function AppText({
  variant = 'body',
  tone = 'default',
  style,
  ...props
}: AppTextProps) {
  const { theme } = useAppTheme()

  const colors: Record<TextTone, string> = {
    default: theme.colors.text,
    muted: theme.colors.textMuted,
    subtle: theme.colors.textSubtle,
    primary: theme.colors.primary,
    danger: theme.colors.danger,
  }

  return (
    <Text
      {...props}
      style={[
        variants[variant],
        { color: colors[tone] },
        style,
      ]}
    />
  )
}
