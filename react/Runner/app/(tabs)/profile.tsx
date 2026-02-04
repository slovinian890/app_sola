import { StyleSheet, View, TextInput, TouchableOpacity, Alert, ScrollView, Animated } from 'react-native';
import { useState, useEffect, useRef, useCallback } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors, Spacing, BorderRadius, CleanPaceColors } from '@/constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useFocusEffect, useRouter } from 'expo-router';
import { getCurrentProfile, updateProfile, uploadAvatar } from '@/services/profileService';
import { getCurrentUserStats } from '@/services/statsService';
import { signOut } from '@/services/authService';
import { Profile, UserStats } from '@/services/supabase';

export default function ProfileScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  
  // Breathing animation for profile picture
  const breathScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Breathing animation for profile picture
    Animated.loop(
      Animated.sequence([
        Animated.timing(breathScale, {
          toValue: 1.03,
          duration: 2500,
          useNativeDriver: true,
        }),
        Animated.timing(breathScale, {
          toValue: 1,
          duration: 2500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
      loadStats();
    }, [])
  );

  const loadProfile = async () => {
    try {
      const result = await getCurrentProfile();
      if (result.success && result.profile) {
        setProfile(result.profile);
        setUsername(result.profile.username);
        setDisplayName(result.profile.display_name || '');
        setBio(result.profile.bio || '');
        setAvatarUrl(result.profile.avatar_url);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const result = await getCurrentUserStats();
      if (result.success && result.stats) {
        setStats(result.stats);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant camera roll permissions to add a profile picture.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        // Upload to Supabase Storage
        setSaving(true);
        const uploadResult = await uploadAvatar(result.assets[0].uri);
        if (uploadResult.success && uploadResult.url) {
          setAvatarUrl(uploadResult.url);
          Alert.alert('Success', 'Profile picture updated!');
        } else {
          Alert.alert('Error', uploadResult.error || 'Failed to upload image');
        }
        setSaving(false);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
      setSaving(false);
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant camera permissions to take a photo.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSaving(true);
        const uploadResult = await uploadAvatar(result.assets[0].uri);
        if (uploadResult.success && uploadResult.url) {
          setAvatarUrl(uploadResult.url);
          Alert.alert('Success', 'Profile picture updated!');
        } else {
          Alert.alert('Error', uploadResult.error || 'Failed to upload image');
        }
        setSaving(false);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take photo');
      setSaving(false);
    }
  };

  const showImagePicker = () => {
    Alert.alert(
      'Profile Picture',
      'Choose an option',
      [
        { text: 'Camera', onPress: takePhoto },
        { text: 'Photo Library', onPress: pickImage },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleSaveProfile = async () => {
    if (!username.trim()) {
      Alert.alert('Error', 'Username cannot be empty');
      return;
    }

    setSaving(true);
    const result = await updateProfile({
      username: username.trim(),
      display_name: displayName.trim() || null,
      bio: bio.trim() || null,
    });
    setSaving(false);

    if (result.success) {
      setProfile(result.profile!);
      Alert.alert('Success', 'Profile updated!');
    } else {
      Alert.alert('Error', result.error || 'Failed to update profile');
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/signin');
          },
        },
      ]
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
      <View style={[styles.header, { 
        backgroundColor: colorScheme === 'dark' ? colors.card : colors.backgroundSecondary,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }]}>
        <ThemedText type="h3">Profile</ThemedText>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.profileSection}>
          <TouchableOpacity onPress={showImagePicker} style={styles.imageContainer} activeOpacity={0.7} disabled={saving}>
            <Animated.View 
              style={[
                styles.breathingRing,
                {
                  backgroundColor: CleanPaceColors.frostBlue,
                  transform: [{ scale: breathScale }],
                }
              ]} 
            />
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.profileImage} />
            ) : (
              <View style={[styles.profileImagePlaceholder, { backgroundColor: colors.backgroundSecondary }]}>
                <IconSymbol name="person.fill" size={48} color={colors.primary} />
              </View>
            )}
            <View style={[styles.editBadge, { 
              backgroundColor: colors.primary,
              borderColor: colorScheme === 'dark' ? colors.card : colors.background,
            }]}>
              <IconSymbol name="camera.fill" size={16} color={CleanPaceColors.offWhite} />
            </View>
          </TouchableOpacity>

          <View style={styles.inputContainer}>
            <ThemedText type="bodyBold" style={styles.label}>Username</ThemedText>
            <TextInput
              style={[styles.input, { 
                backgroundColor: colorScheme === 'dark' ? colors.card : colors.background,
                borderColor: colors.border,
                color: colors.text,
              }]}
              value={username}
              onChangeText={setUsername}
              placeholder="Enter your username"
              placeholderTextColor={colors.textMuted}
              editable={!saving}
            />
          </View>

          <View style={styles.inputContainer}>
            <ThemedText type="bodyBold" style={styles.label}>Display Name</ThemedText>
            <TextInput
              style={[styles.input, { 
                backgroundColor: colorScheme === 'dark' ? colors.card : colors.background,
                borderColor: colors.border,
                color: colors.text,
              }]}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Enter your display name"
              placeholderTextColor={colors.textMuted}
              editable={!saving}
            />
          </View>

          <View style={styles.inputContainer}>
            <ThemedText type="bodyBold" style={styles.label}>Bio</ThemedText>
            <TextInput
              style={[styles.input, styles.bioInput, { 
                backgroundColor: colorScheme === 'dark' ? colors.card : colors.background,
                borderColor: colors.border,
                color: colors.text,
              }]}
              value={bio}
              onChangeText={setBio}
              placeholder="Tell us about yourself"
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
              editable={!saving}
            />
          </View>

          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: colors.primary }, saving && { opacity: 0.6 }]}
            onPress={handleSaveProfile}
            activeOpacity={0.7}
            disabled={saving}>
            <ThemedText type="bodyBold" lightColor={CleanPaceColors.offWhite} darkColor={CleanPaceColors.offWhite}>
              {saving ? 'Saving...' : 'Save Profile'}
            </ThemedText>
          </TouchableOpacity>
        </View>

        <View style={styles.statsSection}>
          <ThemedText type="h3" style={styles.sectionTitle}>Your Stats</ThemedText>
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

          <TouchableOpacity
            style={[styles.logoutButton, { 
              borderColor: colors.border,
              borderWidth: 1,
            }]}
            onPress={handleLogout}
            activeOpacity={0.7}>
            <IconSymbol name="arrow.right.square.fill" size={20} color={colors.primary} />
            <ThemedText type="bodyBold" variant="primary">
              Logout
            </ThemedText>
          </TouchableOpacity>
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
  header: {
    paddingTop: 60,
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
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
    position: 'relative',
    marginBottom: Spacing.md,
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  breathingRing: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    opacity: 0.2,
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
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
  },
  inputContainer: {
    width: '100%',
    marginBottom: Spacing.md,
  },
  label: {
    marginBottom: Spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.card,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    fontSize: 16,
  },
  bioInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  saveButton: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.card,
    marginTop: Spacing.sm,
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
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.card,
    marginTop: Spacing.md,
  },
});
