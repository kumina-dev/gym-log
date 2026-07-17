import * as DocumentPicker from 'expo-document-picker'
import { File, Paths } from 'expo-file-system'
import { useFocusEffect } from 'expo-router'
import * as Sharing from 'expo-sharing'
import { useSQLiteContext } from 'expo-sqlite'
import {
  BellRing,
  DatabaseBackup,
  Download,
  Monitor,
  Moon,
  Palette,
  Sun,
  TimerReset,
  Upload,
  Zap
} from 'lucide-react-native'
import type { ReactNode } from 'react'
import {
  useCallback,
  useMemo,
  useState,
} from 'react'
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  View
} from 'react-native'

import {
  createBackup,
  parseBackup,
  restoreBackup,
} from '@/backup'
import {
  AppText,
  Button,
  Card,
  Screen,
  SegmentedControl,
} from '@/components/ui'
import {
  requestRestTimerPermission,
} from '@/rest-timer-notifications'
import {
  DEFAULT_APP_SETTINGS,
  getSettings,
  saveSettings,
  type AppSettings,
} from '@/settings'
import {
  useAppTheme,
} from '@/theme/ThemeProvider'
import type {
  AppTheme,
  ThemeMode,
} from '@/theme/types'

const REST_TIMER_OPTIONS = [
  {
    label: '1 min',
    value: '60',
  },
  {
    label: '1.5 min',
    value: '90',
  },
  {
    label: '2 min',
    value: '120',
  },
  {
    label: '3 min',
    value: '180',
  },
] as const

const THEME_OPTIONS = [
  {
    label: 'Light',
    value: 'light',
  },
  {
    label: 'Dark',
    value: 'dark',
  },
  {
    label: 'System',
    value: 'system',
  },
] as const

export default function SettingsScreen() {
  const db = useSQLiteContext()

  const {
    theme,
    themeMode,
    setThemeMode,
  } = useAppTheme()

  const styles = useMemo(
    () => createStyles(theme),
    [theme],
  )

  const [settings, setSettings] =
    useState<AppSettings>(
      DEFAULT_APP_SETTINGS,
    )

  const [isLoading, setIsLoading] =
    useState(true)

  const [isExporting, setIsExporting] =
    useState(false)

  const [isImporting, setIsImporting] =
    useState(false)

  useFocusEffect(
    useCallback(() => {
      let active = true

      async function load() {
        const storedSettings =
          await getSettings()

        if (active) {
          setSettings(storedSettings)
          setIsLoading(false)
        }
      }

      void load()

      return () => {
        active = false
      }
    }, []),
  )

  async function updateSettings(
    changes: Partial<AppSettings>,
  ) {
    const updatedSettings = {
      ...settings,
      ...changes,
    }

    setSettings(updatedSettings)
    await saveSettings(updatedSettings)
  }

  async function updateTheme(
    mode: ThemeMode,
  ) {
    setSettings((current) => ({
      ...current,
      themeMode: mode,
    }))

    await setThemeMode(mode)
  }

  async function updateRestTimerNotifications(
    enabled: boolean,
  ) {
    if (!enabled) {
      await updateSettings({
        restTimerNotifications: false,
      })

      return
    }

    const granted =
      await requestRestTimerPermission()

    if (!granted) {
      Alert.alert(
        'Notifications disabled',
        'Allow notifications in Android settings to receive rest timer alerts.',
      )

      await updateSettings({
        restTimerNotifications: false,
      })

      return
    }

    await updateSettings({
      restTimerNotifications: true,
    })
  }

  async function exportBackup() {
    if (isExporting) {
      return
    }

    setIsExporting(true)

    try {
      const backup = await createBackup(db)

      const timestamp = new Date()
        .toISOString()
        .replaceAll(':', '-')
        .replaceAll('.', '-')

      const file = new File(
        Paths.cache,
        `gym-log-backup-${timestamp}.json`,
      )

      file.create()
      file.write(
        JSON.stringify(backup, null, 2),
      )

      const sharingAvailable =
        await Sharing.isAvailableAsync()

      if (!sharingAvailable) {
        throw new Error(
          'File sharing is unavailable',
        )
      }

      await Sharing.shareAsync(file.uri, {
        dialogTitle: 'Export GymLog backup',
        mimeType: 'application/json',
        UTI: 'public.json',
      })
    } catch (error) {
      Alert.alert(
        'Export failed',
        error instanceof Error
          ? error.message
          : 'Could not export the backup.',
      )
    } finally {
      setIsExporting(false)
    }
  }

  async function selectBackup() {
    if (isImporting) {
      return
    }

    try {
      const result =
        await DocumentPicker.getDocumentAsync({
          type: 'application/json',
          copyToCacheDirectory: true,
          multiple: false,
        })

      if (result.canceled) {
        return
      }

      const file = new File(
        result.assets[0].uri,
      )

      const contents = await file.text()
      const parsedContents: unknown =
        JSON.parse(contents)

      const backup =
        parseBackup(parsedContents)

      Alert.alert(
        'Restore backup?',
        'Current workouts, active sessions, history, and settings will be replaced.',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Restore',
            style: 'destructive',
            onPress: () => {
              void importBackup(backup)
            },
          },
        ],
      )
    } catch (error) {
      Alert.alert(
        'Invalid backup',
        error instanceof Error
          ? error.message
          : 'The selected file could not be read.',
      )
    }
  }

  async function importBackup(
    backup: ReturnType<
      typeof parseBackup
    >,
  ) {
    setIsImporting(true)

    try {
      await restoreBackup(db, backup)

      const restoredSettings =
        await getSettings()

      setSettings(restoredSettings)

      await setThemeMode(
        restoredSettings.themeMode,
      )

      Alert.alert(
        'Backup restored',
        'Workouts, history, and settings were restored.',
      )
    } catch (error) {
      Alert.alert(
        'Restore failed',
        error instanceof Error
          ? error.message
          : 'The backup could not be restored.',
      )
    } finally {
      setIsImporting(false)
    }
  }

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator
          color={theme.colors.primary}
        />
      </View>
    )
  }

  return (
    <Screen edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Card style={styles.section}>
          <SectionHeading
            icon={
              <Palette
                color={theme.colors.primary}
                size={21}
              />
            }
            title="Appearance"
            description="Choose how GymLog looks."
          />

          <View style={styles.sectionContent}>
            <View style={styles.themeIcons}>
              <Sun
                color={
                  themeMode === 'light'
                    ? theme.colors.primary
                    : theme.colors.textSubtle
                }
                size={18}
              />

              <Moon
                color={
                  themeMode === 'dark'
                    ? theme.colors.primary
                    : theme.colors.textSubtle
                }
                size={18}
              />

              <Monitor
                color={
                  themeMode === 'system'
                    ? theme.colors.primary
                    : theme.colors.textSubtle
                }
                size={18}
              />
            </View>

            <SegmentedControl
              value={themeMode}
              options={THEME_OPTIONS}
              onChange={(mode) => {
                void updateTheme(mode)
              }}
            />
          </View>
        </Card>

        <Card style={styles.section}>
          <SectionHeading
            icon={
              <TimerReset
                color={theme.colors.primary}
                size={21}
              />
            }
            title="Rest timer"
            description="Timer used after completing a set."
          />

          <SettingToggle
            icon={
              <Zap
                color={theme.colors.textMuted}
                size={17}
              />
            }
            title="Start automatically"
            description="Start after marking a set complete."
            value={
              settings.autoStartRestTimer
            }
            onValueChange={(value) => {
              void updateSettings({
                autoStartRestTimer: value,
              })
            }}
          />

          <SettingToggle
            icon={
              <BellRing
                color={theme.colors.textMuted}
                size={17}
              />
            }
            title="Rest timer alerts"
            description="Notify you while GymLog is in the background."
            value={
              settings.restTimerNotifications
            }
            onValueChange={(value) => {
              void updateRestTimerNotifications(
                value,
              )
            }}
          />

          <View style={styles.sectionContent}>
            <AppText variant="label">
              Default duration
            </AppText>

            <View style={styles.controlSpacing}>
              <SegmentedControl
                value={
                  settings.restTimerSeconds.toString()
                }
                options={REST_TIMER_OPTIONS}
                onChange={(value) => {
                  void updateSettings({
                    restTimerSeconds:
                      Number(value),
                  })
                }}
              />
            </View>
          </View>
        </Card>

        <Card style={styles.section}>
          <SectionHeading
            icon={
              <DatabaseBackup
                color={theme.colors.primary}
                size={21}
              />
            }
            title="Data backup"
            description="Export or restore all local GymLog data."
          />

          <View style={styles.backupActions}>
            <Button
              disabled={
                isExporting || isImporting
              }
              icon={
                <Download
                  color={theme.colors.textMuted}
                  size={19}
                />
              }
              label={
                isExporting
                  ? 'Exporting...'
                  : 'Export backup'
              }
              onPress={() => {
                void exportBackup()
              }}
              variant="secondary"
            />

            <AppText
              tone="subtle"
              variant="caption"
            >
              Save a portable JSON backup.
            </AppText>

            <View style={styles.actionDivider} />

            <Button
              disabled={
                isExporting || isImporting
              }
              icon={
                <Upload
                  color={theme.colors.textMuted}
                  size={19}
                />
              }
              label={
                isImporting
                  ? 'Restoring...'
                  : 'Restore backup'
              }
              onPress={() => {
                void selectBackup()
              }}
              variant="secondary"
            />

            <AppText
              tone="subtle"
              variant="caption"
            >
              Replace current data from a backup.
            </AppText>
          </View>
        </Card>
      </ScrollView>
    </Screen>
  )
}

type SectionHeadingProps = {
  icon: ReactNode
  title: string
  description: string
}

function SectionHeading({
  icon,
  title,
  description,
}: SectionHeadingProps) {
  const { theme } = useAppTheme()

  return (
    <View
      style={{
        alignItems: 'center',
        borderBottomColor:
          theme.colors.border,
        borderBottomWidth: 1,
        flexDirection: 'row',
        padding: theme.spacing.lg,
      }}
    >
      <View
        style={{
          alignItems: 'center',
          backgroundColor:
            theme.colors.primarySurface,
          borderRadius: theme.radius.md,
          height: 42,
          justifyContent: 'center',
          width: 42,
        }}
      >
        {icon}
      </View>

      <View
        style={{
          flex: 1,
          marginLeft: theme.spacing.md,
        }}
      >
        <AppText variant="heading">
          {title}
        </AppText>

        <AppText
          tone="subtle"
          variant="caption"
          style={{ marginTop: 2 }}
        >
          {description}
        </AppText>
      </View>
    </View>
  )
}

type SettingToggleProps = {
  icon: ReactNode
  title: string
  description: string
  value: boolean
  onValueChange: (value: boolean) => void
}

function SettingToggle({
  icon,
  title,
  description,
  value,
  onValueChange,
}: SettingToggleProps) {
  const { theme } = useAppTheme()

  return (
    <View
      style={{
        alignItems: 'center',
        borderBottomColor:
          theme.colors.border,
        borderBottomWidth: 1,
        flexDirection: 'row',
        padding: theme.spacing.lg,
      }}
    >
      <View style={{ flex: 1, paddingRight: 16 }}>
        <View
          style={{
            alignItems: 'center',
            flexDirection: 'row',
            gap: theme.spacing.sm,
          }}
        >
          {icon}
          <AppText variant="label">
            {title}
          </AppText>
        </View>

        <AppText
          tone="subtle"
          variant="caption"
          style={{ marginTop: 4 }}
        >
          {description}
        </AppText>
      </View>

      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{
          false: theme.colors.borderStrong,
          true: theme.colors.primary,
        }}
        thumbColor={
          value
            ? theme.colors.primarySurface
            : theme.colors.textMuted
        }
      />
    </View>
  )
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    loading: {
      alignItems: 'center',
      backgroundColor:
        theme.colors.background,
      flex: 1,
      justifyContent: 'center',
    },
    content: {
      gap: theme.spacing.lg,
      padding: theme.spacing.xl,
    },
    section: {
      overflow: 'hidden',
    },
    sectionContent: {
      padding: theme.spacing.lg,
    },
    themeIcons: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      marginBottom: theme.spacing.sm,
      paddingHorizontal: theme.spacing.xl,
    },
    controlSpacing: {
      marginTop: theme.spacing.md,
    },
    backupActions: {
      padding: theme.spacing.lg,
    },
    actionDivider: {
      backgroundColor:
        theme.colors.border,
      height: 1,
      marginVertical: theme.spacing.lg,
    },
  })
}
