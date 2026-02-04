import { StyleSheet, View, TouchableOpacity, FlatList, Alert, RefreshControl } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { Image } from 'expo-image';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors, Spacing, BorderRadius } from '@/constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useFocusEffect } from 'expo-router';
import { getFeedPosts, toggleLike } from '@/services/socialService';
import { getCurrentUser } from '@/services/authService';
import { PostWithAuthor } from '@/services/supabase';
import { intervalToSeconds } from '@/services/runsService';

export default function FeedScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [posts, setPosts] = useState<PostWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    loadUser();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadPosts();
    }, [])
  );

  const loadUser = async () => {
    const user = await getCurrentUser();
    if (user) {
      setCurrentUserId(user.id);
    }
  };

  const loadPosts = async () => {
    try {
      const result = await getFeedPosts({ page: 1, limit: 20 });
      setPosts(result.data);
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadPosts();
  };

  const handleLike = async (post: PostWithAuthor) => {
    if (!currentUserId) {
      Alert.alert('Error', 'Please sign in to like posts');
      return;
    }

    const result = await toggleLike(post.id);
    if (result.success) {
      // Update local state
      setPosts(prev => prev.map(p => {
        if (p.id === post.id) {
          return {
            ...p,
            is_liked: result.liked,
            likes_count: result.liked ? (p.likes_count ?? 0) + 1 : Math.max(0, (p.likes_count ?? 0) - 1),
          };
        }
        return p;
      }));
    }
  };

  const formatDuration = (interval: string | null): string => {
    if (!interval) return '0:00';
    const seconds = intervalToSeconds(interval);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTimeAgo = (timestamp: string): string => {
    const date = new Date(timestamp);
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const renderPost = ({ item }: { item: PostWithAuthor }) => (
    <View style={[styles.postCard, { 
      backgroundColor: colorScheme === 'dark' ? colors.card : colors.background,
      borderWidth: 1,
      borderColor: colors.border,
    }]}>
      <View style={styles.postHeader}>
        <View style={styles.userInfo}>
          {item.profiles?.avatar_url ? (
            <Image source={{ uri: item.profiles.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: colors.backgroundSecondary }]}>
              <IconSymbol name="person.fill" size={20} color={colors.primary} />
            </View>
          )}
          <View style={styles.userDetails}>
            <ThemedText type="bodyBold">
              {item.profiles?.display_name || item.profiles?.username || 'Unknown'}
            </ThemedText>
            <ThemedText type="caption" variant="muted">{formatTimeAgo(item.created_at)}</ThemedText>
          </View>
        </View>
      </View>

      {item.content && (
        <ThemedText type="body" style={styles.description}>{item.content}</ThemedText>
      )}

      {item.runs && (
        <View style={[styles.runStats, { 
          backgroundColor: colorScheme === 'dark' ? colors.background : colors.backgroundSecondary,
          borderWidth: 1,
          borderColor: colors.border,
        }]}>
          <View style={styles.statItem}>
            <ThemedText type="h3" variant="primary">
              {item.runs.distance_km?.toFixed(2) ?? '0.00'}
            </ThemedText>
            <ThemedText type="caption" variant="muted">km</ThemedText>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <ThemedText type="h3" variant="primary">
              {formatDuration(item.runs.duration)}
            </ThemedText>
            <ThemedText type="caption" variant="muted">time</ThemedText>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <ThemedText type="h3" variant="primary">
              {item.runs.pace ?? '0:00'}
            </ThemedText>
            <ThemedText type="caption" variant="muted">pace/km</ThemedText>
          </View>
        </View>
      )}

      <View style={[styles.postActions, { borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleLike(item)}
          activeOpacity={0.7}>
          <IconSymbol
            name={item.is_liked ? "heart.fill" : "heart"}
            size={20}
            color={item.is_liked ? colors.primary : colors.icon}
          />
          <ThemedText
            type="bodySmall"
            variant={item.is_liked ? "primary" : "muted"}>
            {item.likes_count ?? 0}
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} activeOpacity={0.7}>
          <IconSymbol name="bubble.left" size={20} color={colors.icon} />
          <ThemedText type="bodySmall" variant="muted">
            {item.comments_count ?? 0}
          </ThemedText>
        </TouchableOpacity>
      </View>
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
        <ThemedText type="h3">Feed</ThemedText>
      </View>

      {posts.length === 0 ? (
        <View style={styles.emptyState}>
          <IconSymbol name="newspaper.fill" size={64} color={colors.icon} />
          <ThemedText type="h3" style={styles.emptyText}>No posts yet</ThemedText>
          <ThemedText type="body" variant="muted" style={styles.emptySubtext}>
            Complete a run and post it to see it here!
          </ThemedText>
        </View>
      ) : (
        <FlatList
          data={posts}
          renderItem={renderPost}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.postsList}
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
  postsList: {
    padding: Spacing.md,
  },
  postCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.card,
    marginBottom: Spacing.md,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: Spacing.sm,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  userDetails: {
    flex: 1,
  },
  description: {
    marginBottom: Spacing.sm,
  },
  runStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
    borderRadius: BorderRadius.small,
    marginBottom: Spacing.sm,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 24,
  },
  postActions: {
    flexDirection: 'row',
    paddingTop: Spacing.xs,
    borderTopWidth: 1,
    gap: Spacing.lg,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: 4,
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
