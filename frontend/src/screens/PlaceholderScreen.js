import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import ScreenHeader from '../components/ScreenHeader';
import { colors, card, font, spacing } from '../theme/theme';

export default function PlaceholderScreen({ title, icon, message, children }) {
  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScreenHeader title={title} />
      <View style={styles.body}>
        <View style={styles.card}>
          <Ionicons name={icon} size={44} color={colors.secondary} />
          <Text style={styles.msg}>{message}</Text>
          {children}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  body: { flex: 1, padding: spacing.lg, justifyContent: 'center' },
  card: { ...card, alignItems: 'center', padding: spacing.xl },
  msg: { fontSize: font.md, color: colors.muted, textAlign: 'center', marginVertical: spacing.md },
});
