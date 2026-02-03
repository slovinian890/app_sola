import { StyleSheet, View, TextInput, TouchableOpacity, Alert, FlatList, Text } from 'react-native';
import { useState, useEffect } from 'react';
import { Image } from 'expo-image';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors, Spacing, BorderRadius, CleanPaceColors } from '@/constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { getFriends, addFriend, removeFriend, Friend } from '@/services/dataService';

export default function FriendsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [friends, setFriends] = useState<Friend[]>([]);
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFriends();
  }, []);

  const loadFriends = async () => {
    const friendsList = await getFriends();
    setFriends(friendsList);
    setLoading(false);
  };

  const handleAddFriend = async () => {
    if (!username.trim()) {
      Alert.alert('Error', 'Please enter a username');
      return;
    }

    // In a real app, you would search for users by username
    // For now, we'll create a friend with the entered username
    const newFriend: Friend = {
      id: `friend_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      username: username.trim(),
      addedAt: Date.now(),
    };

    const success = await addFriend(newFriend);
    if (success) {
      setUsername('');
      await loadFriends();
      Alert.alert('Success', `Added ${newFriend.username} as a friend!`);
    } else {
      Alert.alert('Error', 'Friend already exists or failed to add');
    }
  };

  const handleRemoveFriend = (friendId: string, friendUsername: string) => {
    Alert.alert(
      'Remove Friend',
      `Are you sure you want to remove ${friendUsername}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await removeFriend(friendId);
            await loadFriends();
          },
        },
      ]
    );
  };

  const renderFriend = ({ item }: { item: Friend }) => (
    <View style={[styles.friendCard, { 
      backgroundColor: colorScheme === 'dark' ? colors.card : colors.background,
      borderWidth: 1,
      borderColor: colors.border,
    }]}>
      <View style={styles.friendInfo}>
        {item.profilePicture ? (
          <Image source={{ uri: item.profilePicture }} style={styles.friendAvatar} />
        ) : (
          <View style={[styles.friendAvatarPlaceholder, { backgroundColor: colors.backgroundSecondary }]}>
            <IconSymbol name="person.fill" size={24} color={colors.primary} />
          </View>
        )}
        <View style={styles.friendDetails}>
          <ThemedText type="bodyBold">{item.username}</ThemedText>
          <ThemedText type="caption" variant="muted">
            Added {new Date(item.addedAt).toLocaleDateString()}
          </ThemedText>
        </View>
      </View>
      <TouchableOpacity
        onPress={() => handleRemoveFriend(item.id, item.username)}
        style={[styles.removeButton, { 
          backgroundColor: colorScheme === 'dark' ? colors.background : colors.backgroundSecondary,
          borderWidth: 1,
          borderColor: colors.border,
        }]}
        activeOpacity={0.7}>
        <IconSymbol name="trash.fill" size={20} color={colors.primary} />
      </TouchableOpacity>
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { 
        backgroundColor: colorScheme === 'dark' ? colors.card : colors.backgroundSecondary,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }]}>
        <ThemedText type="h3">Friends</ThemedText>
      </View>

      <View style={[styles.addFriendSection, { borderBottomColor: colors.border }]}>
        <View style={styles.inputRow}>
          <TextInput
            style={[styles.input, {
              backgroundColor: colorScheme === 'dark' ? colors.card : colors.background,
              borderColor: colors.border,
              color: colors.text,
            }]}
            value={username}
            onChangeText={setUsername}
            placeholder="Enter friend's username"
            placeholderTextColor={colors.textMuted}
          />
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: colors.primary }]}
            onPress={handleAddFriend}
            activeOpacity={0.7}>
            <IconSymbol name="plus" size={24} color={CleanPaceColors.offWhite} />
          </TouchableOpacity>
        </View>
      </View>

      {friends.length === 0 ? (
        <View style={styles.emptyState}>
          <IconSymbol name="person.2.fill" size={64} color={colors.icon} />
          <ThemedText type="h3" style={styles.emptyText}>No friends yet</ThemedText>
          <ThemedText type="body" variant="muted" style={styles.emptySubtext}>Add friends to share your runs!</ThemedText>
        </View>
      ) : (
        <FlatList
          data={friends}
          renderItem={renderFriend}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.friendsList}
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
  header: {
    paddingTop: 60,
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  addFriendSection: {
    padding: Spacing.md,
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
  addButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  friendsList: {
    padding: Spacing.md,
  },
  friendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderRadius: BorderRadius.card,
    marginBottom: Spacing.sm,
  },
  friendInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  friendAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: Spacing.sm,
  },
  friendAvatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  friendDetails: {
    flex: 1,
  },
  removeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
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

