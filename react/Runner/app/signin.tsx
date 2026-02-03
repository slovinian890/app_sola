import { StyleSheet, View, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, Animated } from 'react-native';
import { useState, useRef, useEffect } from 'react';
import { router } from 'expo-router';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors, Spacing, BorderRadius, Animation, CleanPaceColors } from '@/constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { sendVerificationCode, login } from '@/services/authService';

export default function SignInScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Breathing animation for icon
  const breathScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Create breathing pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(breathScale, {
          toValue: 1.08,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(breathScale, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const handleSendCode = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setLoading(true);
    const success = await sendVerificationCode(email.trim());
    setLoading(false);

    if (success) {
      // Navigate to verification screen
      router.push({
        pathname: '/verify',
        params: { email: email.trim() },
      });
    } else {
      Alert.alert('Error', 'Failed to send verification code. Please try again.');
    }
  };

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}>
        <View style={styles.content}>
          <View style={styles.header}>
            {/* Soft Gradient Rings - signature visual element */}
            <View style={styles.iconContainer}>
              <Animated.View 
                style={[
                  styles.breathingRing,
                  {
                    backgroundColor: CleanPaceColors.frostBlue,
                    transform: [{ scale: breathScale }],
                  }
                ]} 
              />
              <View style={styles.iconWrapper}>
                <IconSymbol name="figure.run" size={48} color={colors.primary} />
              </View>
            </View>
            
            <ThemedText type="h1" style={styles.title}>Run Tracker</ThemedText>
            <ThemedText type="body" variant="secondary" style={styles.subtitle}>
              Sign in to continue
            </ThemedText>
          </View>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <ThemedText type="bodyBold" style={styles.label}>Email Address</ThemedText>
              <View style={[
                styles.inputWrapper, 
                { 
                  borderColor: colors.border,
                  backgroundColor: colorScheme === 'dark' ? colors.card : colors.background,
                }
              ]}>
                <IconSymbol name="envelope.fill" size={18} color={colors.icon} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="your@email.com"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                />
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.button,
                { backgroundColor: colors.primary },
                loading && { opacity: 0.6 },
              ]}
              onPress={handleSendCode}
              disabled={loading}
              activeOpacity={0.7}>
              <ThemedText type="bodyBold" lightColor={CleanPaceColors.offWhite} darkColor={CleanPaceColors.offWhite}>
                {loading ? 'Sending...' : 'Send Verification Code'}
              </ThemedText>
            </TouchableOpacity>

            <ThemedText type="bodySmall" variant="muted" style={styles.infoText}>
              We'll send a 6-digit verification code to your email
            </ThemedText>

            <View style={styles.divider}>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
              <ThemedText type="caption" variant="muted" style={styles.dividerText}>OR</ThemedText>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            </View>

            <TouchableOpacity
              style={[styles.skipButton, { borderColor: colors.border }]}
              onPress={async () => {
                // Skip authentication and login as guest
                await login('guest@runner.app');
                router.push('/(tabs)');
              }}
              activeOpacity={0.7}>
              <ThemedText type="bodyBold" variant="secondary">
                Continue Without Email
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  iconContainer: {
    position: 'relative',
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  breathingRing: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    opacity: 0.2,
  },
  iconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: CleanPaceColors.frostBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    marginBottom: Spacing.xs,
  },
  subtitle: {
    // No additional styles needed
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: Spacing.md,
  },
  label: {
    marginBottom: Spacing.sm,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: BorderRadius.card,
    paddingHorizontal: Spacing.md,
  },
  inputIcon: {
    marginRight: Spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: Spacing.md,
    fontFamily: Platform.select({
      ios: 'SF Pro Text',
      android: 'sans-serif',
      default: 'sans-serif',
    }),
  },
  button: {
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.card,
    alignItems: 'center',
    marginBottom: Spacing.md,
    // No shadows - design system uses subtle borders instead
  },
  infoText: {
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: Spacing.md,
  },
  skipButton: {
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.card,
    alignItems: 'center',
    borderWidth: 1,
  },
});

