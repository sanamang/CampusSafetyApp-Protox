import { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl, SafeAreaView } from 'react-native';
import { AlertCard } from '../../components/AlertCard';
import { apiRequest } from '../../lib/api';

interface Alert {
  id: string;
  alert_type: string;
  status: string;
  latitude: number;
  longitude: number;
  created_at: string;
  student_name?: string;
}

export default function HistoryScreen() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    try {
      const data = await apiRequest('/alerts/mine');
      setAlerts(data.alerts || []);
    } catch { /* silent */ }
  }

  useEffect(() => { load(); }, []);

  async function refresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={alerts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <AlertCard alert={item} />}
        contentContainerStyle={styles.list}
        ListHeaderComponent={<Text style={styles.title}>Alert History</Text>}
        ListEmptyComponent={<Text style={styles.empty}>No alerts yet</Text>}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#7C3AED" />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  list: { padding: 20 },
  title: { fontSize: 22, fontWeight: '700', color: '#fff', marginBottom: 20 },
  empty: { color: '#555', textAlign: 'center', marginTop: 60 },
});
