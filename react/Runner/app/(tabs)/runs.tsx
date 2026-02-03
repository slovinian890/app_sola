import { StyleSheet, View, TouchableOpacity, FlatList, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors, Spacing, BorderRadius, CleanPaceColors } from '@/constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { getRuns, getSharedRuns, Run } from '@/services/dataService';
import { getProfile } from '@/services/dataService';
import ShareRunModal from '@/components/share-run-modal';

export default function RunsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [myRuns, setMyRuns] = useState<Run[]>([]);
  const [sharedRuns, setSharedRuns] = useState<Run[]>([]);
  const [activeTab, setActiveTab] = useState<'my' | 'shared'>('my');
  const [loading, setLoading] = useState(true);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [selectedRun, setSelectedRun] = useState<Run | null>(null);

  useEffect(() => {
    loadRuns();
  }, []);

  const loadRuns = async () => {
    const profile = await getProfile();
    if (profile) {
      const runs = await getRuns(profile.id);
      setMyRuns(runs.sort((a, b) => b.date - a.date));
      
      const shared = await getSharedRuns(profile.id);
      setSharedRuns(shared.sort((a, b) => b.date - a.date));
    }
    setLoading(false);
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatPace = (secondsPerKm: number): string => {
    const mins = Math.floor(secondsPerKm / 60);
    const secs = secondsPerKm % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleShareRun = (run: Run) => {
    setSelectedRun(run);
    setShareModalVisible(true);
  };

  const handleShareComplete = async () => {
    await loadRuns();
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
            {new Date(item.date).toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </ThemedText>
          <ThemedText type="caption" variant="muted">
            {new Date(item.date).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </ThemedText>
        </View>
        {item.sharedWith.length > 0 && (
          <View style={[styles.sharedBadge, { 
            backgroundColor: colorScheme === 'dark' ? colors.primary + '40' : colors.backgroundSecondary 
          }]}>
            <IconSymbol name="person.2.fill" size={14} color={colors.primary} />
            <ThemedText type="caption" variant="primary">{item.sharedWith.length}</ThemedText>
          </View>
        )}
      </View>

      <View style={styles.runStats}>
        <View style={styles.statItem}>
          <ThemedText type="h3" variant="primary">
            {item.distance.toFixed(2)}
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
            {formatPace(item.pace)}
          </ThemedText>
          <ThemedText type="caption" variant="muted">pace/km</ThemedText>
        </View>
      </View>

      {activeTab === 'my' && (
        <TouchableOpacity
          style={[styles.shareButton, { 
            backgroundColor: colorScheme === 'dark' ? colors.background : colors.backgroundSecondary,
            borderWidth: 1,
            borderColor: colors.border,
          }]}
          onPress={() => handleShareRun(item)}
          activeOpacity={0.7}>
          <IconSymbol name="square.and.arrow.up" size={18} color={colors.primary} />
          <ThemedText type="bodySmall" variant="primary">
            Share
          </ThemedText>
        </TouchableOpacity>
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

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[
            styles.tab,
            { 
              backgroundColor: colorScheme === 'dark' ? colors.background : colors.background,
              borderWidth: 1,
              borderColor: activeTab === 'my' ? colors.primary : colors.border,
            },
            activeTab === 'my' && { backgroundColor: colors.primary },
          ]}
          onPress={() => setActiveTab('my')}
          activeOpacity={0.7}>
          <ThemedText
            type="bodyBold"
            lightColor={activeTab === 'my' ? CleanPaceColors.offWhite : colors.text}
            darkColor={activeTab === 'my' ? CleanPaceColors.offWhite : colors.text}>
            My Runs
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            { 
              backgroundColor: colorScheme === 'dark' ? colors.background : colors.background,
              borderWidth: 1,
              borderColor: activeTab === 'shared' ? colors.primary : colors.border,
            },
            activeTab === 'shared' && { backgroundColor: colors.primary },
          ]}
          onPress={() => setActiveTab('shared')}
          activeOpacity={0.7}>
          <ThemedText
            type="bodyBold"
            lightColor={activeTab === 'shared' ? CleanPaceColors.offWhite : colors.text}
            darkColor={activeTab === 'shared' ? CleanPaceColors.offWhite : colors.text}>
            Shared ({sharedRuns.length})
          </ThemedText>
        </TouchableOpacity>
      </View>

      {activeTab === 'my' && myRuns.length === 0 ? (
        <View style={styles.emptyState}>
          <IconSymbol name="figure.run" size={64} color={colors.icon} />
          <ThemedText type="h3" style={styles.emptyText}>No runs yet</ThemedText>
          <ThemedText type="body" variant="muted" style={styles.emptySubtext}>Start tracking your runs!</ThemedText>
        </View>
      ) : activeTab === 'shared' && sharedRuns.length === 0 ? (
        <View style={styles.emptyState}>
          <IconSymbol name="person.2.fill" size={64} color={colors.icon} />
          <ThemedText type="h3" style={styles.emptyText}>No shared runs</ThemedText>
          <ThemedText type="body" variant="muted" style={styles.emptySubtext}>Runs shared by friends will appear here</ThemedText>
        </View>
      ) : (
        <FlatList
          data={activeTab === 'my' ? myRuns : sharedRuns}
          renderItem={renderRun}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.runsList}
          showsVerticalScrollIndicator={false}
        />
      )}

      <ShareRunModal
        visible={shareModalVisible}
        run={selectedRun}
        onClose={() => {
          setShareModalVisible(false);
          setSelectedRun(null);
        }}
        onShare={handleShareComplete}
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
  },
  header: {
    paddingTop: 60,
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  tabs: {
    flexDirection: 'row',
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.card,
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
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sharedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.small,
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
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.small,
    marginTop: Spacing.xs,
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

