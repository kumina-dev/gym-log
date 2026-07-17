import {
  CardioHistoryCard,
} from '@/components/history/CardioHistoryCard'
import {
  StrengthHistoryCard,
} from '@/components/history/StrengthHistoryCard'
import {
  loadWorkoutHistory,
  saveWorkoutHistory,
} from '@/database/workout-history'
import {
  deleteWorkoutSession,
} from '@/database/workout-sessions'
import { useAppTheme } from '@/theme/ThemeProvider'
import type {
  HistoryExercise,
  HistorySet,
} from '@/types/workout-history'
import {
  router,
  Stack,
  useFocusEffect,
  useLocalSearchParams,
} from 'expo-router'
import { useSQLiteContext } from 'expo-sqlite'
import {
  Pencil,
  Save,
  Trash2,
  X,
} from 'lucide-react-native'
import {
  useCallback,
  useMemo,
  useState,
} from 'react'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import {
  SafeAreaView,
} from 'react-native-safe-area-context'

export default function HistoryDetailScreen() {
  const db = useSQLiteContext()
  const { theme } = useAppTheme()

  const styles = useMemo(
    () =>
      StyleSheet.create({
        loading: {
          alignItems: 'center',
          backgroundColor:
            theme.colors.background,
          flex: 1,
          justifyContent: 'center',
        },
        container: {
          backgroundColor:
            theme.colors.background,
          flex: 1,
        },
        headerActions: {
          alignItems: 'center',
          flexDirection: 'row',
          gap: 20,
        },
        editBanner: {
          alignItems: 'center',
          backgroundColor:
            theme.colors.primarySurface,
          borderBottomColor:
            theme.colors.primary,
          borderBottomWidth: 1,
          flexDirection: 'row',
          gap: 8,
          paddingHorizontal: 16,
          paddingVertical: 11,
        },
        editBannerText: {
          color: theme.colors.primary,
          fontSize: 13,
          fontWeight: '700',
        },
        list: {
          gap: 14,
          padding: 16,
        },
      }),
    [theme],
  )

  const params = useLocalSearchParams<{
    id: string
    name?: string
  }>()

  const sessionId = Number(params.id)

  const workoutName =
    typeof params.name === 'string'
      ? params.name
      : 'Workout'

  const [exercises, setExercises] =
    useState<HistoryExercise[] | null>(null)

  const [isEditing, setIsEditing] =
    useState(false)

  const [isSaving, setIsSaving] =
    useState(false)

  const loadWorkout = useCallback(
    async () => {
      const loadedExercises =
        await loadWorkoutHistory(
          db,
          sessionId,
        )

      setExercises(loadedExercises)
    },
    [db, sessionId],
  )

  useFocusEffect(
    useCallback(() => {
      void loadWorkout()
    }, [loadWorkout]),
  )

  function updateSet(
    exerciseId: number,
    setId: number,
    changes: Partial<HistorySet>,
  ) {
    setExercises(
      (current) =>
        current?.map((exercise) =>
          exercise.id !== exerciseId
            ? exercise
            : {
                ...exercise,
                sets: exercise.sets.map(
                  (set) =>
                    set.id === setId
                      ? {
                          ...set,
                          ...changes,
                        }
                      : set,
                ),
              },
        ) ?? null,
    )
  }

  async function saveWorkout() {
    if (!exercises || isSaving) {
      return
    }

    setIsSaving(true)

    try {
      await saveWorkoutHistory(
        db,
        exercises,
      )

      setIsEditing(false)

      await loadWorkout()
    } finally {
      setIsSaving(false)
    }
  }

  async function cancelEditing() {
    setIsEditing(false)
    await loadWorkout()
  }

  function confirmDelete() {
    Alert.alert(
      'Delete workout history?',
      'This permanently removes every recorded set from this workout.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () =>
            void deleteWorkout(),
        },
      ],
    )
  }

  async function deleteWorkout() {
    await deleteWorkoutSession(
      db,
      sessionId,
    )

    router.back()
  }

  if (exercises === null) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator
          color={theme.colors.primary}
        />
      </View>
    )
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: workoutName,

          headerRight: () =>
            isEditing ? (
              <View
                style={
                  styles.headerActions
                }
              >
                <Pressable
                  accessibilityLabel={
                    'Cancel editing'
                  }
                  hitSlop={10}
                  onPress={() =>
                    void cancelEditing()
                  }
                >
                  <X
                    color={
                      theme.colors.textMuted
                    }
                    size={21}
                  />
                </Pressable>

                <Pressable
                  accessibilityLabel={
                    'Save workout'
                  }
                  disabled={isSaving}
                  hitSlop={10}
                  onPress={() =>
                    void saveWorkout()
                  }
                  style={
                    isSaving
                      ? { opacity: 0.45 }
                      : undefined
                  }
                >
                  <Save
                    color={
                      theme.colors.primary
                    }
                    size={21}
                  />
                </Pressable>
              </View>
            ) : (
              <View
                style={
                  styles.headerActions
                }
              >
                <Pressable
                  accessibilityLabel={
                    'Edit workout'
                  }
                  hitSlop={10}
                  onPress={() =>
                    setIsEditing(true)
                  }
                >
                  <Pencil
                    color={
                      theme.colors.textMuted
                    }
                    size={20}
                  />
                </Pressable>

                <Pressable
                  accessibilityLabel={
                    'Delete workout'
                  }
                  hitSlop={10}
                  onPress={confirmDelete}
                >
                  <Trash2
                    color={
                      theme.colors.danger
                    }
                    size={21}
                  />
                </Pressable>
              </View>
            ),
        }}
      />

      <SafeAreaView
        edges={['bottom']}
        style={styles.container}
      >
        <KeyboardAvoidingView
          behavior={
            Platform.OS === 'ios'
              ? 'padding'
              : undefined
          }
          style={styles.container}
        >
          {isEditing && (
            <View
              style={styles.editBanner}
            >
              <Pencil
                color={
                  theme.colors.primary
                }
                size={17}
              />

              <Text
                style={
                  styles.editBannerText
                }
              >
                Editing recorded sets
              </Text>
            </View>
          )}

          <FlatList
            data={exercises}
            keyExtractor={(exercise) =>
              exercise.id.toString()
            }
            contentContainerStyle={
              styles.list
            }
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps={
              'handled'
            }
            renderItem={({ item }) =>
              item.trackingType === 'cardio'
                ? (
                    <CardioHistoryCard
                      exercise={item}
                      isEditing={isEditing}
                      onUpdateSet={updateSet}
                    />
                  )
                : (
                    <StrengthHistoryCard
                      exercise={item}
                      isEditing={isEditing}
                      onUpdateSet={updateSet}
                    />
                  )
            }
          />
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  )
}
