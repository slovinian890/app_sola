import { StyleSheet, View, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { Image } from 'expo-image';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors, Spacing, BorderRadius, CleanPaceColors } from '@/constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getProfileById } from '@/services/profileService';
import { getUserStats } from '@/services/statsService';
import { followUser, unfollowUser, isFollowing, getFollowerCount, getFollowingCount } from '@/services/socialService';
import { Profile, UserStats } from '@/services/supabase';

export default function UserProfileScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  const { userId } = useLocalSearchParams<{ userId: string }>();
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFollowingUser, setIsFollowingUser] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (userId) {
      loadProfileData();
    }
  }, [userId]);

  const loadProfileData = async () => {
    if (!userId) return;
    
    try {
      setLoading(true);
      const [profileResult, statsResult, following, fCount, fgCount] = await Promise.all([
        getProfileById(userId),
        getUserStats(userId),
        isFollowing(userId),
        getFollowerCount(userId),
        getFollowingCount(userId),
      ]);

      if (profileResult.success && profileResult.profile) {
        setProfile(profileResult.profile);
      }

      if (statsResult.success && statsResult.stats) {
        setStats(statsResult.stats);
      }

      setIsFollowingUser(following);
      setFollowerCount(fCount);
      setFollowingCount(fgCount);
    } catch (error) {
      console.error('Error loading profile:', error);
      Alert.alert('Error', 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleFollowToggle = async () => {
    if (!userId) return;
    
    setActionLoading(true);
    const result = isFollowingUser ? await unfollowUser(userId) : await followUser(userId);
    setActionLoading(false);

    if (result.success) {
      setIsFollowingUser(!isFollowingUser);
      setFollowerCount(prev => isFollowingUser ? prev - 1 : prev + 1);
    } else {
      Alert.alert('Error', result.error || 'Failed to update follow status');
    }
  };

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ThemedText type="body" variant="secondary">Loading...</ThemedText>
        </View>
      </ThemedView>
    );
  }

  if (!profile) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.errorContainer}>
          <ThemedText type="body" variant="secondary">Profile not found</ThemedText>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.primary }]}
            onPress={() => router.back()}
            activeOpacity={0.7}>
            <ThemedText type="bodyBold" lightColor={CleanPaceColors.offWhite} darkColor={CleanPaceColors.offWhite}>
              Go Back
            </ThemedText>
          </TouchableOpacity>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      {/* Header with back button */}
      <View style={[styles.header, { 
        backgroundColor: colorScheme === 'dark' ? colors.card : colors.backgroundSecondary,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButtonIcon}>
          <IconSymbol name="chevron.left" size={24} color={colors.text} />
        </TouchableOpacity>
        <ThemedText type="h3">Profile</ThemedText>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.profileSection}>
          {/* Profile Picture */}
          <View style={styles.imageContainer}>
            {profile.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.profileImage} />
            ) : (
              <View style={[styles.profileImagePlaceholder, { backgroundColor: colors.backgroundSecondary }]}>
                <IconSymbol name="person.fill" size={48} color={colors.primary} />
              </View>
            )}
          </View>

          {/* User Info */}
          <ThemedText type="h2" style={styles.displayName}>
            {profile.display_name || profile.username}
          </ThemedText>
          <ThemedText type="body" variant="muted" style={styles.username}>
            @{profile.username}
          </ThemedText>

          {/* Location */}
          {profile.location && (
            <View style={styles.locationContainer}>
              <IconSymbol name="location.fill" size={16} color={colors.icon} />
              <ThemedText type="body" variant="muted" style={styles.locationText}>
                {profile.location}
              </ThemedText>
            </View>
          )}

          {/* Bio */}
          {profile.bio && (
            <ThemedText type="body" style={styles.bio}>
              {profile.bio}
            </ThemedText>
          )}

          {/* Follow/Following Stats */}
          <View style={styles.followStats}>
            <View style={styles.followStatItem}>
              <ThemedText type="h3" variant="primary">{followingCount}</ThemedText>
              <ThemedText type="bodySmall" variant="muted">Following</ThemedText>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.followStatItem}>
              <ThemedText type="h3" variant="primary">{followerCount}</ThemedText>
              <ThemedText type="bodySmall" variant="muted">Followers</ThemedText>
            </View>
          </View>

          {/* Follow Button */}
          <TouchableOpacity
            style={[
              styles.followButton,
              {
                backgroundColor: isFollowingUser ? colors.backgroundSecondary : colors.primary,
                borderWidth: 1,
                borderColor: isFollowingUser ? colors.border : colors.primary,
              },
              actionLoading && { opacity: 0.6 }
            ]}
            onPress={handleFollowToggle}
            activeOpacity={0.7}
            disabled={actionLoading}>
            <ThemedText
              type="bodyBold"
              lightColor={isFollowingUser ? colors.text : CleanPaceColors.offWhite}
              darkColor={isFollowingUser ? colors.text : CleanPaceColors.offWhite}>
              {actionLoading ? 'Loading...' : isFollowingUser ? 'Following' : 'Follow'}
            </ThemedText>
          </TouchableOpacity>
        </View>

        {/* Stats Section */}
        <View style={styles.statsSection}>
          <ThemedText type="h3" style={styles.sectionTitle}>Stats</ThemedText>
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { 
              backgroundColor: colorScheme === 'dark' ? colors.card : colors.backgroundSecondary,
              borderWidth: 1,
              borderColor: colors.border,
            }]}>
              <ThemedText type="h2" variant="primary">{stats?.total_runs ?? 0}</ThemedText>
              <ThemedText type="bodySmall" variant="muted">Total Runs</ThemedText>
            </View>
            <View style={[styles.statCard, { 
              backgroundColor: colorScheme === 'dark' ? colors.card : colors.backgroundSecondary,
              borderWidth: 1,
              borderColor: colors.border,
            }]}>
              <ThemedText type="h2" variant="primary">{stats?.total_distance_km?.toFixed(1) ?? '0.0'}</ThemedText>
              <ThemedText type="bodySmall" variant="muted">Total Distance (km)</ThemedText>
            </View>
          </View>
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { 
              backgroundColor: colorScheme === 'dark' ? colors.card : colors.backgroundSecondary,
              borderWidth: 1,
              borderColor: colors.border,
            }]}>
              <ThemedText type="h2" variant="primary">{stats?.current_streak ?? 0}</ThemedText>
              <ThemedText type="bodySmall" variant="muted">Current Streak</ThemedText>
            </View>
            <View style={[styles.statCard, { 
              backgroundColor: colorScheme === 'dark' ? colors.card : colors.backgroundSecondary,
              borderWidth: 1,
              borderColor: colors.border,
            }]}>
              <ThemedText type="h2" variant="primary">{stats?.best_pace ?? '--'}</ThemedText>
              <ThemedText type="bodySmall" variant="muted">Best Pace</ThemedText>
            </View>
          </View>
        </View>
      </ScrollView>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  backButtonIcon: {
    padding: Spacing.xs,
  },
  backButton: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.card,
    marginTop: Spacing.md,
  },
  content: {
    flex: 1,
    padding: Spacing.md,
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  imageContainer: {
    marginBottom: Spacing.md,
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileImage: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 3,
    borderColor: CleanPaceColors.offWhite,
  },
  profileImagePlaceholder: {
    width: 110,
    height: 110,
    borderRadius: 55,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: CleanPaceColors.offWhite,
  },
  displayName: {
    marginBottom: Spacing.xs,
  },
  username: {
    marginBottom: Spacing.sm,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  locationText: {
    fontSize: 14,
  },
  bio: {
    textAlign: 'center',
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  followStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    marginBottom: Spacing.md,
  },
  followStatItem: {
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 30,
  },
  followButton: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.card,
    minWidth: 150,
    alignItems: 'center',
  },
  statsSection: {
    marginTop: Spacing.md,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  statCard: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.card,
    alignItems: 'center',
  },
});
