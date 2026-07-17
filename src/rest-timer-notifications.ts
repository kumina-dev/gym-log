import * as Notifications from 'expo-notifications'
import { AppState, Platform } from 'react-native'

const REST_TIMER_CHANNEL = 'rest-timers'

Notifications.setNotificationHandler({
  handleNotification: async () => {
    const appIsActive = AppState.currentState === 'active'

    return {
      shouldPlaySound: !appIsActive,
      shouldSetBadge: false,
      shouldShowBanner: !appIsActive,
      shouldShowList: !appIsActive,
    }
  },
})

async function createRestTimerChannel() {
  if (Platform.OS !== 'android') {
    return
  }

  await Notifications.setNotificationChannelAsync(
    REST_TIMER_CHANNEL,
    {
      name: 'Rest timers',
      description: 'Alerts when a rest timer finishes.',
      importance: Notifications.AndroidImportance.HIGH,
      enableVibrate: true,
      vibrationPattern: [0, 250, 150, 250],
      sound: 'default',
    },
  )
}

export async function requestRestTimerPermission() {
  await createRestTimerChannel()

  const currentPermission =
    await Notifications.getPermissionsAsync()

  if (currentPermission.granted) {
    return true
  }

  const requestedPermission =
    await Notifications.requestPermissionsAsync()

  return requestedPermission.granted
}

export async function scheduleRestTimerNotification(
  seconds: number,
) {
  await createRestTimerChannel()

  const permission =
    await Notifications.getPermissionsAsync()

  if (!permission.granted) {
    return null
  }

  return Notifications.scheduleNotificationAsync({
    content: {
      title: 'Rest complete',
      body: 'Time for the next set.',
      sound: 'default',
    },
    trigger: {
      type:
        Notifications.SchedulableTriggerInputTypes
          .TIME_INTERVAL,
      seconds: Math.max(1, Math.ceil(seconds)),
      channelId: REST_TIMER_CHANNEL,
    },
  })
}

export async function cancelRestTimerNotification(
  identifier: string | null,
) {
  if (!identifier) {
    return
  }

  await Notifications.cancelScheduledNotificationAsync(
    identifier,
  )
}
