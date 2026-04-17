import { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiRequest } from '../../lib/api';

const SOCKET_URL = 'http://localhost:3000';

interface Pin {
  id: string;
  latitude: number;
  longitude: number;
  type: 'alert' | 'officer';
  label?: string;
  alert_type?: string;
}

const ALERT_COLORS: Record<string, string> = {
  SOS: '#DC2626',
  Medical: '#2563EB',
  Fire: '#D97706',
  Suspicious: '#7C3AED',
};

export default function MapScreen() {
  const [region, setRegion] = useState({
    latitude: 37.7749, longitude: -122.4194,
    latitudeDelta: 0.01, longitudeDelta: 0.01,
  });
  const [pins, setPins] = useState<Pin[]>([]);
  const [loading, setLoading] = useState(true);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        setRegion((r) => ({ ...r, latitude: loc.coords.latitude, longitude: loc.coords.longitude }));
      }

      const [alertsData, officersData] = await Promise.all([
        apiRequest('/map/alerts'),
        apiRequest('/map/officers'),
      ]).catch(() => [{ alerts: [] }, { officers: [] }]);

      const alertPins: Pin[] = (alertsData.alerts || []).map((a: {id: string; latitude: number; longitude: number; alert_type: string}) => ({
        id: `alert-${a.id}`,
        latitude: a.latitude,
        longitude: a.longitude,
        type: 'alert' as const,
        alert_type: a.alert_type,
        label: a.alert_type,
      }));

      const officerPins: Pin[] = (officersData.officers || []).map((o: {officer_id: string; latitude: number; longitude: number; name?: string}) => ({
        id: `officer-${o.officer_id}`,
        latitude: o.latitude,
        longitude: o.longitude,
        type: 'officer' as const,
        label: o.name || 'Officer',
      }));

      setPins([...alertPins, ...officerPins]);
      setLoading(false);

      const token = await AsyncStorage.getItem('token');
      if (!token) return;
      const socket = io(SOCKET_URL, { auth: { token } });
      socketRef.current = socket;

      socket.on('officer:location', (data: { officer_id: string; latitude: number; longitude: number; name?: string }) => {
        setPins((prev) => {
          const filtered = prev.filter((p) => p.id !== `officer-${data.officer_id}`);
          return [...filtered, {
            id: `officer-${data.officer_id}`,
            latitude: data.latitude,
            longitude: data.longitude,
            type: 'officer',
            label: data.name || 'Officer',
          }];
        });
      });

      socket.on('alert:new', (a: { id: string; latitude: number; longitude: number; alert_type: string }) => {
        setPins((prev) => [...prev, {
          id: `alert-${a.id}`,
          latitude: a.latitude,
          longitude: a.longitude,
          type: 'alert',
          alert_type: a.alert_type,
          label: a.alert_type,
        }]);
      });

      return () => socket.disconnect();
    })();
  }, []);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#7C3AED" />
        <Text style={styles.loadingText}>Loading map…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        region={region}
        showsUserLocation
        showsMyLocationButton
      >
        {pins.map((pin) => (
          <Marker
            key={pin.id}
            coordinate={{ latitude: pin.latitude, longitude: pin.longitude }}
            title={pin.label}
            pinColor={pin.type === 'officer' ? '#16a34a' : (ALERT_COLORS[pin.alert_type || ''] || '#DC2626')}
          />
        ))}
      </MapView>

      <View style={styles.legend}>
        <Text style={styles.legendItem}><Text style={{ color: '#DC2626' }}>●</Text> Alert</Text>
        <Text style={styles.legendItem}><Text style={{ color: '#16a34a' }}>●</Text> Officer</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  map: { flex: 1 },
  loading: { flex: 1, backgroundColor: '#1a1a2e', justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: '#888' },
  legend: {
    position: 'absolute', bottom: 24, left: 16,
    backgroundColor: 'rgba(22,33,62,0.9)', borderRadius: 10, padding: 12,
    flexDirection: 'row', gap: 16,
  },
  legendItem: { color: '#fff', fontSize: 13 },
});
