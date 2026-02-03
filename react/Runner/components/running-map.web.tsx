import { StyleSheet, View } from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';

interface RunningMapProps {
  latitude: number;
  longitude: number;
  colors: typeof Colors.light;
}

export default function RunningMap({ latitude, longitude, colors }: RunningMapProps) {
  return (
    <View style={styles.mapPlaceholder}>
      <IconSymbol name="map.fill" size={64} color={colors.running} />
      <ThemedText style={styles.mapPlaceholderText}>Map View</ThemedText>
      <ThemedText style={styles.mapPlaceholderSubtext}>
        Location: {latitude.toFixed(6)}, {longitude.toFixed(6)}
      </ThemedText>
      <ThemedText style={styles.mapPlaceholderNote}>
        Maps are available on iOS and Android devices
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    gap: 12,
    padding: 20,
  },
  mapPlaceholderText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 8,
  },
  mapPlaceholderSubtext: {
    fontSize: 14,
    opacity: 0.7,
    marginTop: 4,
  },
  mapPlaceholderNote: {
    fontSize: 12,
    opacity: 0.5,
    marginTop: 8,
    textAlign: 'center',
  },
});

