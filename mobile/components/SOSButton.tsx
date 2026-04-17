import { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, Animated, Alert } from 'react-native';

interface Props {
  onPress: () => Promise<void>;
}

export function SOSButton({ onPress }: Props) {
  const [pressing, setPressing] = useState(false);
  const scale = new Animated.Value(1);

  async function handlePress() {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.93, duration: 80, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start();
    setPressing(true);
    try {
      await onPress();
    } finally {
      setPressing(false);
    }
  }

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        style={[styles.btn, pressing && styles.btnActive]}
        onPress={handlePress}
        disabled={pressing}
        activeOpacity={0.85}
      >
        <Text style={styles.label}>SOS</Text>
        <Text style={styles.sublabel}>Press for emergency</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#DC2626',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 30,
    elevation: 20,
    borderWidth: 6,
    borderColor: '#FF4444',
  },
  btnActive: { backgroundColor: '#b91c1c', shadowOpacity: 0.5 },
  label: { fontSize: 52, fontWeight: '900', color: '#fff', letterSpacing: 4 },
  sublabel: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 4, letterSpacing: 1 },
});
