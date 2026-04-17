import { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Alert, ScrollView, SafeAreaView,
} from 'react-native';
import * as Location from 'expo-location';
import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SOSButton } from '../../components/SOSButton';
import { apiRequest, getStoredUser } from '../../lib/api';

const SOCKET_URL = 'http://localhost:3000';

interface OfficerLocation {
  officer_id: string;
  latitude: number;
  longitude: number;
  name?: string;
}

interface User {
  id: string;
  role: string;
  name: string;
}

export default function HomeScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [nearbyOfficers, setNearbyOfficers] = useState<OfficerLocation[]>([]);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    getStoredUser().then(setUser);

    (async () => {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;
      const socket = io(SOCKET_URL, { auth: { token } });
      socketRef.current = socket;

      socket.on('officer:location', (data: OfficerLocation) => {
        setNearbyOfficers((prev) => {
          const filtered = prev.filter((o) => o.officer_id !== data.officer_id);
          return [...filtered, data];
        });
      });

      // Officers broadcast location every 10s
      if (user?.role === 'officer') {
        const sendLocation = async () => {
          const loc = await Location.getCurrentPositionAsync({});
          socket.emit('officer-location', {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          });
        };
        sendLocation();
        const interval = setInterval(sendLocation, 10000);
        return () => {
          clearInterval(interval);
          socket.disconnect();
        };
      }

      return () => socket.disconnect();
    })();
  }, []);

  async function sendSOS() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission denied', 'Location access is required to send an alert.');
      return;
    }
    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    await apiRequest('/alerts', {
      method: 'POST',
      body: JSON.stringify({
        alert_type: 'SOS',
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      }),
    });
    setConfirmed(true);
    setTimeout(() => setConfirmed(false), 6000);
  }

  if (!user) return null;

  if (user.role === 'officer') {
    return <OfficerHome />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.greeting}>Hi, {user.name} 👋</Text>
        <Text style={styles.sub}>Press SOS to alert campus security</Text>

        <View style={styles.sosWrap}>
          <SOSButton onPress={sendSOS} />
        </View>

        {confirmed && (
          <View style={styles.confirmation}>
            <Text style={styles.confirmIcon}>✅</Text>
            <Text style={styles.confirmText}>Alert sent — help is on the way!</Text>
          </View>
        )}

        <Text style={styles.officersLabel}>
          Nearby Officers ({nearbyOfficers.length} active)
        </Text>
        {nearbyOfficers.map((o) => (
          <View key={o.officer_id} style={styles.officerRow}>
            <Text style={styles.officerDot}>👮</Text>
            <Text style={styles.officerName}>{o.name || 'Officer'}</Text>
            <Text style={styles.officerCoords}>
              {o.latitude.toFixed(4)}, {o.longitude.toFixed(4)}
            </Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function OfficerHome() {
  const [alerts, setAlerts] = useState<unknown[]>([]);

  useEffect(() => {
    apiRequest('/api/map/alerts').then((d) => setAlerts(d.alerts || []));
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.greeting}>Officer Dashboard</Text>
        <Text style={styles.sub}>Active alerts near you</Text>
        {alerts.length === 0 && <Text style={styles.empty}>No active alerts</Text>}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  scroll: { alignItems: 'center', paddingVertical: 32, paddingHorizontal: 20 },
  greeting: { fontSize: 22, fontWeight: '700', color: '#fff', alignSelf: 'flex-start' },
  sub: { fontSize: 14, color: '#888', alignSelf: 'flex-start', marginBottom: 48, marginTop: 4 },
  sosWrap: { marginBottom: 48 },
  confirmation: {
    backgroundColor: '#14532d',
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    width: '100%',
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#16a34a',
  },
  confirmIcon: { fontSize: 32, marginBottom: 8 },
  confirmText: { color: '#86efac', fontSize: 16, fontWeight: '600', textAlign: 'center' },
  officersLabel: { color: '#888', fontSize: 13, alignSelf: 'flex-start', marginBottom: 12 },
  officerRow: {
    flexDirection: 'row', alignItems: 'center', width: '100%',
    backgroundColor: '#16213e', borderRadius: 10, padding: 12, marginBottom: 8,
    borderWidth: 1, borderColor: '#2d2d5e',
  },
  officerDot: { fontSize: 20, marginRight: 10 },
  officerName: { color: '#fff', fontWeight: '600', flex: 1 },
  officerCoords: { color: '#555', fontSize: 12 },
  empty: { color: '#555', marginTop: 32 },
});
