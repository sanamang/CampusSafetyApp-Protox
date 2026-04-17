import { View, Text, StyleSheet } from 'react-native';
import { Marker } from 'react-native-maps';

interface Props {
  officerId: string;
  latitude: number;
  longitude: number;
  name?: string;
}

export function OfficerDot({ officerId, latitude, longitude, name }: Props) {
  return (
    <Marker coordinate={{ latitude, longitude }} key={officerId}>
      <View style={styles.dot}>
        <Text style={styles.icon}>👮</Text>
      </View>
      {name && <Text style={styles.name}>{name}</Text>}
    </Marker>
  );
}

const styles = StyleSheet.create({
  dot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#16a34a',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  icon: { fontSize: 18 },
  name: { color: '#fff', fontSize: 10, textAlign: 'center', marginTop: 2 },
});
