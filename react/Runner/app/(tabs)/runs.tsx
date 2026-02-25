import { StyleSheet, View, TouchableOpacity, FlatList, RefreshControl } from 'react-native';
import { useState, useCallback } from 'react';
import { WebView } from 'react-native-webview';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors, Spacing, BorderRadius, CleanPaceColors } from '@/constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useFocusEffect } from 'expo-router';
import { getUserRuns, intervalToSeconds, deleteRun } from '@/services/runsService';
import { Run, RouteData } from '@/services/supabase';

import { DEFAULT_TRAIL_COLOR } from '@/services/trailColorService';

// Generate a mini Leaflet map showing the run route
const generateRoutePreviewHTML = (routeData: RouteData, isDark: boolean): string => {
  const coords = routeData.coordinates || [];
  if (coords.length === 0) return '';

  const lineColor = routeData.trailColor || DEFAULT_TRAIL_COLOR;

  const tileUrl = isDark
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

  const coordsJSON = JSON.stringify(coords.map(c => [c.latitude, c.longitude]));

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; }
    html, body { width: 100%; height: 100%; overflow: hidden; }
    #map { width: 100%; height: 100%; }
    .leaflet-control-attribution { display: none !important; }
    .leaflet-control-zoom { display: none !important; }
    .start-dot { width: 8px; height: 8px; border-radius: 50%; background: #4CAF50; border: 2px solid #fff; }
    .end-dot { width: 8px; height: 8px; border-radius: 50%; background: #F44336; border: 2px solid #fff; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var coords = ${coordsJSON};
    var map = L.map('map', {
      zoomControl: false,
      attributionControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      touchZoom: false,
      boxZoom: false,
      keyboard: false
    });

    L.tileLayer('${tileUrl}', { maxZoom: 19, subdomains: 'abcd' }).addTo(map);

    if (coords.length > 0) {
      // Glow line
      L.polyline(coords, { color: '${lineColor}', weight: 8, opacity: 0.2 }).addTo(map);
      // Main trail line
      var line = L.polyline(coords, { color: '${lineColor}', weight: 4, opacity: 0.9 }).addTo(map);
      
      var startIcon = L.divIcon({ className: 'start-dot', iconSize: [8,8], iconAnchor: [4,4] });
      var endIcon = L.divIcon({ className: 'end-dot', iconSize: [8,8], iconAnchor: [4,4] });
      
      L.marker(coords[0], { icon: startIcon }).addTo(map);
      L.marker(coords[coords.length-1], { icon: endIcon }).addTo(map);
      
      map.fitBounds(line.getBounds(), { padding: [15, 15] });
    }
  </script>
</body>
</html>`;
};

export default function RunsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadRuns();
    }, [])
  );

  const loadRuns = async () => {
    try {
      const result = await getUserRuns();
      setRuns(result.data);
    } catch (error) {
      console.error('Error loading runs:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadRuns();
  };

  const handleDeleteRun = async (runId: string) => {
    const result = await deleteRun(runId);
    if (result.success) {
      setRuns((prev) => prev.filter((r) => r.id !== runId));
    }
  };

  const formatDuration = (interval: string | null): string => {
    if (!interval) return '0:00';
    const seconds = intervalToSeconds(interval);
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderRoutePreview = (routeData: RouteData | null) => {
    if (!routeData || !routeData.coordinates || routeData.coordinates.length < 2) {
      return null;
    }

    const html = generateRoutePreviewHTML(routeData, isDark);
    if (!html) return null;

    return (
      <View style={styles.routePreview}>
        <WebView
          source={{ html }}
          style={styles.routeWebView}
          scrollEnabled={false}
          originWhitelist={['*']}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          cacheEnabled={true}
          onShouldStartLoadWithRequest={(request) => {
            return request.url.startsWith('about:') || request.url.startsWith('data:');
          }}
        />
      </View>
    );
  };

  const renderRun = ({ item }: { item: Run }) => (
    <View
      style={[
        styles.runCard,
        {
          backgroundColor: isDark ? colors.card : colors.background,
          borderWidth: 1,
          borderColor: colors.border,
        },
      ]}>
      {/* Header: date & delete */}
      <View style={styles.runHeader}>
        <View style={{ flex: 1 }}>
          <ThemedText type="bodyBold">
            {item.title ||
              new Date(item.run_date).toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
          </ThemedText>
          <ThemedText type="caption" variant="muted">
            {item.run_time ||
              new Date(item.created_at).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
              })}
          </ThemedText>
        </View>
        <TouchableOpacity
          onPress={() =>
            require('react-native').Alert.alert('Delete Run', 'Are you sure?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Delete', style: 'destructive', onPress: () => handleDeleteRun(item.id) },
            ])
          }
          style={styles.deleteButton}>
          <IconSymbol name="trash" size={16} color={colors.icon} />
        </TouchableOpacity>
      </View>

      {/* Route mini-map */}
      {renderRoutePreview(item.route_data)}

      {/* Stats row */}
      <View style={styles.runStats}>
        <View style={styles.statItem}>
          <ThemedText type="h3" variant="primary">
            {Number(item.distance_km).toFixed(2)}
          </ThemedText>
          <ThemedText type="caption" variant="muted">
            km
          </ThemedText>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <ThemedText type="h3" variant="primary">
            {formatDuration(item.duration)}
          </ThemedText>
          <ThemedText type="caption" variant="muted">
            time
          </ThemedText>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <ThemedText type="h3" variant="primary">
            {item.pace ?? '0:00'}
          </ThemedText>
          <ThemedText type="caption" variant="muted">
            pace/km
          </ThemedText>
        </View>
      </View>

      {/* Extra info */}
      {(item.calories > 0 || item.elevation_m > 0) && (
        <View style={styles.extraStats}>
          {item.calories > 0 && (
            <View style={styles.extraStatItem}>
              <IconSymbol name="flame.fill" size={14} color={colors.primary} />
              <ThemedText type="caption" variant="muted">
                {item.calories} cal
              </ThemedText>
            </View>
          )}
          {item.elevation_m > 0 && (
            <View style={styles.extraStatItem}>
              <IconSymbol name="arrow.up.right" size={14} color={colors.primary} />
              <ThemedText type="caption" variant="muted">
                {item.elevation_m}m elev
              </ThemedText>
            </View>
          )}
        </View>
      )}

      {item.notes && (
        <ThemedText type="bodySmall" variant="muted" style={styles.notes}>
          {item.notes}
        </ThemedText>
      )}
    </View>
  );

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ThemedText type="body" variant="secondary">
            Loading...
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View
        style={[
          styles.header,
          {
            backgroundColor: isDark ? colors.card : colors.backgroundSecondary,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          },
        ]}>
        <View style={styles.headerRow}>
          <ThemedText type="h3">My Runs</ThemedText>
          <ThemedText type="caption" variant="muted">
            {runs.length} {runs.length === 1 ? 'run' : 'runs'}
          </ThemedText>
        </View>
      </View>

      {runs.length === 0 ? (
        <View style={styles.emptyState}>
          <IconSymbol name="figure.run" size={64} color={colors.icon} />
          <ThemedText type="h3" style={styles.emptyText}>
            No runs yet
          </ThemedText>
          <ThemedText type="body" variant="muted" style={styles.emptySubtext}>
            Go to the Run tab and start tracking!
          </ThemedText>
        </View>
      ) : (
        <FlatList
          data={runs}
          renderItem={renderRun}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.runsList}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        />
      )}
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
  },
  header: {
    paddingTop: 60,
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  runsList: {
    padding: Spacing.md,
  },
  runCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.card,
    marginBottom: Spacing.sm,
  },
  runHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  deleteButton: {
    padding: Spacing.xs,
  },
  routePreview: {
    height: 140,
    borderRadius: BorderRadius.small,
    overflow: 'hidden',
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: '#ECECEC',
  },
  routeWebView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  runStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 32,
  },
  extraStats: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.xs,
  },
  extraStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  notes: {
    marginTop: Spacing.sm,
    fontStyle: 'italic',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  emptyText: {
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  emptySubtext: {
    textAlign: 'center',
  },
});
