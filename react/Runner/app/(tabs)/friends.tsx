import { StyleSheet, View, TextInput, TouchableOpacity, Alert, FlatList, RefreshControl } from 'react-native';
import { useState, useCallback } from 'react';
import { Image } from 'expo-image';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors, Spacing, BorderRadius, CleanPaceColors } from '@/constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useFocusEffect } from 'expo-router';
import { 
  getFollowing, 
  getFollowers,
  unfollowUser, 
  followUser,
  getFollowerCount,
  getFollowingCount,
} from '@/services/socialService';
import { searchProfiles } from '@/services/profileService';
import { getCurrentUser } from '@/services/authService';
import { Profile } from '@/services/supabase';

type TabType = 'following' | 'followers' | 'search';

export default function FriendsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [following, setFollowing] = useState<Profile[]>([]);
  const [followers, setFollowers] = useState<Profile[]>([]);
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('following');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [followingCount, setFollowingCount] = useState(0);
  const [followerCount, setFollowerCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      const user = await getCurrentUser();
      if (user) {
        setCurrentUserId(user.id);
        
        const [followingResult, followersResult, fCount, fgCount] = await Promise.all([
          getFollowing(user.id),
          getFollowers(user.id),
          getFollowerCount(user.id),
          getFollowingCount(user.id),
        ]);
        
        setFollowing(followingResult.data);
        setFollowers(followersResult.data);
        setFollowerCount(fCount);
        setFollowingCount(fgCount);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const result = await searchProfiles(searchQuery.trim());
    if (result.success && result.profiles) {
      // Filter out current user
      const filtered = result.profiles.filter(p => p.id !== currentUserId);
      setSearchResults(filtered);
    }
  };

  const handleFollow = async (userId: string) => {
    const result = await followUser(userId);
    if (result.success) {
      Alert.alert('Success', 'You are now following this user!');
      loadData();
    } else {
      Alert.alert('Error', result.error || 'Failed to follow user');
    }
  };

  const handleUnfollow = (userId: string, username: string) => {
    Alert.alert(
      'Unfollow',
      `Are you sure you want to unfollow ${username}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unfollow',
          style: 'destructive',
          onPress: async () => {
            const result = await unfollowUser(userId);
            if (result.success) {
              loadData();
            } else {
              Alert.alert('Error', result.error || 'Failed to unfollow user');
            }
          },
        },
      ]
    );
  };

  const isFollowingUser = (userId: string) => {
    return following.some(f => f.id === userId);
  };

  const renderUser = ({ item }: { item: Profile }) => {
    const isFollowed = isFollowingUser(item.id);
    
    return (
      <View style={[styles.userCard, { 
        backgroundColor: colorScheme === 'dark' ? colors.card : colors.background,
        borderWidth: 1,
        borderColor: colors.border,
      }]}>
        <View style={styles.userInfo}>
          {item.avatar_url ? (
            <Image source={{ uri: item.avatar_url }} style={styles.userAvatar} />
          ) : (
            <View style={[styles.userAvatarPlaceholder, { backgroundColor: colors.backgroundSecondary }]}>
              <IconSymbol name="person.fill" size={24} color={colors.primary} />
            </View>
          )}
          <View style={styles.userDetails}>
            <ThemedText type="bodyBold">{item.display_name || item.username}</ThemedText>
            <ThemedText type="caption" variant="muted">@{item.username}</ThemedText>
          </View>
        </View>
        
        {activeTab === 'following' ? (
          <TouchableOpacity
            onPress={() => handleUnfollow(item.id, item.username)}
            style={[styles.actionButton, { 
              backgroundColor: colorScheme === 'dark' ? colors.background : colors.backgroundSecondary,
              borderWidth: 1,
              borderColor: colors.border,
            }]}
            activeOpacity={0.7}>
            <ThemedText type="bodySmall" variant="muted">Unfollow</ThemedText>
          </TouchableOpacity>
        ) : activeTab === 'search' ? (
          <TouchableOpacity
            onPress={() => isFollowed ? handleUnfollow(item.id, item.username) : handleFollow(item.id)}
            style={[
              styles.actionButton, 
              { 
                backgroundColor: isFollowed ? colors.backgroundSecondary : colors.primary,
                borderWidth: 1,
                borderColor: isFollowed ? colors.border : colors.primary,
              }
            ]}
            activeOpacity={0.7}>
            <ThemedText 
              type="bodySmall" 
              lightColor={isFollowed ? colors.text : CleanPaceColors.offWhite}
              darkColor={isFollowed ? colors.text : CleanPaceColors.offWhite}>
              {isFollowed ? 'Following' : 'Follow'}
            </ThemedText>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  };

  const getListData = () => {
    switch (activeTab) {
      case 'following':
        return following;
      case 'followers':
        return followers;
      case 'search':
        return searchResults;
      default:
        return [];
    }
  };

  const getEmptyMessage = () => {
    switch (activeTab) {
      case 'following':
        return "You're not following anyone yet";
      case 'followers':
        return "You don't have any followers yet";
      case 'search':
        return searchQuery ? 'No users found' : 'Search for users';
      default:
        return '';
    }
  };

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { 
        backgroundColor: colorScheme === 'dark' ? colors.card : colors.backgroundSecondary,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }]}>
        <ThemedText type="h3">Social</ThemedText>
        <View style={styles.statsRow}>
          <ThemedText type="bodySmall" variant="muted">
            {followingCount} Following · {followerCount} Followers
          </ThemedText>
        </View>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[
            styles.tab,
            { 
              borderWidth: 1,
              borderColor: activeTab === 'following' ? colors.primary : colors.border,
              backgroundColor: activeTab === 'following' ? colors.primary : colors.background,
            },
          ]}
          onPress={() => setActiveTab('following')}
          activeOpacity={0.7}>
          <ThemedText
            type="bodyBold"
            lightColor={activeTab === 'following' ? CleanPaceColors.offWhite : colors.text}
            darkColor={activeTab === 'following' ? CleanPaceColors.offWhite : colors.text}>
            Following
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            { 
              borderWidth: 1,
              borderColor: activeTab === 'followers' ? colors.primary : colors.border,
              backgroundColor: activeTab === 'followers' ? colors.primary : colors.background,
            },
          ]}
          onPress={() => setActiveTab('followers')}
          activeOpacity={0.7}>
          <ThemedText
            type="bodyBold"
            lightColor={activeTab === 'followers' ? CleanPaceColors.offWhite : colors.text}
            darkColor={activeTab === 'followers' ? CleanPaceColors.offWhite : colors.text}>
            Followers
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            { 
              borderWidth: 1,
              borderColor: activeTab === 'search' ? colors.primary : colors.border,
              backgroundColor: activeTab === 'search' ? colors.primary : colors.background,
            },
          ]}
          onPress={() => setActiveTab('search')}
          activeOpacity={0.7}>
          <IconSymbol 
            name="magnifyingglass" 
            size={18} 
            color={activeTab === 'search' ? CleanPaceColors.offWhite : colors.text} 
          />
        </TouchableOpacity>
      </View>

      {activeTab === 'search' && (
        <View style={[styles.searchSection, { borderBottomColor: colors.border }]}>
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.input, {
                backgroundColor: colorScheme === 'dark' ? colors.card : colors.background,
                borderColor: colors.border,
                color: colors.text,
              }]}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search by username"
              placeholderTextColor={colors.textMuted}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
            <TouchableOpacity
              style={[styles.searchButton, { backgroundColor: colors.primary }]}
              onPress={handleSearch}
              activeOpacity={0.7}>
              <IconSymbol name="magnifyingglass" size={20} color={CleanPaceColors.offWhite} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ThemedText type="body" variant="secondary">Loading...</ThemedText>
        </View>
      ) : getListData().length === 0 ? (
        <View style={styles.emptyState}>
          <IconSymbol name="person.2.fill" size={64} color={colors.icon} />
          <ThemedText type="h3" style={styles.emptyText}>{getEmptyMessage()}</ThemedText>
        </View>
      ) : (
        <FlatList
          data={getListData()}
          renderItem={renderUser}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.usersList}
          showsVerticalScrollIndicator={false}
          refreshControl={
            activeTab !== 'search' ? (
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
            ) : undefined
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
  header: {
    paddingTop: 60,
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  statsRow: {
    marginTop: Spacing.xs,
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
    justifyContent: 'center',
  },
  searchSection: {
    padding: Spacing.md,
    paddingTop: 0,
    borderBottomWidth: 1,
  },
  inputRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: BorderRadius.card,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    fontSize: 16,
  },
  searchButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  usersList: {
    padding: Spacing.md,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderRadius: BorderRadius.card,
    marginBottom: Spacing.sm,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: Spacing.sm,
  },
  userAvatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  userDetails: {
    flex: 1,
  },
  actionButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.small,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  emptyText: {
    marginTop: Spacing.md,
    textAlign: 'center',
  },
});
