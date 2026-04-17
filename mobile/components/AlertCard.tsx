import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface Alert {
  id: string;
  alert_type: string;
  status: string;
  latitude: number;
  longitude: number;
  created_at: string;
  student_name?: string;
}

interface Props {
  alert: Alert;
  onAcknowledge?: () => void;
  onResolve?: () => void;
}

const TYPE_COLORS: Record<string, string> = {
  SOS: '#DC2626',
  Medical: '#2563EB',
  Fire: '#D97706',
  Suspicious: '#7C3AED',
};

const STATUS_COLORS: Record<string, string> = {
  pending: '#DC2626',
  acknowledged: '#D97706',
  resolved: '#16a34a',
};

export function AlertCard({ alert, onAcknowledge, onResolve }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.typeBadge, { backgroundColor: TYPE_COLORS[alert.alert_type] || '#7C3AED' }]}>
          <Text style={styles.typeText}>{alert.alert_type}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[alert.status] || '#888' }]}>
          <Text style={styles.statusText}>{alert.status}</Text>
        </View>
      </View>

      {alert.student_name && <Text style={styles.name}>{alert.student_name}</Text>}
      <Text style={styles.coords}>📍 {alert.latitude.toFixed(4)}, {alert.longitude.toFixed(4)}</Text>
      <Text style={styles.time}>{new Date(alert.created_at).toLocaleString()}</Text>

      {(onAcknowledge || onResolve) && (
        <View style={styles.actions}>
          {onAcknowledge && alert.status === 'pending' && (
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#D97706' }]} onPress={onAcknowledge}>
              <Text style={styles.actionText}>Acknowledge</Text>
            </TouchableOpacity>
          )}
          {onResolve && alert.status !== 'resolved' && (
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#16a34a' }]} onPress={onResolve}>
              <Text style={styles.actionText}>Resolve</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#16213e',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2d2d5e',
  },
  header: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  typeBadge: { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  typeText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  statusBadge: { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { color: '#fff', fontWeight: '600', fontSize: 12 },
  name: { color: '#fff', fontWeight: '600', fontSize: 15, marginBottom: 4 },
  coords: { color: '#888', fontSize: 13, marginBottom: 2 },
  time: { color: '#555', fontSize: 12, marginBottom: 8 },
  actions: { flexDirection: 'row', gap: 10 },
  actionBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  actionText: { color: '#fff', fontWeight: '700', fontSize: 13 },
});
