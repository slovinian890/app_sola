import { StyleSheet, View, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, Animated } from 'react-native';
import { useState, useRef, useEffect } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors, Spacing, BorderRadius, CleanPaceColors } from '@/constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { verifyCode, hasProfile, getStoredCode, login } from '@/services/authService';
import { initializeDemoData } from '@/services/dataService';

export default function VerifyScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const params = useLocalSearchParams();
  const email = (params.email as string) || '';
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  const [displayCode, setDisplayCode] = useState<string | null>(null);
  
  // Breathing animation for icon
  const breathScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Get and display the code on screen
    getStoredCode().then((storedCode) => {
      if (storedCode) {
        setDisplayCode(storedCode);
        // Also show in alert for convenience
        setTimeout(() => {
          Alert.alert(
            'Your Verification Code',
            `Code: ${storedCode}\n\nEnter this code below to verify your email.`,
            [{ text: 'OK' }]
          );
        }, 500);
      }
    });
    
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

  const handleCodeChange = (value: string, index: number) => {
    if (value.length > 1) {
      // Handle paste
      const digits = value.replace(/[^0-9]/g, '').slice(0, 6);
      const newCode = [...code];
      digits.split('').forEach((digit, i) => {
        if (index + i < 6) {
          newCode[index + i] = digit;
        }
      });
      setCode(newCode);
      // Focus last filled input
      const nextIndex = Math.min(index + digits.length, 5);
      inputRefs.current[nextIndex]?.focus();
    } else {
      // Handle single digit
      const newCode = [...code];
      newCode[index] = value.replace(/[^0-9]/g, '');
      setCode(newCode);

      // Auto-focus next input
      if (value && index < 5) {
        inputRefs.current[index + 1]?.focus();
      }
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const codeString = code.join('');
    if (codeString.length !== 6) {
      Alert.alert('Error', 'Please enter the complete 6-digit code');
      return;
    }

    setLoading(true);
    const success = await verifyCode(email, codeString);
    setLoading(false);

    if (success) {
      // Initialize demo data if first time
      await initializeDemoData();
      
      // Check if user has profile
      const hasUserProfile = await hasProfile();
      
      if (hasUserProfile) {
        // User has profile, go to main app
        router.replace('/(tabs)');
      } else {
        // User needs to set up profile
        router.replace('/(tabs)/profile');
      }
    } else {
      Alert.alert('Error', 'Invalid verification code. Please try again.');
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    }
  };

  const handleResend = async () => {
    Alert.alert('Code Resent', 'A new verification code has been sent to your email');
    // In production, call sendVerificationCode again
  };

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
            {/* Soft Gradient Rings */}
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
                <IconSymbol name="lock.shield.fill" size={48} color={colors.primary} />
              </View>
            </View>
            
            <ThemedText type="h2" style={styles.title}>Enter Verification Code</ThemedText>
            <ThemedText type="body" variant="secondary" style={styles.subtitle}>
              We sent a 6-digit code to
            </ThemedText>
            <ThemedText type="bodyBold" variant="primary" style={styles.email}>{email}</ThemedText>
            
            {displayCode && (
              <View style={[styles.codeDisplay, { 
                backgroundColor: colorScheme === 'dark' ? colors.card : CleanPaceColors.frostBlue 
              }]}>
                <ThemedText type="caption" variant="muted">Your Code:</ThemedText>
                <ThemedText type="h2" style={[styles.codeDisplayValue, { color: colors.primary }]}>
                  {displayCode}
                </ThemedText>
              </View>
            )}
          </View>

          <View style={styles.form}>
            <View style={styles.codeContainer}>
              {code.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => { inputRefs.current[index] = ref; }}
                  style={[
                    styles.codeInput,
                    {
                      borderColor: digit ? colors.primary : colors.border,
                      backgroundColor: colorScheme === 'dark' ? colors.card : colors.background,
                      color: colors.text,
                    },
                  ]}
                  value={digit}
                  onChangeText={(value) => handleCodeChange(value, index)}
                  onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
                  keyboardType="number-pad"
                  maxLength={1}
                  selectTextOnFocus
                  editable={!loading}
                />
              ))}
            </View>

            <TouchableOpacity
              style={[
                styles.button,
                { backgroundColor: colors.primary },
                loading && { opacity: 0.6 },
              ]}
              onPress={handleVerify}
              disabled={loading}
              activeOpacity={0.7}>
              <ThemedText type="bodyBold" lightColor={CleanPaceColors.offWhite} darkColor={CleanPaceColors.offWhite}>
                {loading ? 'Verifying...' : 'Verify Code'}
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleResend} style={styles.resendButton} activeOpacity={0.7}>
              <ThemedText type="bodySmall" variant="secondary" style={styles.resendText}>
                Didn't receive code? <ThemedText type="bodyBold" variant="secondary">Resend</ThemedText>
              </ThemedText>
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
              <ThemedText type="caption" variant="muted" style={styles.dividerText}>OR</ThemedText>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            </View>

            <TouchableOpacity
              style={[styles.skipButton, { borderColor: colors.border }]}
              onPress={async () => {
                // Skip verification and login as guest
                await login(email || 'guest@runner.app');
                await initializeDemoData();
                const hasUserProfile = await hasProfile();
                if (hasUserProfile) {
                  router.replace('/(tabs)');
                } else {
                  router.replace('/(tabs)/profile');
                }
              }}
              activeOpacity={0.7}>
              <ThemedText type="bodyBold" variant="secondary">
                Skip Verification
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
  },
  email: {
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  codeDisplay: {
    marginTop: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.card,
    alignItems: 'center',
  },
  codeDisplayValue: {
    letterSpacing: 4,
    marginTop: Spacing.xs,
  },
  form: {
    width: '100%',
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  codeInput: {
    flex: 1,
    height: 56,
    borderWidth: 1,
    borderRadius: BorderRadius.card,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '600',
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
  resendButton: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  resendText: {
    // Text styling handled by ThemedText
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.md,
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

