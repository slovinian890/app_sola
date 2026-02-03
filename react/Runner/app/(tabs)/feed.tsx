import { StyleSheet, View, TouchableOpacity, FlatList, TextInput, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { Image } from 'expo-image';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors, Spacing, BorderRadius, CleanPaceColors } from '@/constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { getPosts, toggleLikePost, Post, getProfile } from '@/services/dataService';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

export default function FeedScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadPosts();
    }, [currentUserId])
  );

  const loadProfile = async () => {
    const profile = await getProfile();
    if (profile) {
      setCurrentUserId(profile.id);
    }
  };

  const loadPosts = async () => {
    const allPosts = await getPosts();
    // Mark which posts are liked by current user
    const postsWithLikes = allPosts.map(post => ({
      ...post,
      likedByCurrentUser: currentUserId ? post.likes.includes(currentUserId) : false,
    }));
    setPosts(postsWithLikes.sort((a, b) => b.date - a.date));
    setLoading(false);
  };

  const handleLike = async (post: Post) => {
    if (!currentUserId) {
      Alert.alert('Error', 'Please set up your profile first');
      return;
    }

    await toggleLikePost(post.id, currentUserId);
    await loadPosts();
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

  const formatTimeAgo = (timestamp: number): string => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const renderPost = ({ item }: { item: Post }) => (
    <View style={[styles.postCard, { 
      backgroundColor: colorScheme === 'dark' ? colors.card : colors.background,
      borderWidth: 1,
      borderColor: colors.border,
    }]}>
      <View style={styles.postHeader}>
        <View style={styles.userInfo}>
          {item.profilePicture ? (
            <Image source={{ uri: item.profilePicture }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: colors.backgroundSecondary }]}>
              <IconSymbol name="person.fill" size={20} color={colors.primary} />
            </View>
          )}
          <View style={styles.userDetails}>
            <ThemedText type="bodyBold">{item.username}</ThemedText>
            <ThemedText type="caption" variant="muted">{formatTimeAgo(item.date)}</ThemedText>
          </View>
        </View>
      </View>

      <ThemedText type="body" style={styles.description}>{item.description}</ThemedText>

      <View style={[styles.runStats, { 
        backgroundColor: colorScheme === 'dark' ? colors.background : colors.backgroundSecondary,
        borderWidth: 1,
        borderColor: colors.border,
      }]}>
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

      <View style={[styles.postActions, { borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleLike(item)}
          activeOpacity={0.7}>
          <IconSymbol
            name={item.likedByCurrentUser ? "heart.fill" : "heart"}
            size={20}
            color={item.likedByCurrentUser ? colors.primary : colors.icon}
          />
          <ThemedText
            type="bodySmall"
            variant={item.likedByCurrentUser ? "primary" : "muted"}>
            {item.likes.length}
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

