import { AppText } from '@/components/ui/AppText'
import { useAppTheme } from '@/theme/ThemeProvider'
import { Pressable, View } from 'react-native'

type SegmentedOption<T extends string> = {
  label: string
  value: T
}

type SegmentedControlProps<T extends string> = {
  value: T
  options: readonly SegmentedOption<T>[]
  onChange: (value: T) => void
}

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
}: SegmentedControlProps<T>) {
  const { theme } = useAppTheme()

  return (
    <View
      style={{
        backgroundColor: theme.colors.input,
        borderRadius: theme.radius.md,
        flexDirection: 'row',
        padding: theme.spacing.xs,
      }}
    >
      {options.map((option) => {
        const selected = option.value === value

        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => ({
              alignItems: 'center',
              backgroundColor: selected
                ? theme.colors.borderStrong
                : theme.colors.transparent,
              borderRadius: theme.radius.sm,
              flex: 1,
              opacity: pressed ? 0.7 : 1,
              paddingVertical: 9,
            })}
          >
            <AppText
              tone={selected ? 'default' : 'subtle'}
              variant="label"
            >
              {option.label}
            </AppText>
          </Pressable>
        )
      })}
    </View>
  )
}
