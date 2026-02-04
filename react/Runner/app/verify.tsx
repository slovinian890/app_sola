import { StyleSheet, View, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, Animated } from 'react-native';
import { useState, useRef, useEffect } from 'react';
import { router } from 'expo-router';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors, Spacing, BorderRadius, CleanPaceColors } from '@/constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { sendPasswordReset } from '@/services/authService';

export default function ForgotPasswordScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  
  // Breathing animation for icon
  const breathScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Breathing animation
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

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  };

  const handleResetPassword = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setLoading(true);
    const result = await sendPasswordReset(email.trim());
    setLoading(false);

    if (result.success) {
      setEmailSent(true);
    } else {
      Alert.alert('Error', result.error || 'Failed to send reset email. Please try again.');
    }
  };

  if (emailSent) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.content}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}>
            <IconSymbol name="chevron.left" size={24} color={colors.text} />
          </TouchableOpacity>

          <View style={styles.header}>
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
              <View style={[styles.iconWrapper, { backgroundColor: '#E8F5E9' }]}>
                <IconSymbol name="checkmark.circle.fill" size={48} color="#4CAF50" />
              </View>
            </View>
            
            <ThemedText type="h2" style={styles.title}>Check Your Email</ThemedText>
            <ThemedText type="body" variant="secondary" style={styles.subtitle}>
              We've sent a password reset link to
            </ThemedText>
            <ThemedText type="bodyBold" style={[styles.email, { color: colors.primary }]}>
              {email}
            </ThemedText>
            <ThemedText type="body" variant="muted" style={styles.instructions}>
              Click the link in the email to reset your password. If you don't see it, check your spam folder.
            </ThemedText>
          </View>

          <View style={styles.form}>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.primary }]}
              onPress={() => router.replace('/signin')}
              activeOpacity={0.7}>
              <ThemedText type="bodyBold" lightColor={CleanPaceColors.offWhite} darkColor={CleanPaceColors.offWhite}>
                Back to Sign In
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.secondaryButton, { borderColor: colors.border }]}
              onPress={() => {
                setEmailSent(false);
                setEmail('');
              }}
              activeOpacity={0.7}>
              <ThemedText type="bodyBold" variant="secondary">
                Try Different Email
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}>
        <View style={styles.content}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}>
            <IconSymbol name="chevron.left" size={24} color={colors.text} />
          </TouchableOpacity>

          <View style={styles.header}>
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
                <IconSymbol name="key.fill" size={48} color={colors.primary} />
              </View>
            </View>
            
            <ThemedText type="h2" style={styles.title}>Reset Password</ThemedText>
            <ThemedText type="body" variant="secondary" style={styles.subtitle}>
              Enter your email and we'll send you a link to reset your password
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
                  autoFocus
                />
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.button,
                { backgroundColor: colors.primary },
                loading && { opacity: 0.6 },
              ]}
              onPress={handleResetPassword}
              disabled={loading}
              activeOpacity={0.7}>
              <ThemedText type="bodyBold" lightColor={CleanPaceColors.offWhite} darkColor={CleanPaceColors.offWhite}>
                {loading ? 'Sending...' : 'Send Reset Link'}
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.backToSignIn}
              onPress={() => router.back()}
              activeOpacity={0.7}>
              <ThemedText type="body" variant="secondary">
                Remember your password?{' '}
                <ThemedText type="bodyBold" style={{ color: colors.primary }}>
                  Sign In
                </ThemedText>
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
  backButton: {
    position: 'absolute',
    top: 60,
    left: Spacing.md,
    zIndex: 1,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
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
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    paddingHorizontal: Spacing.lg,
  },
  email: {
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  instructions: {
    textAlign: 'center',
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.lg,
    lineHeight: 22,
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: Spacing.lg,
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
  },
  secondaryButton: {
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.card,
    alignItems: 'center',
    borderWidth: 1,
  },
  backToSignIn: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
});
