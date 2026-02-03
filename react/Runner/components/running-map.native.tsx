import { StyleSheet, View, Platform } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';

interface RunningMapProps {
  latitude: number;
  longitude: number;
  colors: typeof Colors.light;
}

export default function RunningMap({ latitude, longitude, colors }: RunningMapProps) {
  return (
    <MapView
      provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
      style={styles.map}
      initialRegion={{
        latitude,
        longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }}
      showsUserLocation={true}
      showsMyLocationButton={true}
      followsUserLocation={true}
      mapType="standard">
      <Marker
        coordinate={{ latitude, longitude }}
        title="Your Location"
        description="You are here">
        <View style={[styles.markerContainer, { backgroundColor: colors.running }]}>
          <IconSymbol name="location.fill" size={24} color="#FFFFFF" />
        </View>
      </Marker>
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: {
    flex: 1,
  },
  markerContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
});

