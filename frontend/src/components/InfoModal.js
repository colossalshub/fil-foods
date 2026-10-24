import { Modal, View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppButton from './AppButton';
import { colors, radius, font, spacing, touch } from '../theme/theme';

export default function InfoModal({ visible, title, onClose, children, footer }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} style={styles.close}>
              <Ionicons name="close" size={22} color={colors.primary} />
            </Pressable>
          </View>
          <ScrollView style={{ marginVertical: spacing.md }}>{children}</ScrollView>
          {footer || <AppButton title="Close" onPress={onClose} />}
        </View>
      </View>
    </Modal>
  );
}

export const modalText = { fontSize: font.body, color: colors.text, lineHeight: 24 };

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: spacing.xl },
  sheet: { backgroundColor: colors.white, borderRadius: radius.md, padding: spacing.lg, maxHeight: '80%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { flex: 1, fontSize: font.lg, fontWeight: '700', color: colors.primary, paddingRight: spacing.md },
  close: { width: touch.min, height: touch.min, alignItems: 'center', justifyContent: 'center' },
});
