import { Stack } from 'expo-router'
import { SQLiteProvider } from 'expo-sqlite'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { migrateDatabase } from '@/database/migrate'
import {
  ThemeProvider,
  useAppTheme,
} from '@/theme/ThemeProvider'

function RootNavigator() {
  const { theme } = useAppTheme()

  return (
    <>
      <StatusBar
        style={theme.isDark ? 'light' : 'dark'}
      />

      <Stack
        screenOptions={{
          contentStyle: {
            backgroundColor: theme.colors.background,
          },
          headerStyle: {
            backgroundColor: theme.colors.background,
          },
          headerShadowVisible: false,
          headerTintColor: theme.colors.text,
        }}
      >
        <Stack.Screen
          name="(tabs)"
          options={{ headerShown: false }}
        />

        <Stack.Screen
          name="workout-day/[id]"
          options={{ title: 'Workout' }}
        />

        <Stack.Screen
          name="workout/[id]"
          options={{
            title: 'Workout',
            gestureEnabled: false,
          }}
        />

        <Stack.Screen
          name="exercise/[id]"
          options={{ title: 'Exercise' }}
        />

        <Stack.Screen
          name="history/[id]"
          options={{ title: 'Workout' }}
        />

        <Stack.Screen
          name="settings"
          options={{ title: 'Settings' }}
        />
      </Stack>
    </>
  )
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SQLiteProvider
        databaseName='gym-log.db'
        onInit={migrateDatabase}
      >
        <ThemeProvider>
          <RootNavigator />
        </ThemeProvider>
      </SQLiteProvider>
    </SafeAreaProvider>
  );
}
