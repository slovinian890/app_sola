import { StyleSheet, View, ActivityIndicator, TouchableOpacity, Alert, Animated } from 'react-native';
import { useEffect, useState, useRef, useCallback } from 'react';
import * as Location from 'expo-location';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors, Spacing, BorderRadius, CleanPaceColors } from '@/constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import RunningMap from '@/components/running-map';
import { createRun, secondsToInterval, calculatePace } from '@/services/runsService';
import { updateUserStatsAfterRun, checkAndAwardAchievements } from '@/services/statsService';
import { getCurrentUser } from '@/services/authService';
import { Run, RouteData } from '@/services/supabase';
import PostRunModal from '@/components/post-run-modal';
import { getTrailColor, DEFAULT_TRAIL_COLOR } from '@/services/trailColorService';
import { useFocusEffect } from 'expo-router';

// Haversine formula for distance between two GPS coordinates
const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  // GPS & permissions
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Run state
  const [isRunning, setIsRunning] = useState(false);
  const [distance, setDistance] = useState(0);
  const [duration, setDuration] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [route, setRoute] = useState<Array<{ latitude: number; longitude: number }>>([]);
  const [saving, setSaving] = useState(false);

  // Refs
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastLocationRef = useRef<{ latitude: number; longitude: number } | null>(null);

  // Post-run modal
  const [showPostModal, setShowPostModal] = useState(false);
  const [savedRun, setSavedRun] = useState<Run | null>(null);

  // Trail color from user preferences
  const [trailColor, setTrailColor] = useState<string>(DEFAULT_TRAIL_COLOR);

  // Load trail color on focus (in case user changes it in Profile)
  useFocusEffect(
    useCallback(() => {
      getTrailColor().then(setTrailColor);
    }, [])
  );

  // Breathing animation for active timer
  const breathScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isRunning) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(breathScale, {
            toValue: 1.05,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(breathScale, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      breathScale.setValue(1);
    }
  }, [isRunning]);

  // Idle location watcher – always track user's real position on the map
  const idleLocationSub = useRef<Location.LocationSubscription | null>(null);

  // Request location permission and continuously watch real position
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setErrorMsg('Permission to access location was denied');
          setLoading(false);
          return;
        }

        // Enable high-accuracy GPS (prompts user to turn on GPS if off)
        const enabled = await Location.hasServicesEnabledAsync();
        if (!enabled) {
          setErrorMsg('Please enable Location Services in your device settings');
          setLoading(false);
          return;
        }

        // Get initial position with best accuracy
        const currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.BestForNavigation,
        });
        if (!cancelled) {
          setLocation(currentLocation);
          setLoading(false);
        }

        // Start a continuous background watch so the blue dot always reflects
        // the user's real position – even before starting a run
        const sub = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.BestForNavigation,
            timeInterval: 3000,   // every 3 s
            distanceInterval: 2,  // or every 2 m
          },
          (loc) => {
            if (!cancelled) setLocation(loc);
          }
        );
        if (!cancelled) {
          idleLocationSub.current = sub;
        } else {
          sub.remove();
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMsg('Error getting location – make sure GPS is turned on');
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      if (idleLocationSub.current) {
        idleLocationSub.current.remove();
        idleLocationSub.current = null;
      }
    };
  }, []);

  // Timer + live GPS tracking while running
  useEffect(() => {
    if (isRunning && startTime) {
      // Update duration every second
      intervalRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);

      // Stop the idle watcher – we'll use a high-frequency one for the run
      if (idleLocationSub.current) {
        idleLocationSub.current.remove();
        idleLocationSub.current = null;
      }

      // Watch position for route tracking (max accuracy, frequent updates)
      Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 1500,
          distanceInterval: 2,
        },
        (newLocation) => {
          const { latitude, longitude } = newLocation.coords;
          setLocation(newLocation);

          if (lastLocationRef.current) {
            const seg = calculateDistance(
              lastLocationRef.current.latitude,
              lastLocationRef.current.longitude,
              latitude,
              longitude
            );
            // Filter out GPS jitter (ignore jumps > 100m in 2s)
            if (seg < 0.1) {
              setDistance((prev) => prev + seg);
            }
          }

          lastLocationRef.current = { latitude, longitude };
          setRoute((prev) => [...prev, { latitude, longitude }]);
        }
      ).then((sub) => {
        locationSubscription.current = sub;
      });
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (locationSubscription.current) {
        locationSubscription.current.remove();
        locationSubscription.current = null;
      }
      // Restart idle location watcher so the dot keeps following the user
      if (!idleLocationSub.current) {
        Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.BestForNavigation,
            timeInterval: 3000,
            distanceInterval: 2,
          },
          (loc) => setLocation(loc)
        ).then((sub) => {
          idleLocationSub.current = sub;
        });
      }
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (locationSubscription.current) locationSubscription.current.remove();
    };
  }, [isRunning, startTime]);

  // ── Start Run ──
  const handleStartRun = useCallback(() => {
    setStartTime(Date.now());
    setDistance(0);
    setDuration(0);
    setRoute([]);
    if (location) {
      const { latitude, longitude } = location.coords;
      lastLocationRef.current = { latitude, longitude };
      setRoute([{ latitude, longitude }]);
    }
    setIsRunning(true);
  }, [location]);

  // ── Stop Run & Save to Database ──
  const handleStopRun = useCallback(async () => {
    setIsRunning(false);

    if (duration < 5) {
      Alert.alert('Run too short', 'Run for at least a few seconds to save.');
      setDistance(0);
      setDuration(0);
      setRoute([]);
      setStartTime(null);
      lastLocationRef.current = null;
      return;
    }

    setSaving(true);

    try {
      const user = await getCurrentUser();
      if (!user) {
        Alert.alert('Error', 'Please sign in to save your run');
        setSaving(false);
        return;
      }

      const pace = calculatePace(distance, duration);
      const durationInterval = secondsToInterval(duration);

      const routeData: RouteData = {
        coordinates: route.map((r) => ({ latitude: r.latitude, longitude: r.longitude })),
        startLocation: route[0]
          ? { latitude: route[0].latitude, longitude: route[0].longitude }
          : undefined,
        endLocation: route[route.length - 1]
          ? { latitude: route[route.length - 1].latitude, longitude: route[route.length - 1].longitude }
          : undefined,
        trailColor, // Save user's chosen trail color with the run data
      };

      // Format time as 24-hour HH:MM:SS for PostgreSQL TIME column
      const now = new Date();
      const runTimeFormatted = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

      const result = await createRun({
        title: `Run – ${now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`,
        run_date: now.toISOString().split('T')[0],
        run_time: runTimeFormatted,
        distance_km: Math.round(distance * 100) / 100,
        duration: durationInterval,
        pace,
        calories: Math.round(distance * 60), // rough estimate ~60 cal/km
        route_data: routeData,
      });

      if (result.success) {
        const run = result.run;

        if (run) {
          // Update user stats
          const statsResult = await updateUserStatsAfterRun(run);

          // Check for achievements
          if (statsResult.success && statsResult.stats) {
            const newAchievements = await checkAndAwardAchievements(run, statsResult.stats);
            if (newAchievements.length > 0) {
              Alert.alert(
                'Achievement Unlocked! 🏆',
                newAchievements.map((a) => a.title).join(', ')
              );
            }
          }

          setSavedRun(run);
          setShowPostModal(true);
        }

        if (result.queued) {
          Alert.alert('Saved Offline', "Your run will sync when you're back online.");
        }

        // Reset state
        setDistance(0);
        setDuration(0);
        setRoute([]);
        setStartTime(null);
        lastLocationRef.current = null;
      } else {
        Alert.alert('Error', result.error || 'Failed to save run');
      }
    } catch (err) {
      console.error('Stop run error:', err);
      Alert.alert('Error', 'Something went wrong saving your run.');
    } finally {
      setSaving(false);
    }
  }, [duration, distance, route]);

  // ── Formatters ──
  const formatDuration = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatPace = (distKm: number, durSecs: number): string => {
    if (distKm === 0 || durSecs === 0) return '0:00';
    const secondsPerKm = durSecs / distKm;
    const mins = Math.floor(secondsPerKm / 60);
    const secs = Math.floor(secondsPerKm % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const pace = formatPace(distance, duration);

  // ── Loading State ──
  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.centeredContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <ThemedText type="body" variant="secondary" style={{ marginTop: Spacing.md }}>
            Getting your location...
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  // ── Error State ──
  if (errorMsg) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.centeredContainer}>
          <IconSymbol name="exclamationmark.triangle.fill" size={48} color={colors.primary} />
          <ThemedText type="body" variant="secondary" style={{ textAlign: 'center', marginTop: Spacing.md }}>
            {errorMsg}
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  if (!location) return null;

  const { latitude, longitude } = location.coords;

  return (
    <ThemedView style={styles.container}>
      {/* ── Header with live stats ── */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: colorScheme === 'dark' ? colors.card : colors.backgroundSecondary,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          },
        ]}>
        <View style={styles.headerContent}>
          <View style={styles.headerTitleRow}>
            <IconSymbol name="figure.run" size={28} color={colors.primary} />
            <ThemedText type="h3">Run Tracker</ThemedText>
          </View>
        </View>

        {/* Stats bar with breathing animation while running */}
        <Animated.View
          style={[
            styles.statsBar,
            {
              backgroundColor: colorScheme === 'dark' ? colors.background : CleanPaceColors.offWhite,
              borderWidth: 1,
              borderColor: isRunning ? colors.primary : colors.border,
              transform: isRunning ? [{ scale: breathScale }] : [],
            },
          ]}>
          <View style={styles.statItem}>
            <ThemedText type="h2" variant="primary">
              {distance.toFixed(2)}
            </ThemedText>
            <ThemedText type="caption" variant="muted">
              km
            </ThemedText>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <ThemedText type="h2" variant="primary">
              {formatDuration(duration)}
            </ThemedText>
            <ThemedText type="caption" variant="muted">
              time
            </ThemedText>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <ThemedText type="h2" variant="primary">
              {pace}
            </ThemedText>
            <ThemedText type="caption" variant="muted">
              pace/km
            </ThemedText>
          </View>
        </Animated.View>
      </View>

      {/* ── Leaflet Map ── */}
      <RunningMap
        latitude={latitude}
        longitude={longitude}
        colors={colors}
        route={route}
        isRunning={isRunning}
        trailColor={trailColor}
      />

      {/* ── Control Panel ── */}
      <View
        style={[
          styles.controlPanel,
          {
            backgroundColor: colorScheme === 'dark' ? colors.card : colors.background,
            borderTopWidth: 1,
            borderTopColor: colors.border,
          },
        ]}>
        {!isRunning ? (
          <TouchableOpacity
            style={[styles.startButton, { backgroundColor: colors.primary }]}
            onPress={handleStartRun}
            activeOpacity={0.7}
            disabled={saving}>
            <IconSymbol name="play.fill" size={22} color={CleanPaceColors.offWhite} />
            <ThemedText
              type="bodyBold"
              lightColor={CleanPaceColors.offWhite}
              darkColor={CleanPaceColors.offWhite}>
              Start Run
            </ThemedText>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[
              styles.stopButton,
              {
                backgroundColor: colors.background,
                borderWidth: 2,
                borderColor: '#E53935',
              },
            ]}
            onPress={handleStopRun}
            activeOpacity={0.7}
            disabled={saving}>
            <IconSymbol name="stop.fill" size={22} color="#E53935" />
            <ThemedText type="bodyBold" lightColor="#E53935" darkColor="#E53935">
              {saving ? 'Saving...' : 'Stop & Save'}
            </ThemedText>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Post-run share modal ── */}
      <PostRunModal
        visible={showPostModal}
        run={savedRun}
        onClose={() => {
          setShowPostModal(false);
          setSavedRun(null);
        }}
        onPost={() => {
          // Run posted to feed successfully
        }}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.md,
  },
  header: {
    paddingTop: 60,
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  headerContent: {
    marginBottom: Spacing.md,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  statsBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderRadius: BorderRadius.card,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 32,
  },
  controlPanel: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.card,
    gap: Spacing.sm,
  },
  stopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.card,
    gap: Spacing.sm,
  },
});
