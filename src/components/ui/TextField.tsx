import { AppText } from '@/components/ui/AppText'
import { useAppTheme } from '@/theme/ThemeProvider'
import { TextInput, TextInputProps, View } from 'react-native'

type TextFieldProps = TextInputProps & {
  label?: string
  error?: string
}

export function TextField({
  label,
  error,
  style,
  ...props
}: TextFieldProps) {
  const { theme } = useAppTheme()

  return (
    <View style={{ minWidth: 0 }}>
      {label && (
        <AppText
          tone="muted"
          variant="label"
          style={{ marginBottom: theme.spacing.sm }}
        >
          {label}
        </AppText>
      )}

      <TextInput
        {...props}
        placeholderTextColor={theme.colors.textSubtle}
        style={[
          {
            backgroundColor: theme.colors.input,
            borderColor: error
              ? theme.colors.danger
              : theme.colors.borderStrong,
            borderRadius: theme.radius.md,
            borderWidth: 1,
            color: theme.colors.text,
            fontSize: 16,
            minHeight: 48,
            paddingHorizontal: theme.spacing.md,
            paddingVertical: theme.spacing.md,
          },
          style,
        ]}
      />

      {error && (
        <AppText
          tone="danger"
          variant="caption"
          style={{ marginTop: theme.spacing.xs }}
        >
          {error}
        </AppText>
      )}
    </View>
  )
}
