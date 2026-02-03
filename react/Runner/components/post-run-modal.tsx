import { StyleSheet, View, TextInput, TouchableOpacity, Modal, Alert } from 'react-native';
import { useState } from 'react';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { createPost, markRunAsPosted, getProfile, Post, Run } from '@/services/dataService';

interface PostRunModalProps {
  visible: boolean;
  run: Run | null;
  onClose: () => void;
  onPost: () => void;
}

export default function PostRunModal({ visible, run, onClose, onPost }: PostRunModalProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [description, setDescription] = useState('');
  const [posting, setPosting] = useState(false);

  const handlePost = async () => {
    if (!run) return;

    if (!description.trim()) {
      Alert.alert('Error', 'Please add a description');
      return;
    }

    setPosting(true);
    const profile = await getProfile();
    if (!profile) {
      Alert.alert('Error', 'Please set up your profile first');
      setPosting(false);
      return;
    }

    const newPost: Post = {
      id: `post_${Date.now()}`,
      userId: profile.id,
      username: profile.username,
      profilePicture: profile.profilePicture,
      runId: run.id,
      description: description.trim(),
      distance: run.distance,
      duration: run.duration,
      pace: run.pace,
      date: run.date,
      likes: [],
    };

    const success = await createPost(newPost);
    if (success) {
      await markRunAsPosted(run.id);
      setDescription('');
      onPost();
      onClose();
      Alert.alert('Success', 'Run posted to feed!');
    } else {
      Alert.alert('Error', 'Failed to post run');
    }
    setPosting(false);
  };

  if (!run) return null;

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <ThemedView style={styles.modal}>
          <View style={[styles.header, { backgroundColor: colors.running }]}>
            <ThemedText style={styles.headerTitle}>Post Your Run</ThemedText>
            <TouchableOpacity onPress={onClose}>
              <IconSymbol name="xmark" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <View style={[styles.runSummary, { backgroundColor: colors.running + '10' }]}>
              <View style={styles.summaryRow}>
                <ThemedText style={styles.summaryLabel}>Distance:</ThemedText>
                <ThemedText style={[styles.summaryValue, { color: colors.running }]}>
                  {run.distance.toFixed(2)} km
                </ThemedText>
              </View>
              <View style={styles.summaryRow}>
                <ThemedText style={styles.summaryLabel}>Duration:</ThemedText>
                <ThemedText style={[styles.summaryValue, { color: colors.running }]}>
                  {formatDuration(run.duration)}
                </ThemedText>
              </View>
              <View style={styles.summaryRow}>
                <ThemedText style={styles.summaryLabel}>Pace:</ThemedText>
                <ThemedText style={[styles.summaryValue, { color: colors.running }]}>
                  {Math.floor(run.pace / 60)}:{(run.pace % 60).toString().padStart(2, '0')} /km
                </ThemedText>
              </View>
            </View>

            <View style={styles.inputContainer}>
              <ThemedText style={styles.label}>What's on your mind?</ThemedText>
              <TextInput
                style={[styles.input, {
                  backgroundColor: colors.background,
                  borderColor: colors.running,
                  color: colors.text,
                }]}
                value={description}
                onChangeText={setDescription}
                placeholder="Share your running experience..."
                placeholderTextColor={colors.icon}
                multiline
                numberOfLines={4}
                maxLength={280}
              />
              <ThemedText style={styles.charCount}>
                {description.length}/280
              </ThemedText>
            </View>

            <TouchableOpacity
              style={[
                styles.postButton,
                { backgroundColor: colors.running },
                posting && { opacity: 0.6 },
              ]}
              onPress={handlePost}
              disabled={posting}>
              <ThemedText style={styles.postButtonText}>
                {posting ? 'Posting...' : 'Post to Feed'}
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.skipButton]}
              onPress={onClose}>
              <ThemedText style={[styles.skipButtonText, { color: colors.icon }]}>
                Skip
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
  content: {
    padding: 20,
  },
  runSummary: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    opacity: 0.7,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 2,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    opacity: 0.6,
    textAlign: 'right',
    marginTop: 4,
  },
  postButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  postButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  skipButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 14,
  },
});

