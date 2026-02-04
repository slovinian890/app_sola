import { StyleSheet, View, ActivityIndicator, TouchableOpacity, Alert, Animated } from 'react-native';
import { useEffect, useState, useRef } from 'react';
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

// Helper function to calculate distance between two coordinates (Haversine formula)
const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Radius of the Earth in km
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
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [distance, setDistance] = useState(0); // in km
  const [duration, setDuration] = useState(0); // in seconds
  const [startTime, setStartTime] = useState<number | null>(null);
  const [route, setRoute] = useState<Array<{ latitude: number; longitude: number }>>([]);
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastLocationRef = useRef<{ latitude: number; longitude: number } | null>(null);
  const [showPostModal, setShowPostModal] = useState(false);
  const [savedRun, setSavedRun] = useState<Run | null>(null);

  // Breathing animation for active timer
  const breathScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isRunning) {
      // Start breathing pulse animation when running
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

  useEffect(() => {
    (async () => {
      try {
        // Request location permissions
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setErrorMsg('Permission to access location was denied');
          setLoading(false);
          return;
        }

        // Get current location
        const currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        setLocation(currentLocation);
        setLoading(false);
      } catch (error) {
        setErrorMsg('Error getting location');
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (isRunning && startTime) {
      // Update duration every second
      intervalRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);

      // Start location tracking
      Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 1000,
          distanceInterval: 5,
        },
        (newLocation) => {
          const { latitude, longitude } = newLocation.coords;
          setLocation(newLocation);
          
          // Calculate distance
          if (lastLocationRef.current) {
            const segmentDistance = calculateDistance(
              lastLocationRef.current.latitude,
              lastLocationRef.current.longitude,
              latitude,
              longitude
            );
            setDistance((prev) => prev + segmentDistance);
          }
          
          lastLocationRef.current = { latitude, longitude };
          setRoute((prev) => [...prev, { latitude, longitude }]);
        }
      ).then((subscription) => {
        locationSubscription.current = subscription;
      });
    } else {
      // Clean up
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (locationSubscription.current) {
        locationSubscription.current.remove();
        locationSubscription.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }
    };
  }, [isRunning, startTime]);

  const colors = Colors[colorScheme ?? 'light'];

  const handleStartRun = () => {
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
  };

  const handleStopRun = async () => {
    setIsRunning(false);
    
    if (duration < 10 || distance < 0.01) {
      Alert.alert('Run too short', 'Please run for at least a few seconds to save.');
      return;
    }

    const user = await getCurrentUser();
    if (!user) {
      Alert.alert('Error', 'Please sign in to save your run');
      return;
    }

    const pace = calculatePace(distance, duration);
    const durationInterval = secondsToInterval(duration);
    
    const routeData: RouteData = {
      coordinates: route.map(r => ({ latitude: r.latitude, longitude: r.longitude })),
      startLocation: route[0] ? { latitude: route[0].latitude, longitude: route[0].longitude } : undefined,
      endLocation: route[route.length - 1] ? { latitude: route[route.length - 1].latitude, longitude: route[route.length - 1].longitude } : undefined,
    };

    const result = await createRun({
      run_date: new Date().toISOString().split('T')[0],
      run_time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      distance_km: Math.round(distance * 100) / 100,
      duration: durationInterval,
      pace,
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
              newAchievements.map(a => a.title).join(', ')
            );
          }
        }
        
        setSavedRun(run);
        setShowPostModal(true);
      }

      if (result.queued) {
        Alert.alert('Run Saved Offline', 'Your run will be synced when you\'re back online.');
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
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
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

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <ThemedText type="body" variant="secondary" style={styles.loadingText}>
            Getting your location...
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  if (errorMsg) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.errorContainer}>
          <IconSymbol name="exclamationmark.triangle.fill" size={48} color={colors.primary} />
          <ThemedText type="body" variant="secondary" style={styles.errorText}>
            {errorMsg}
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  if (!location) {
    return null;
  }

  const { latitude, longitude } = location.coords;

  return (
    <ThemedView style={styles.container}>
      {/* Header with stats */}
      <View style={[styles.header, { 
        backgroundColor: colorScheme === 'dark' ? colors.card : colors.backgroundSecondary,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }]}>
        <View style={styles.headerContent}>
          <View style={styles.headerTitleContainer}>
            <IconSymbol name="figure.run" size={28} color={colors.primary} />
            <ThemedText type="h3" style={styles.headerTitle}>Run Tracker</ThemedText>
          </View>
        </View>
        
        {/* Stats container with breathing animation when running */}
        <Animated.View 
          style={[
            styles.statsContainer,
            {
              backgroundColor: colorScheme === 'dark' ? colors.background : CleanPaceColors.offWhite,
              borderWidth: 1,
              borderColor: colors.border,
              transform: isRunning ? [{ scale: breathScale }] : [],
            }
          ]}
        >
          <View style={styles.statItem}>
            <ThemedText type="h2" variant="primary">{distance.toFixed(2)}</ThemedText>
            <ThemedText type="caption" variant="muted">km</ThemedText>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <ThemedText type="h2" variant="primary">{formatDuration(duration)}</ThemedText>
            <ThemedText type="caption" variant="muted">time</ThemedText>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <ThemedText type="h2" variant="primary">{pace}</ThemedText>
            <ThemedText type="caption" variant="muted">pace</ThemedText>
          </View>
        </Animated.View>
      </View>

      {/* Map */}
      <RunningMap latitude={latitude} longitude={longitude} colors={colors} />

      {/* Control Panel */}
      <View style={[styles.controlPanel, { 
        backgroundColor: colorScheme === 'dark' ? colors.card : colors.background,
        borderTopWidth: 1,
        borderTopColor: colors.border,
      }]}>
        {!isRunning ? (
          <TouchableOpacity
            style={[styles.startButton, { backgroundColor: colors.primary }]}
            onPress={handleStartRun}
            activeOpacity={0.7}>
            <IconSymbol name="play.fill" size={22} color={CleanPaceColors.offWhite} />
            <ThemedText 
              type="bodyBold" 
              lightColor={CleanPaceColors.offWhite} 
              darkColor={CleanPaceColors.offWhite}
            >
              Start Run
            </ThemedText>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.stopButton, { 
              backgroundColor: colors.background,
              borderWidth: 1,
              borderColor: colors.primary,
            }]}
            onPress={handleStopRun}
            activeOpacity={0.7}>
            <IconSymbol name="stop.fill" size={22} color={colors.primary} />
            <ThemedText type="bodyBold" variant="primary">Stop Run</ThemedText>
          </TouchableOpacity>
        )}
      </View>

      <PostRunModal
        visible={showPostModal}
        run={savedRun}
        onClose={() => {
          setShowPostModal(false);
          setSavedRun(null);
        }}
        onPost={() => {
          // Run posted successfully
        }}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
  },
  loadingText: {},
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
  },
  errorText: {
    textAlign: 'center',
  },
  header: {
    paddingTop: 60,
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  headerContent: {
    marginBottom: Spacing.md,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerTitle: {},
  statsContainer: {
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
