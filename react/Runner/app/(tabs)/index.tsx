import {
  StyleSheet,
  View,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Animated,
} from 'react-native';
import { useEffect, useState, useRef, useCallback } from 'react';
import * as Location from 'expo-location';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors, Spacing, BorderRadius, CleanPaceColors } from '@/constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import RunningMap from '@/components/running-map';
import TerritoryMap from '@/components/territory-map';
import { createRun, secondsToInterval, calculatePace } from '@/services/runsService';
import { updateUserStatsAfterRun, checkAndAwardAchievements } from '@/services/statsService';
import { getCurrentUser } from '@/services/authService';
import { Run, RouteData } from '@/services/supabase';
import PostRunModal from '@/components/post-run-modal';
import { getTrailColor, DEFAULT_TRAIL_COLOR } from '@/services/trailColorService';
import {
  getTerritoriesFromRuns,
  HexTerritory,
} from '@/services/territoryService';
import { useFocusEffect } from 'expo-router';

// ── Haversine distance (km) ─────────────────────────────────
const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// ── View modes ──────────────────────────────────────────────
type Mode = 'idle' | 'running' | 'compete';

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  // ── GPS & permissions ─────────────────────────────────────
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // ── Mode ──────────────────────────────────────────────────
  const [mode, setMode] = useState<Mode>('idle');

  // ── Run state ─────────────────────────────────────────────
  const [distance, setDistance] = useState(0);
  const [duration, setDuration] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [route, setRoute] = useState<Array<{ latitude: number; longitude: number }>>([]);
  const [saving, setSaving] = useState(false);

  // ── Refs ──────────────────────────────────────────────────
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastLocationRef = useRef<{ latitude: number; longitude: number } | null>(null);
  const idleLocationSub = useRef<Location.LocationSubscription | null>(null);

  // ── Post-run modal ────────────────────────────────────────
  const [showPostModal, setShowPostModal] = useState(false);
  const [savedRun, setSavedRun] = useState<Run | null>(null);

  // ── Trail color ───────────────────────────────────────────
  const [trailColor, setTrailColor] = useState<string>(DEFAULT_TRAIL_COLOR);

  // ── Compete state ─────────────────────────────────────────
  const [territories, setTerritories] = useState<HexTerritory[]>([]);
  const [myTileCount, setMyTileCount] = useState(0);
  const [userId, setUserId] = useState<string>('');

  // ── Load user info & trail colour on focus ────────────────
  useFocusEffect(
    useCallback(() => {
      getTrailColor().then(setTrailColor);
      getCurrentUser().then((u) => {
        if (u) setUserId(u.id);
      });
    }, []),
  );

  // ── Breathing animation for active timer ──────────────────
  const breathScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (mode === 'running') {
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
        ]),
      ).start();
    } else {
      breathScale.setValue(1);
    }
  }, [mode]);

  // ── Continuous idle location watcher ──────────────────────
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

        const enabled = await Location.hasServicesEnabledAsync();
        if (!enabled) {
          setErrorMsg('Please enable Location Services in your device settings');
          setLoading(false);
          return;
        }

        const cur = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.BestForNavigation,
        });
        if (!cancelled) {
          setLocation(cur);
          setLoading(false);
        }

        const sub = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 3000, distanceInterval: 2 },
          (loc) => { if (!cancelled) setLocation(loc); },
        );
        if (!cancelled) idleLocationSub.current = sub;
        else sub.remove();
      } catch {
        if (!cancelled) {
          setErrorMsg('Error getting location – make sure GPS is turned on');
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      idleLocationSub.current?.remove();
      idleLocationSub.current = null;
    };
  }, []);

  // ── Timer + live GPS tracking while running ───────────────
  useEffect(() => {
    if (mode === 'running' && startTime) {
      intervalRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);

      // Stop idle watcher, start high-freq run watcher
      idleLocationSub.current?.remove();
      idleLocationSub.current = null;

      Location.watchPositionAsync(
        { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1500, distanceInterval: 2 },
        (newLoc) => {
          const { latitude, longitude } = newLoc.coords;
          setLocation(newLoc);

          if (lastLocationRef.current) {
            const seg = calculateDistance(
              lastLocationRef.current.latitude,
              lastLocationRef.current.longitude,
              latitude,
              longitude,
            );
            if (seg < 0.1) setDistance((prev) => prev + seg);
          }

          lastLocationRef.current = { latitude, longitude };
          setRoute((prev) => [...prev, { latitude, longitude }]);
        },
      ).then((sub) => { locationSubscription.current = sub; });
    } else {
      intervalRef.current && clearInterval(intervalRef.current);
      intervalRef.current = null;
      locationSubscription.current?.remove();
      locationSubscription.current = null;

      // Restart idle watcher
      if (!idleLocationSub.current) {
        Location.watchPositionAsync(
          { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 3000, distanceInterval: 2 },
          (loc) => setLocation(loc),
        ).then((sub) => { idleLocationSub.current = sub; });
      }
    }

    return () => {
      intervalRef.current && clearInterval(intervalRef.current);
      locationSubscription.current?.remove();
    };
  }, [mode, startTime]);

  // ── Start Run ─────────────────────────────────────────────
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
    setMode('running');
  }, [location]);

  // ── Stop Run & Save ───────────────────────────────────────
  const handleStopRun = useCallback(async () => {
    setMode('idle');

    if (duration < 5) {
      Alert.alert('Run too short', 'Run for at least a few seconds to save.');
      setDistance(0); setDuration(0); setRoute([]); setStartTime(null);
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
        startLocation: route[0] ? { latitude: route[0].latitude, longitude: route[0].longitude } : undefined,
        endLocation: route.length > 0
          ? { latitude: route[route.length - 1].latitude, longitude: route[route.length - 1].longitude }
          : undefined,
        trailColor,
      };

      const now = new Date();
      const runTimeFormatted = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

      const result = await createRun({
        title: `Run – ${now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`,
        run_date: now.toISOString().split('T')[0],
        run_time: runTimeFormatted,
        distance_km: Math.round(distance * 100) / 100,
        duration: durationInterval,
        pace,
        calories: Math.round(distance * 60),
        route_data: routeData,
      });

      if (result.success) {
        if (result.run) {
          const statsResult = await updateUserStatsAfterRun(result.run);
          if (statsResult.success && statsResult.stats) {
            const newAch = await checkAndAwardAchievements(result.run, statsResult.stats);
            if (newAch.length > 0) {
              Alert.alert('Achievement Unlocked! 🏆', newAch.map((a) => a.title).join(', '));
            }
          }
          setSavedRun(result.run);
          setShowPostModal(true);
        }

        if (result.queued) {
          Alert.alert('Saved Offline', "Your run will sync when you're back online.");
        }

        setDistance(0); setDuration(0); setRoute([]); setStartTime(null);
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
  }, [duration, distance, route, trailColor]);

  // ── Enter Compete Mode ────────────────────────────────────
  const handleCompete = useCallback(async () => {
    setMode('compete');

    // Compute territories from everyone's actual runs
    const { territories: data, myCount } = await getTerritoriesFromRuns();
    setTerritories(data);
    setMyTileCount(myCount);
  }, []);

  // ── Formatters ────────────────────────────────────────────
  const formatDuration = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatPace = (distKm: number, durSecs: number): string => {
    if (distKm === 0 || durSecs === 0) return '0:00';
    const spk = durSecs / distKm;
    return `${Math.floor(spk / 60)}:${Math.floor(spk % 60).toString().padStart(2, '0')}`;
  };

  const pace = formatPace(distance, duration);

  // ── Loading / Error states ────────────────────────────────
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

  // ══════════════════════════════════════════════════════════
  // ── COMPETE VIEW ──────────────────────────────────────────
  // ══════════════════════════════════════════════════════════
  if (mode === 'compete') {
    return (
      <ThemedView style={styles.container}>
        {/* Header */}
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
              <TouchableOpacity onPress={() => setMode('idle')} style={styles.backBtn}>
                <IconSymbol name="chevron.left" size={22} color={colors.primary} />
              </TouchableOpacity>
              <IconSymbol name="hexagon.fill" size={26} color={colors.primary} />
              <ThemedText type="h3">Territory</ThemedText>
            </View>
          </View>

          {/* Tile count badge */}
          <View
            style={[
              styles.tileBadge,
              {
                backgroundColor: colorScheme === 'dark' ? colors.background : CleanPaceColors.offWhite,
                borderWidth: 1,
                borderColor: colors.border,
              },
            ]}>
            <View style={styles.statItem}>
              <ThemedText type="h2" variant="primary">
                {myTileCount}
              </ThemedText>
              <ThemedText type="caption" variant="muted">
                tiles owned
              </ThemedText>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <View style={[styles.colorDot, { backgroundColor: trailColor }]} />
              <ThemedText type="caption" variant="muted">
                your colour
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Hex territory map */}
        <TerritoryMap
          latitude={latitude}
          longitude={longitude}
          colors={colors}
          trailColor={trailColor}
          territories={territories}
          userId={userId}
        />
      </ThemedView>
    );
  }

  // ══════════════════════════════════════════════════════════
  // ── IDLE + RUNNING VIEW ───────────────────────────────────
  // ══════════════════════════════════════════════════════════
  return (
    <ThemedView style={styles.container}>
      {/* Header */}
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

        {/* Stats bar – only visible when running */}
        {mode === 'running' && (
          <Animated.View
            style={[
              styles.statsBar,
              {
                backgroundColor:
                  colorScheme === 'dark' ? colors.background : CleanPaceColors.offWhite,
                borderWidth: 1,
                borderColor: colors.primary,
                transform: [{ scale: breathScale }],
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
        )}
      </View>

      {/* Leaflet Map */}
      <RunningMap
        latitude={latitude}
        longitude={longitude}
        colors={colors}
        route={route}
        isRunning={mode === 'running'}
        trailColor={trailColor}
      />

      {/* Control Panel */}
      <View
        style={[
          styles.controlPanel,
          {
            backgroundColor: colorScheme === 'dark' ? colors.card : colors.background,
            borderTopWidth: 1,
            borderTopColor: colors.border,
          },
        ]}>
        {mode === 'idle' ? (
          <View style={styles.buttonRow}>
            {/* ── Start Run ── */}
            <TouchableOpacity
              style={[styles.startButton, { backgroundColor: colors.primary, flex: 1 }]}
              onPress={handleStartRun}
              activeOpacity={0.7}>
              <IconSymbol name="play.fill" size={22} color={CleanPaceColors.offWhite} />
              <ThemedText
                type="bodyBold"
                lightColor={CleanPaceColors.offWhite}
                darkColor={CleanPaceColors.offWhite}>
                Start Run
              </ThemedText>
            </TouchableOpacity>

            {/* ── Compete ── */}
            <TouchableOpacity
              style={[
                styles.competeButton,
                {
                  backgroundColor: colorScheme === 'dark' ? colors.background : CleanPaceColors.frostBlue,
                  borderWidth: 1.5,
                  borderColor: colors.primary,
                },
              ]}
              onPress={handleCompete}
              activeOpacity={0.7}>
              <IconSymbol name="hexagon.fill" size={20} color={colors.primary} />
              <ThemedText type="bodyBold" variant="primary">
                Compete
              </ThemedText>
            </TouchableOpacity>
          </View>
        ) : (
          /* ── Stop & Save ── */
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

      {/* Post-run share modal */}
      <PostRunModal
        visible={showPostModal}
        run={savedRun}
        onClose={() => {
          setShowPostModal(false);
          setSavedRun(null);
        }}
        onPost={() => {}}
      />
    </ThemedView>
  );
}

// ══════════════════════════════════════════════════════════════
// ── Styles ──────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: { flex: 1 },
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
  headerContent: { marginBottom: Spacing.sm },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  backBtn: {
    padding: 4,
    marginRight: 2,
  },
  statsBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderRadius: BorderRadius.card,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    marginTop: Spacing.sm,
  },
  tileBadge: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderRadius: BorderRadius.card,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    marginTop: Spacing.sm,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, height: 32 },
  colorDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginBottom: 4,
  },
  controlPanel: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
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
  competeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
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
