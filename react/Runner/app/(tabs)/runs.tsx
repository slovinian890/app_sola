import { StyleSheet, View, TouchableOpacity, FlatList, RefreshControl } from 'react-native';
import { useState, useCallback } from 'react';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors, Spacing, BorderRadius, CleanPaceColors } from '@/constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useFocusEffect } from 'expo-router';
import { getUserRuns, intervalToSeconds } from '@/services/runsService';
import { Run } from '@/services/supabase';

export default function RunsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
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

  const formatDuration = (interval: string | null): string => {
    if (!interval) return '0:00';
    const seconds = intervalToSeconds(interval);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderRun = ({ item }: { item: Run }) => (
    <View style={[styles.runCard, { 
      backgroundColor: colorScheme === 'dark' ? colors.card : colors.background,
      borderWidth: 1,
      borderColor: colors.border,
    }]}>
      <View style={styles.runHeader}>
        <View>
          <ThemedText type="bodyBold">
            {item.title || new Date(item.run_date).toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </ThemedText>
          <ThemedText type="caption" variant="muted">
            {item.run_time || new Date(item.created_at).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </ThemedText>
        </View>
      </View>

      <View style={styles.runStats}>
        <View style={styles.statItem}>
          <ThemedText type="h3" variant="primary">
            {item.distance_km.toFixed(2)}
          </ThemedText>
          <ThemedText type="caption" variant="muted">km</ThemedText>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <ThemedText type="h3" variant="primary">
            {formatDuration(item.duration)}
          </ThemedText>
          <ThemedText type="caption" variant="muted">time</ThemedText>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <ThemedText type="h3" variant="primary">
            {item.pace ?? '0:00'}
          </ThemedText>
          <ThemedText type="caption" variant="muted">pace/km</ThemedText>
        </View>
      </View>

      {(item.calories > 0 || item.elevation_m > 0) && (
        <View style={styles.extraStats}>
          {item.calories > 0 && (
            <View style={styles.extraStatItem}>
              <IconSymbol name="flame.fill" size={14} color={colors.primary} />
              <ThemedText type="caption" variant="muted">{item.calories} cal</ThemedText>
            </View>
          )}
          {item.elevation_m > 0 && (
            <View style={styles.extraStatItem}>
              <IconSymbol name="arrow.up.right" size={14} color={colors.primary} />
              <ThemedText type="caption" variant="muted">{item.elevation_m}m elev</ThemedText>
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
          <ThemedText type="body" variant="secondary">Loading...</ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { 
        backgroundColor: colorScheme === 'dark' ? colors.card : colors.backgroundSecondary,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }]}>
        <ThemedText type="h3">My Runs</ThemedText>
      </View>

      {runs.length === 0 ? (
        <View style={styles.emptyState}>
          <IconSymbol name="figure.run" size={64} color={colors.icon} />
          <ThemedText type="h3" style={styles.emptyText}>No runs yet</ThemedText>
          <ThemedText type="body" variant="muted" style={styles.emptySubtext}>
            Start tracking your runs!
          </ThemedText>
        </View>
      ) : (
        <FlatList
          data={runs}
          renderItem={renderRun}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.runsList}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
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
    alignItems: 'center',
    marginBottom: Spacing.md,
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
