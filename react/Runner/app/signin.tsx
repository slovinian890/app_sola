import { StyleSheet, View, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, Animated } from 'react-native';
import { useState, useRef, useEffect } from 'react';
import { router } from 'expo-router';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors, Spacing, BorderRadius, CleanPaceColors } from '@/constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { signIn, signUp } from '@/services/authService';

type AuthMode = 'signin' | 'signup';

export default function SignInScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
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

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  };

  const validatePassword = (password: string): boolean => {
    return password.length >= 6;
  };

  const handleSignIn = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    if (!password) {
      Alert.alert('Error', 'Please enter your password');
      return;
    }

    setLoading(true);
    const result = await signIn({ email: email.trim(), password });
    setLoading(false);

    if (result.success) {
      router.replace('/(tabs)');
    } else {
      Alert.alert('Sign In Failed', result.error || 'Invalid credentials');
    }
  };

  const handleSignUp = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    if (!username.trim()) {
      Alert.alert('Error', 'Please enter a username');
      return;
    }

    if (username.trim().length < 3) {
      Alert.alert('Error', 'Username must be at least 3 characters');
      return;
    }

    if (!validatePassword(password)) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    const result = await signUp({
      email: email.trim(),
      password,
      username: username.trim(),
    });
    setLoading(false);

    if (result.success) {
      // Check if email confirmation is required
      if (result.user && !result.session) {
        Alert.alert(
          'Check Your Email',
          'We sent you a confirmation link. Please check your email to verify your account.',
          [{ text: 'OK' }]
        );
      } else {
        router.replace('/(tabs)');
      }
    } else {
      Alert.alert('Sign Up Failed', result.error || 'Unable to create account');
    }
  };

  const handleSubmit = () => {
    if (mode === 'signin') {
      handleSignIn();
    } else {
      handleSignUp();
    }
  };

  const toggleMode = () => {
    setMode(mode === 'signin' ? 'signup' : 'signin');
    setPassword('');
    setUsername('');
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
              {mode === 'signin' ? 'Welcome back!' : 'Create your account'}
            </ThemedText>
          </View>

          <View style={styles.form}>
            {/* Username field (sign up only) */}
            {mode === 'signup' && (
              <View style={styles.inputContainer}>
                <ThemedText type="bodyBold" style={styles.label}>Username</ThemedText>
                <View style={[
                  styles.inputWrapper, 
                  { 
                    borderColor: colors.border,
                    backgroundColor: colorScheme === 'dark' ? colors.card : colors.background,
                  }
                ]}>
                  <IconSymbol name="person.fill" size={18} color={colors.icon} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    value={username}
                    onChangeText={setUsername}
                    placeholder="Choose a username"
                    placeholderTextColor={colors.textMuted}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!loading}
                  />
                </View>
              </View>
            )}

            {/* Email field */}
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

            {/* Password field */}
            <View style={styles.inputContainer}>
              <ThemedText type="bodyBold" style={styles.label}>Password</ThemedText>
              <View style={[
                styles.inputWrapper, 
                { 
                  borderColor: colors.border,
                  backgroundColor: colorScheme === 'dark' ? colors.card : colors.background,
                }
              ]}>
                <IconSymbol name="lock.fill" size={18} color={colors.icon} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder={mode === 'signin' ? 'Enter your password' : 'Create a password'}
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                  <IconSymbol 
                    name={showPassword ? 'eye.slash.fill' : 'eye.fill'} 
                    size={18} 
                    color={colors.icon} 
                  />
                </TouchableOpacity>
              </View>
              {mode === 'signup' && (
                <ThemedText type="caption" variant="muted" style={styles.passwordHint}>
                  Must be at least 6 characters
                </ThemedText>
              )}
            </View>

            {/* Forgot password link (sign in only) */}
            {mode === 'signin' && (
              <TouchableOpacity
                style={styles.forgotPassword}
                onPress={() => router.push('/verify')}
                activeOpacity={0.7}>
                <ThemedText type="bodySmall" variant="secondary">
                  Forgot password?
                </ThemedText>
              </TouchableOpacity>
            )}

            {/* Submit button */}
            <TouchableOpacity
              style={[
                styles.button,
                { backgroundColor: colors.primary },
                loading && { opacity: 0.6 },
              ]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.7}>
              <ThemedText type="bodyBold" lightColor={CleanPaceColors.offWhite} darkColor={CleanPaceColors.offWhite}>
                {loading 
                  ? (mode === 'signin' ? 'Signing In...' : 'Creating Account...') 
                  : (mode === 'signin' ? 'Sign In' : 'Create Account')
                }
              </ThemedText>
            </TouchableOpacity>

            {/* Toggle mode */}
            <View style={styles.toggleContainer}>
              <ThemedText type="body" variant="secondary">
                {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
              </ThemedText>
              <TouchableOpacity onPress={toggleMode} disabled={loading}>
                <ThemedText type="bodyBold" style={{ color: colors.primary }}>
                  {mode === 'signin' ? 'Sign Up' : 'Sign In'}
                </ThemedText>
              </TouchableOpacity>
            </View>
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
  eyeIcon: {
    padding: Spacing.xs,
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
  passwordHint: {
    marginTop: Spacing.xs,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: Spacing.md,
  },
  button: {
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.card,
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
});
