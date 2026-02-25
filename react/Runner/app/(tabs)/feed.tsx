import { StyleSheet, View, TouchableOpacity, FlatList, Alert, RefreshControl, TextInput, Modal, Platform, Dimensions } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { Image } from 'expo-image';
import { WebView } from 'react-native-webview';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors, Spacing, BorderRadius, CleanPaceColors } from '@/constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useFocusEffect, useRouter } from 'expo-router';
import { getFeedPosts, toggleLike, getPostComments, addComment } from '@/services/socialService';
import { getCurrentUser } from '@/services/authService';
import { PostWithAuthor, PostCommentWithAuthor, RouteData } from '@/services/supabase';
import { intervalToSeconds } from '@/services/runsService';
import { DEFAULT_TRAIL_COLOR } from '@/services/trailColorService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Generate a mini Leaflet map for feed posts
const generateFeedRouteHTML = (routeData: RouteData, isDark: boolean): string => {
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
    .start-dot { width: 10px; height: 10px; border-radius: 50%; background: #4CAF50; border: 2px solid #fff; }
    .end-dot { width: 10px; height: 10px; border-radius: 50%; background: #F44336; border: 2px solid #fff; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var coords = ${coordsJSON};
    var map = L.map('map', {
      zoomControl: false, attributionControl: false,
      dragging: false, scrollWheelZoom: false, doubleClickZoom: false,
      touchZoom: false, boxZoom: false, keyboard: false
    });
    L.tileLayer('${tileUrl}', { maxZoom: 19, subdomains: 'abcd' }).addTo(map);
    if (coords.length > 0) {
      L.polyline(coords, { color: '${lineColor}', weight: 7, opacity: 0.2 }).addTo(map);
      var line = L.polyline(coords, { color: '${lineColor}', weight: 3, opacity: 0.9 }).addTo(map);
      var startIcon = L.divIcon({ className: 'start-dot', iconSize: [10,10], iconAnchor: [5,5] });
      var endIcon = L.divIcon({ className: 'end-dot', iconSize: [10,10], iconAnchor: [5,5] });
      L.marker(coords[0], { icon: startIcon }).addTo(map);
      L.marker(coords[coords.length-1], { icon: endIcon }).addTo(map);
      map.fitBounds(line.getBounds(), { padding: [20, 20] });
    }
  </script>
</body>
</html>`;
};

// Generate a full-screen Leaflet map for the detail modal
const generateDetailMapHTML = (routeData: RouteData, isDark: boolean): string => {
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
    .leaflet-control-attribution { font-size: 9px !important; }
    .start-dot { width: 14px; height: 14px; border-radius: 50%; background: #4CAF50; border: 3px solid #fff; box-shadow: 0 2px 6px rgba(0,0,0,0.3); }
    .end-dot { width: 14px; height: 14px; border-radius: 50%; background: #F44336; border: 3px solid #fff; box-shadow: 0 2px 6px rgba(0,0,0,0.3); }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var coords = ${coordsJSON};
    var map = L.map('map', { zoomControl: true, attributionControl: true });
    L.tileLayer('${tileUrl}', { maxZoom: 19, subdomains: 'abcd' }).addTo(map);
    if (coords.length > 0) {
      // Glow line
      L.polyline(coords, { color: '${lineColor}', weight: 10, opacity: 0.2, lineCap: 'round', lineJoin: 'round' }).addTo(map);
      // Main trail
      var line = L.polyline(coords, { color: '${lineColor}', weight: 4, opacity: 0.9, lineCap: 'round', lineJoin: 'round' }).addTo(map);
      var startIcon = L.divIcon({ className: 'start-dot', iconSize: [14,14], iconAnchor: [7,7] });
      var endIcon = L.divIcon({ className: 'end-dot', iconSize: [14,14], iconAnchor: [7,7] });
      L.marker(coords[0], { icon: startIcon }).addTo(map).bindPopup('Start');
      L.marker(coords[coords.length-1], { icon: endIcon }).addTo(map).bindPopup('Finish');
      map.fitBounds(line.getBounds(), { padding: [30, 30] });
    }
  </script>
</body>
</html>`;
};

export default function FeedScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  const [posts, setPosts] = useState<PostWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
  const [comments, setComments] = useState<{ [key: string]: PostCommentWithAuthor[] }>({});
  const [commentText, setCommentText] = useState<{ [key: string]: string }>({});
  const [submittingComment, setSubmittingComment] = useState(false);

  // Detail modal state
  const [detailPost, setDetailPost] = useState<PostWithAuthor | null>(null);

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
    if (user) setCurrentUserId(user.id);
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
      setPosts(prev =>
        prev.map(p =>
          p.id === post.id
            ? {
                ...p,
                is_liked: result.liked,
                likes_count: result.liked
                  ? (p.likes_count ?? 0) + 1
                  : Math.max(0, (p.likes_count ?? 0) - 1),
              }
            : p
        )
      );
    }
  };

  const handleToggleComments = async (postId: string) => {
    if (expandedPostId === postId) {
      setExpandedPostId(null);
    } else {
      setExpandedPostId(postId);
      if (!comments[postId]) {
        const result = await getPostComments(postId);
        setComments(prev => ({ ...prev, [postId]: result.data }));
      }
    }
  };

  const handleAddComment = async (postId: string) => {
    const text = commentText[postId]?.trim();
    if (!text) return;
    if (!currentUserId) {
      Alert.alert('Error', 'Please sign in to comment');
      return;
    }
    setSubmittingComment(true);
    const result = await addComment({ post_id: postId, content: text });
    setSubmittingComment(false);
    if (result.success) {
      setCommentText(prev => ({ ...prev, [postId]: '' }));
      const commentsResult = await getPostComments(postId);
      setComments(prev => ({ ...prev, [postId]: commentsResult.data }));
      setPosts(prev =>
        prev.map(p =>
          p.id === postId ? { ...p, comments_count: (p.comments_count ?? 0) + 1 } : p
        )
      );
    } else {
      Alert.alert('Error', result.error || 'Failed to add comment');
    }
  };

  const formatDuration = (interval: string | null): string => {
    if (!interval) return '0:00';
    const seconds = intervalToSeconds(interval);
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTimeAgo = (timestamp: string): string => {
    const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const formatRunTime = (runTime: string | null | undefined): string => {
    if (!runTime) return '';
    // runTime is in "HH:MM:SS" 24-hour format from DB
    const parts = runTime.split(':');
    if (parts.length >= 2) {
      const h = parseInt(parts[0]);
      const m = parts[1];
      const ampm = h >= 12 ? 'PM' : 'AM';
      const h12 = h % 12 || 12;
      return `${h12}:${m} ${ampm}`;
    }
    return runTime;
  };

  const handleUserPress = (userId: string) => {
    if (userId === currentUserId) {
      router.push('/(tabs)/profile');
    } else {
      router.push({ pathname: '/user-profile', params: { userId } });
    }
  };

  // Check if a post has route data to show on the map
  const hasRouteData = (post: PostWithAuthor): boolean => {
    return !!(
      post.runs?.route_data &&
      (post.runs.route_data as RouteData)?.coordinates?.length >= 2
    );
  };

  // Render a mini route map inside a post card
  const renderMiniRouteMap = (routeData: RouteData) => {
    const html = generateFeedRouteHTML(routeData, isDark);
    if (!html) return null;
    return (
      <View style={styles.miniMapContainer}>
        <WebView
          source={{ html }}
          style={styles.miniMapWebView}
          scrollEnabled={false}
          originWhitelist={['*']}
          javaScriptEnabled
          domStorageEnabled
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          cacheEnabled
          onShouldStartLoadWithRequest={(req) =>
            req.url.startsWith('about:') || req.url.startsWith('data:')
          }
        />
      </View>
    );
  };

  // ── Detail Modal ──
  const renderDetailModal = () => {
    if (!detailPost) return null;
    const run = detailPost.runs;
    const routeData = run?.route_data as RouteData | undefined;
    const hasRoute = routeData?.coordinates?.length ? routeData.coordinates.length >= 2 : false;

    return (
      <Modal visible={!!detailPost} transparent animationType="slide" onRequestClose={() => setDetailPost(null)}>
        <View style={styles.detailOverlay}>
          <ThemedView style={[styles.detailModal, { backgroundColor: isDark ? colors.card : colors.background }]}>
            {/* Header */}
            <View style={[styles.detailHeader, { borderBottomColor: colors.border }]}>
              <View style={styles.detailHeaderLeft}>
                {detailPost.profiles?.avatar_url ? (
                  <Image source={{ uri: detailPost.profiles.avatar_url }} style={styles.detailAvatar} />
                ) : (
                  <View style={[styles.detailAvatarPlaceholder, { backgroundColor: colors.backgroundSecondary }]}>
                    <IconSymbol name="person.fill" size={20} color={colors.primary} />
                  </View>
                )}
                <View>
                  <ThemedText type="bodyBold">
                    {detailPost.profiles?.display_name || detailPost.profiles?.username || 'Runner'}
                  </ThemedText>
                  <ThemedText type="caption" variant="muted">
                    {run?.run_date
                      ? new Date(run.run_date).toLocaleDateString('en-US', {
                          weekday: 'short', month: 'short', day: 'numeric',
                        })
                      : formatTimeAgo(detailPost.created_at)}
                    {run?.run_time ? ` at ${formatRunTime(run.run_time)}` : ''}
                  </ThemedText>
                </View>
              </View>
              <TouchableOpacity onPress={() => setDetailPost(null)} style={styles.closeButton}>
                <IconSymbol name="xmark" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Route Map */}
            {hasRoute && routeData && (
              <View style={styles.detailMapContainer}>
                <WebView
                  source={{ html: generateDetailMapHTML(routeData, isDark) }}
                  style={styles.detailMapWebView}
                  scrollEnabled={false}
                  originWhitelist={['*']}
                  javaScriptEnabled
                  domStorageEnabled
                  cacheEnabled
                  onShouldStartLoadWithRequest={(req) =>
                    req.url.startsWith('about:') || req.url.startsWith('data:')
                  }
                />
              </View>
            )}

            {/* Run Stats */}
            {run && (
              <View style={[styles.detailStats, { borderColor: colors.border }]}>
                <View style={styles.detailStatItem}>
                  <ThemedText type="h2" variant="primary">
                    {Number(run.distance_km).toFixed(2)}
                  </ThemedText>
                  <ThemedText type="caption" variant="muted">km</ThemedText>
                </View>
                <View style={[styles.detailStatDivider, { backgroundColor: colors.border }]} />
                <View style={styles.detailStatItem}>
                  <ThemedText type="h2" variant="primary">
                    {formatDuration(run.duration)}
                  </ThemedText>
                  <ThemedText type="caption" variant="muted">time</ThemedText>
                </View>
                <View style={[styles.detailStatDivider, { backgroundColor: colors.border }]} />
                <View style={styles.detailStatItem}>
                  <ThemedText type="h2" variant="primary">
                    {run.pace ?? '0:00'}
                  </ThemedText>
                  <ThemedText type="caption" variant="muted">pace/km</ThemedText>
                </View>
              </View>
            )}

            {/* Extra stats */}
            {run?.calories && run.calories > 0 ? (
              <View style={[styles.detailExtraRow, { borderColor: colors.border }]}>
                <View style={styles.detailExtraItem}>
                  <IconSymbol name="flame.fill" size={16} color={colors.primary} />
                  <ThemedText type="body" variant="secondary">{run.calories} calories burned</ThemedText>
                </View>
              </View>
            ) : null}

            {/* Description */}
            {detailPost.content ? (
              <View style={styles.detailDescription}>
                <ThemedText type="body">{detailPost.content}</ThemedText>
              </View>
            ) : null}

            {/* Like & comment counts */}
            <View style={[styles.detailFooter, { borderTopColor: colors.border }]}>
              <View style={styles.detailFooterItem}>
                <IconSymbol name="heart.fill" size={16} color={colors.primary} />
                <ThemedText type="bodySmall" variant="muted">{detailPost.likes_count ?? 0} likes</ThemedText>
              </View>
              <View style={styles.detailFooterItem}>
                <IconSymbol name="bubble.left" size={16} color={colors.icon} />
                <ThemedText type="bodySmall" variant="muted">{detailPost.comments_count ?? 0} comments</ThemedText>
              </View>
            </View>
          </ThemedView>
        </View>
      </Modal>
    );
  };

  // ── Post Card ──
  const renderPost = ({ item }: { item: PostWithAuthor }) => {
    const showRouteMap = hasRouteData(item);

    return (
      <View
        style={[
          styles.postCard,
          {
            backgroundColor: isDark ? colors.card : colors.background,
            borderWidth: 1,
            borderColor: colors.border,
          },
        ]}>
        {/* User header */}
        <View style={styles.postHeader}>
          <TouchableOpacity
            style={styles.userInfo}
            onPress={() => handleUserPress(item.user_id)}
            activeOpacity={0.7}>
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
              <ThemedText type="caption" variant="muted">
                {formatTimeAgo(item.created_at)}
              </ThemedText>
            </View>
          </TouchableOpacity>
        </View>

        {/* Post text */}
        {item.content && (
          <ThemedText type="body" style={styles.description}>
            {item.content}
          </ThemedText>
        )}

        {/* Mini route map (clickable to open detail) */}
        {showRouteMap && item.runs?.route_data && (
          <TouchableOpacity activeOpacity={0.9} onPress={() => setDetailPost(item)}>
            {renderMiniRouteMap(item.runs.route_data as RouteData)}
            <View style={[styles.mapOverlayLabel, { backgroundColor: colors.primary + 'CC' }]}>
              <IconSymbol name="map.fill" size={12} color="#FFFFFF" />
              <ThemedText type="caption" lightColor="#FFFFFF" darkColor="#FFFFFF">
                Tap to view route
              </ThemedText>
            </View>
          </TouchableOpacity>
        )}

        {/* Run stats summary */}
        {item.runs && (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setDetailPost(item)}
            style={[
              styles.runStats,
              {
                backgroundColor: isDark ? colors.background : colors.backgroundSecondary,
                borderWidth: 1,
                borderColor: colors.border,
              },
            ]}>
            <View style={styles.statItem}>
              <ThemedText type="h3" variant="primary">
                {Number(item.runs.distance_km).toFixed(2)}
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
          </TouchableOpacity>
        )}

        {/* Like & comment buttons */}
        <View style={[styles.postActions, { borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleLike(item)}
            activeOpacity={0.7}>
            <IconSymbol
              name={item.is_liked ? 'heart.fill' : 'heart'}
              size={20}
              color={item.is_liked ? colors.primary : colors.icon}
            />
            <ThemedText type="bodySmall" variant={item.is_liked ? 'primary' : 'muted'}>
              {item.likes_count ?? 0}
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleToggleComments(item.id)}
            activeOpacity={0.7}>
            <IconSymbol
              name="bubble.left"
              size={20}
              color={expandedPostId === item.id ? colors.primary : colors.icon}
            />
            <ThemedText type="bodySmall" variant={expandedPostId === item.id ? 'primary' : 'muted'}>
              {item.comments_count ?? 0}
            </ThemedText>
          </TouchableOpacity>
          {/* View detail button for run posts */}
          {item.runs && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setDetailPost(item)}
              activeOpacity={0.7}>
              <IconSymbol name="arrow.up.right.square" size={20} color={colors.icon} />
              <ThemedText type="bodySmall" variant="muted">Details</ThemedText>
            </TouchableOpacity>
          )}
        </View>

        {/* Comments section */}
        {expandedPostId === item.id && (
          <View style={[styles.commentsSection, { borderTopColor: colors.border }]}>
            {comments[item.id] && comments[item.id].length > 0 && (
              <View style={styles.commentsList}>
                {comments[item.id].map((comment) => (
                  <View key={comment.id} style={styles.commentItem}>
                    <TouchableOpacity
                      style={styles.commentHeader}
                      onPress={() => handleUserPress(comment.user_id)}
                      activeOpacity={0.7}>
                      {comment.profiles?.avatar_url ? (
                        <Image source={{ uri: comment.profiles.avatar_url }} style={styles.commentAvatar} />
                      ) : (
                        <View
                          style={[
                            styles.commentAvatarPlaceholder,
                            { backgroundColor: colors.backgroundSecondary },
                          ]}>
                          <IconSymbol name="person.fill" size={12} color={colors.primary} />
                        </View>
                      )}
                      <View style={styles.commentContent}>
                        <ThemedText type="bodySmall" variant="primary">
                          {comment.profiles?.display_name || comment.profiles?.username || 'Unknown'}
                        </ThemedText>
                        <ThemedText type="bodySmall" style={styles.commentText}>
                          {comment.content}
                        </ThemedText>
                        <ThemedText type="caption" variant="muted">
                          {formatTimeAgo(comment.created_at)}
                        </ThemedText>
                      </View>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* Comment input */}
            <View
              style={[
                styles.commentInputContainer,
                {
                  backgroundColor: isDark ? colors.background : colors.backgroundSecondary,
                  borderColor: colors.border,
                },
              ]}>
              <TextInput
                style={[styles.commentInput, { color: colors.text }]}
                value={commentText[item.id] || ''}
                onChangeText={(text) => setCommentText((prev) => ({ ...prev, [item.id]: text }))}
                placeholder="Add a comment..."
                placeholderTextColor={colors.textMuted}
                multiline
                editable={!submittingComment}
              />
              <TouchableOpacity
                onPress={() => handleAddComment(item.id)}
                disabled={!commentText[item.id]?.trim() || submittingComment}
                style={[
                  styles.sendButton,
                  (!commentText[item.id]?.trim() || submittingComment) && { opacity: 0.5 },
                ]}
                activeOpacity={0.7}>
                <IconSymbol name="arrow.up.circle.fill" size={32} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
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
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        />
      )}

      {/* Run Detail Modal */}
      {renderDetailModal()}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    paddingTop: 60,
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  postsList: { padding: Spacing.md },
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
  userInfo: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 40, height: 40, borderRadius: 20, marginRight: Spacing.sm },
  avatarPlaceholder: {
    width: 40, height: 40, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center',
    marginRight: Spacing.sm,
  },
  userDetails: { flex: 1 },
  description: { marginBottom: Spacing.sm },
  // Mini route map in feed
  miniMapContainer: {
    height: 160,
    borderRadius: BorderRadius.small,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: '#ECECEC',
  },
  miniMapWebView: { flex: 1, backgroundColor: 'transparent' },
  mapOverlayLabel: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  // Run stats in post
  runStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
    borderRadius: BorderRadius.small,
    marginBottom: Spacing.sm,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, height: 24 },
  // Actions
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
  // Comments
  commentsSection: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
  },
  commentsList: { marginBottom: Spacing.sm },
  commentItem: { marginBottom: Spacing.sm },
  commentHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  commentAvatar: {
    width: 28, height: 28, borderRadius: 14,
    marginRight: Spacing.xs,
  },
  commentAvatarPlaceholder: {
    width: 28, height: 28, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
    marginRight: Spacing.xs,
  },
  commentContent: { flex: 1 },
  commentText: { marginTop: 2, marginBottom: 2 },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderWidth: 1,
    borderRadius: BorderRadius.card,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  commentInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: Spacing.xs,
    paddingRight: Spacing.xs,
    maxHeight: 100,
    fontFamily: Platform.select({
      ios: 'SF Pro Text',
      android: 'sans-serif',
      default: 'sans-serif',
    }),
  },
  sendButton: { paddingLeft: Spacing.xs },
  // Empty state
  emptyState: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    padding: Spacing.xl,
  },
  emptyText: { marginTop: Spacing.md, marginBottom: Spacing.xs },
  emptySubtext: { textAlign: 'center' },

  // ── Detail Modal Styles ──
  detailOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  detailModal: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '92%',
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderBottomWidth: 1,
  },
  detailHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  detailAvatar: { width: 40, height: 40, borderRadius: 20 },
  detailAvatarPlaceholder: {
    width: 40, height: 40, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center',
  },
  closeButton: { padding: Spacing.xs },
  detailMapContainer: {
    height: 260,
    borderBottomWidth: 1,
    borderBottomColor: '#ECECEC',
  },
  detailMapWebView: { flex: 1, backgroundColor: 'transparent' },
  detailStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    borderWidth: 1,
    borderRadius: BorderRadius.card,
  },
  detailStatItem: { flex: 1, alignItems: 'center' },
  detailStatDivider: { width: 1, height: 36 },
  detailExtraRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginTop: Spacing.sm,
    marginHorizontal: Spacing.md,
    borderWidth: 1,
    borderRadius: BorderRadius.small,
  },
  detailExtraItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  detailDescription: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
  },
  detailFooter: {
    flexDirection: 'row',
    gap: Spacing.lg,
    padding: Spacing.md,
    marginTop: Spacing.sm,
    borderTopWidth: 1,
  },
  detailFooterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
});
