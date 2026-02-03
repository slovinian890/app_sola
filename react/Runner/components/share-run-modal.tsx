import { StyleSheet, View, TouchableOpacity, FlatList, Modal } from 'react-native';
import { useState, useEffect } from 'react';
import { Image } from 'expo-image';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { getFriends, Friend } from '@/services/dataService';
import { shareRunWithFriends, Run } from '@/services/dataService';

interface ShareRunModalProps {
  visible: boolean;
  run: Run | null;
  onClose: () => void;
  onShare: () => void;
}

export default function ShareRunModal({ visible, run, onClose, onShare }: ShareRunModalProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);

  useEffect(() => {
    if (visible) {
      loadFriends();
      if (run) {
        setSelectedFriends(run.sharedWith || []);
      }
    }
  }, [visible, run]);

  const loadFriends = async () => {
    const friendsList = await getFriends();
    setFriends(friendsList);
  };

  const toggleFriend = (friendId: string) => {
    setSelectedFriends((prev) =>
      prev.includes(friendId)
        ? prev.filter((id) => id !== friendId)
        : [...prev, friendId]
    );
  };

  const handleShare = async () => {
    if (!run || selectedFriends.length === 0) return;

    const success = await shareRunWithFriends(run.id, selectedFriends);
    if (success) {
      onShare();
      onClose();
    }
  };

  const renderFriend = ({ item }: { item: Friend }) => {
    const isSelected = selectedFriends.includes(item.id);
    return (
      <TouchableOpacity
        style={[
          styles.friendItem,
          { backgroundColor: colors.background },
          isSelected && { backgroundColor: colors.running + '20' },
        ]}
        onPress={() => toggleFriend(item.id)}>
        <View style={styles.friendInfo}>
          {item.profilePicture ? (
            <Image source={{ uri: item.profilePicture }} style={styles.friendAvatar} />
          ) : (
            <View style={[styles.friendAvatarPlaceholder, { backgroundColor: colors.running }]}>
              <IconSymbol name="person.fill" size={20} color="#FFFFFF" />
            </View>
          )}
          <ThemedText style={styles.friendName}>{item.username}</ThemedText>
        </View>
        {isSelected && (
          <View style={[styles.checkmark, { backgroundColor: colors.running }]}>
            <IconSymbol name="checkmark" size={16} color="#FFFFFF" />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (!run) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <ThemedView style={styles.modal}>
          <View style={[styles.header, { backgroundColor: colors.running }]}>
            <ThemedText style={styles.headerTitle}>Share Run</ThemedText>
            <TouchableOpacity onPress={onClose}>
              <IconSymbol name="xmark" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.runInfo}>
            <ThemedText style={styles.runInfoText}>
              {run.distance.toFixed(2)} km • {Math.floor(run.duration / 60)}:{(run.duration % 60).toString().padStart(2, '0')}
            </ThemedText>
            <ThemedText style={styles.runInfoDate}>
              {new Date(run.date).toLocaleDateString()}
            </ThemedText>
          </View>

          {friends.length === 0 ? (
            <View style={styles.emptyState}>
              <IconSymbol name="person.2.fill" size={48} color={colors.icon} />
              <ThemedText style={styles.emptyText}>No friends yet</ThemedText>
              <ThemedText style={styles.emptySubtext}>Add friends to share your runs</ThemedText>
            </View>
          ) : (
            <FlatList
              data={friends}
              renderItem={renderFriend}
              keyExtractor={(item) => item.id}
              style={styles.friendsList}
              showsVerticalScrollIndicator={false}
            />
          )}

          <View style={styles.footer}>
            <TouchableOpacity
              style={[
                styles.shareButton,
                { backgroundColor: colors.running },
                selectedFriends.length === 0 && { opacity: 0.5 },
              ]}
              onPress={handleShare}
              disabled={selectedFriends.length === 0}>
              <ThemedText style={styles.shareButtonText}>
                Share with {selectedFriends.length} {selectedFriends.length === 1 ? 'friend' : 'friends'}
              </ThemedText>
            </TouchableOpacity>
          </View>
        </ThemedView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  runInfo: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  runInfoText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  runInfoDate: {
    fontSize: 14,
    opacity: 0.6,
  },
  friendsList: {
    maxHeight: 400,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  friendInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  friendAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  friendAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  friendName: {
    fontSize: 16,
    fontWeight: '500',
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  shareButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  shareButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    opacity: 0.6,
    textAlign: 'center',
  },
});

