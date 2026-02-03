import { StyleSheet, View, TextInput, TouchableOpacity, Alert, ScrollView, Animated } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors, Spacing, BorderRadius, CleanPaceColors } from '@/constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { getProfile, updateProfile, UserProfile, getRuns, saveProfile } from '@/services/dataService';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';
import * as Linking from 'expo-linking';
import { getCurrentUserEmail, logout } from '@/services/authService';

export default function ProfileScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [username, setUsername] = useState('');
  const [profilePicture, setProfilePicture] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [totalRuns, setTotalRuns] = useState(0);
  const [totalDistance, setTotalDistance] = useState(0);
  const router = useRouter();
  
  // Breathing animation for profile picture
  const breathScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    loadProfile();
    
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
      loadStats();
    }, [])
  );

  const loadStats = async () => {
    const userProfile = await getProfile();
    if (userProfile) {
      const runs = await getRuns(userProfile.id);
      setTotalRuns(runs.length);
      const distance = runs.reduce((sum, run) => sum + run.distance, 0);
      setTotalDistance(distance);
    }
  };

  const loadProfile = async () => {
    const userProfile = await getProfile();
    if (userProfile) {
      setProfile(userProfile);
      setUsername(userProfile.username);
      setProfilePicture(userProfile.profilePicture);
    } else {
      // Create default profile if none exists
      const email = await getCurrentUserEmail();
      const defaultUsername = email ? email.split('@')[0] : 'Runner';
      const defaultProfile: UserProfile = {
        id: `user_${Date.now()}`,
        username: defaultUsername,
        createdAt: Date.now(),
      };
      await saveProfile(defaultProfile);
      setProfile(defaultProfile);
      setUsername(defaultProfile.username);
    }
    setLoading(false);
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
        setProfilePicture(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
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
        setProfilePicture(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take photo');
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

    if (!profile) return;

    const updated: UserProfile = {
      ...profile,
      username: username.trim(),
      profilePicture,
    };

    const success = await updateProfile(updated);
    if (success) {
      setProfile(updated);
      await loadStats();
      Alert.alert('Success', 'Profile updated!');
    } else {
      Alert.alert('Error', 'Failed to update profile');
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
          <TouchableOpacity onPress={showImagePicker} style={styles.imageContainer} activeOpacity={0.7}>
            {/* Soft Gradient Rings around profile photo */}
            <Animated.View 
              style={[
                styles.breathingRing,
                {
                  backgroundColor: CleanPaceColors.frostBlue,
                  transform: [{ scale: breathScale }],
                }
              ]} 
            />
            {profilePicture ? (
              <Image source={{ uri: profilePicture }} style={styles.profileImage} />
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
            />
          </View>

          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: colors.primary }]}
            onPress={handleSaveProfile}
            activeOpacity={0.7}>
            <ThemedText type="bodyBold" lightColor={CleanPaceColors.offWhite} darkColor={CleanPaceColors.offWhite}>
              Save Profile
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
              <ThemedText type="h2" variant="primary">{totalRuns}</ThemedText>
              <ThemedText type="bodySmall" variant="muted">Total Runs</ThemedText>
            </View>
            <View style={[styles.statCard, { 
              backgroundColor: colorScheme === 'dark' ? colors.card : colors.backgroundSecondary,
              borderWidth: 1,
              borderColor: colors.border,
            }]}>
              <ThemedText type="h2" variant="primary">{totalDistance.toFixed(1)}</ThemedText>
              <ThemedText type="bodySmall" variant="muted">Total Distance (km)</ThemedText>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.statsButton, { backgroundColor: colors.primary }]}
            onPress={() => Linking.openURL('https://www.youtube.com')}
            activeOpacity={0.7}>
            <IconSymbol name="play.circle.fill" size={22} color={CleanPaceColors.offWhite} />
            <ThemedText type="bodyBold" lightColor={CleanPaceColors.offWhite} darkColor={CleanPaceColors.offWhite}>
              Stats on YouTube
            </ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.logoutButton, { 
              borderColor: colors.border,
              borderWidth: 1,
            }]}
            onPress={async () => {
              await logout();
              router.replace('/signin');
            }}
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
  },
  statCard: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.card,
    alignItems: 'center',
  },
  statsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.card,
    marginTop: Spacing.md,
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

