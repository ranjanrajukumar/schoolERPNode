import { Image, Text, View } from 'react-native';
import { color } from '../theme';

/** A school's badge: its logo when the registry has one, otherwise its first letter. */
export default function SchoolBadge({ school, size = 46 }) {
  const style = { width: size, height: size, borderRadius: size / 3, backgroundColor: color.primarySoft, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' };
  const name = school.name ?? school.clientName ?? '?';
  const logo = school.logoUrl;
  return (
    <View style={style}>
      {logo ? <Image source={{ uri: logo }} style={{ width: size, height: size }} resizeMode="contain" /> : <Text style={{ fontSize: size * 0.42, fontWeight: '800', color: color.header }}>{name.slice(0, 1).toUpperCase()}</Text>}
    </View>
  );
}
