import { Modal, View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppButton from './AppButton';
import { colors, radius, font, spacing } from '../theme/theme';

export default function InfoModal({ visible, title, onClose, children, footer }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={8}><Ionicons name="close" size={22} color={colors.primary} /></Pressable>
          </View>
          <ScrollView style={{ marginVertical: spacing.md }}>{children}</ScrollView>
          {footer || <AppButton title="Close" onPress={onClose} />}
        </View>
      </View>
    </Modal>
  );
}

export const modalText = { fontSize: font.sm, color: colors.text, lineHeight: 19 };

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: spacing.xl },
  sheet: { backgroundColor: colors.white, borderRadius: radius.md, padding: spacing.lg, maxHeight: '80%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: font.lg, fontWeight: '700', color: colors.primary },
});
