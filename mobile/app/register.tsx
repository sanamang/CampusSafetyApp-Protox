import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, ScrollView, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { register } from '../lib/api';

const ROLES = ['student', 'officer', 'admin'];

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [studentId, setStudentId] = useState('');
  const [role, setRole] = useState('student');
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    if (!name || !email || !password) {
      Alert.alert('Error', 'Name, email and password are required');
      return;
    }
    setLoading(true);
    try {
      await register({ name, email: email.trim().toLowerCase(), password, role, student_id: studentId || undefined });
      router.replace('/(tabs)');
    } catch (err: unknown) {
      Alert.alert('Registration Failed', (err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.inner}>
      <Text style={styles.title}>Create Account</Text>

      <TextInput style={styles.input} placeholder="Full Name" placeholderTextColor="#666"
        value={name} onChangeText={setName} />
      <TextInput style={styles.input} placeholder="Email" placeholderTextColor="#666"
        autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
      <TextInput style={styles.input} placeholder="Password" placeholderTextColor="#666"
        secureTextEntry value={password} onChangeText={setPassword} />
      <TextInput style={styles.input} placeholder="Student ID (optional)" placeholderTextColor="#666"
        value={studentId} onChangeText={setStudentId} />

      <Text style={styles.label}>Role</Text>
      <View style={styles.roleRow}>
        {ROLES.map((r) => (
          <TouchableOpacity key={r} style={[styles.roleBtn, role === r && styles.roleBtnActive]}
            onPress={() => setRole(r)}>
            <Text style={[styles.roleBtnText, role === r && styles.roleBtnTextActive]}>
              {r.charAt(0).toUpperCase() + r.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.btn} onPress={handleRegister} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Create Account</Text>}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.back()}>
        <Text style={styles.link}>Already have an account? Sign in</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  inner: { justifyContent: 'center', paddingHorizontal: 32, paddingVertical: 60 },
  title: { fontSize: 28, fontWeight: '700', color: '#fff', marginBottom: 32 },
  input: {
    backgroundColor: '#16213e',
    color: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2d2d5e',
  },
  label: { color: '#888', fontSize: 13, marginBottom: 8 },
  roleRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  roleBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 10,
    borderWidth: 1, borderColor: '#2d2d5e', alignItems: 'center',
  },
  roleBtnActive: { backgroundColor: '#7C3AED', borderColor: '#7C3AED' },
  roleBtnText: { color: '#888', fontWeight: '600' },
  roleBtnTextActive: { color: '#fff' },
  btn: {
    backgroundColor: '#7C3AED', borderRadius: 12, paddingVertical: 16,
    alignItems: 'center', marginBottom: 20,
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  link: { color: '#7C3AED', textAlign: 'center', fontSize: 14 },
});
