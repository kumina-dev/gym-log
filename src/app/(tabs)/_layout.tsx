import { useAppTheme } from '@/theme/ThemeProvider'
import { Tabs } from 'expo-router'
import { Dumbbell, History } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

export default function TabsLayout() {
  const { theme } = useAppTheme()
  const insets = useSafeAreaInsets()

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: {
          backgroundColor: theme.colors.background,
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSubtle,
        tabBarStyle: {
          backgroundColor: theme.colors.tabBar,
          borderTopColor: theme.colors.border,
          height: 58 + insets.bottom,
          paddingBottom: Math.max(insets.bottom, 8),
          paddingTop: 7,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Dumbbell color={color} size={size} />
          ),
        }}
      />

      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color, size }) => (
            <History color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  )
}
