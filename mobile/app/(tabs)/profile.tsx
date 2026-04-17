import { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, SafeAreaView, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { apiRequest, getStoredUser, logout } from '../../lib/api';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  student_id?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
}

export default function ProfileScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [name, setName] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getStoredUser().then((u: User) => {
      if (!u) return;
      setUser(u);
      setName(u.name || '');
      setContactName(u.emergency_contact_name || '');
      setContactPhone(u.emergency_contact_phone || '');
    });
  }, []);

  async function save() {
    if (!user) return;
    setSaving(true);
    try {
      const data = await apiRequest(`/users/${user.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name,
          emergency_contact_name: contactName,
          emergency_contact_phone: contactPhone,
        }),
      });
      setUser((prev) => prev ? { ...prev, ...data.user } : prev);
      Alert.alert('Saved', 'Profile updated');
    } catch (err: unknown) {
      Alert.alert('Error', (err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    await logout();
    router.replace('/login');
  }

  if (!user) return <View style={styles.container}><ActivityIndicator color="#7C3AED" /></View>;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Profile</Text>

        <View style={styles.badge}>
          <Text style={styles.badgeText}>{user.role.toUpperCase()}</Text>
        </View>

        <Text style={styles.email}>{user.email}</Text>
        {user.student_id && <Text style={styles.studentId}>Student ID: {user.student_id}</Text>}

        <Text style={styles.label}>Full Name</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholderTextColor="#666" />

        <Text style={styles.label}>Emergency Contact Name</Text>
        <TextInput style={styles.input} value={contactName} onChangeText={setContactName}
          placeholder="e.g. Jane Doe" placeholderTextColor="#666" />

        <Text style={styles.label}>Emergency Contact Phone</Text>
        <TextInput style={styles.input} value={contactPhone} onChangeText={setContactPhone}
          placeholder="e.g. +1 555 000 0000" placeholderTextColor="#666" keyboardType="phone-pad" />

        <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  scroll: { paddingHorizontal: 24, paddingVertical: 32 },
  title: { fontSize: 26, fontWeight: '700', color: '#fff', marginBottom: 16 },
  badge: {
    alignSelf: 'flex-start', backgroundColor: '#7C3AED',
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 4, marginBottom: 8,
  },
  badgeText: { color: '#fff', fontWeight: '700', fontSize: 11, letterSpacing: 1 },
  email: { color: '#888', fontSize: 14, marginBottom: 4 },
  studentId: { color: '#555', fontSize: 13, marginBottom: 24 },
  label: { color: '#888', fontSize: 13, marginBottom: 6, marginTop: 14 },
  input: {
    backgroundColor: '#16213e', color: '#fff', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 13, fontSize: 15,
    borderWidth: 1, borderColor: '#2d2d5e',
  },
  saveBtn: {
    backgroundColor: '#7C3AED', borderRadius: 12, paddingVertical: 15,
    alignItems: 'center', marginTop: 28, marginBottom: 14,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  logoutBtn: { alignItems: 'center', paddingVertical: 12 },
  logoutText: { color: '#DC2626', fontSize: 15, fontWeight: '600' },
});
