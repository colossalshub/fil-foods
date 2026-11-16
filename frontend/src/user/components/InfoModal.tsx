import type { ReactNode, Ref } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, type ScrollViewInstance } from 'react-native';
import AppModal from './AppModal';
import { Ionicons } from '@expo/vector-icons';
import AppButton from './AppButton';
import { colors, radius, font, spacing, touch, fonts } from '../theme/theme';

export default function InfoModal({
  visible,
  title,
  onClose,
  children,
  footer,
  contentScrollRef,
}: {
  visible?: boolean;
  title?: string;
  onClose?: () => void;
  children?: ReactNode;
  footer?: ReactNode;
  contentScrollRef?: Ref<ScrollViewInstance>;
}) {
  return (
    <AppModal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} style={styles.close}>
              <Ionicons name="close" size={22} color={colors.primary} />
            </Pressable>
          </View>
          <ScrollView ref={contentScrollRef} style={{ marginVertical: spacing.md }}>{children}</ScrollView>
          {footer || <AppButton title="Close" onPress={onClose} />}
        </View>
      </View>
    </AppModal>
  );
}

export const modalText = { fontFamily: fonts.regular, fontSize: font.body, color: colors.text, lineHeight: 24 };

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: spacing.xl },
  sheet: { backgroundColor: colors.white, borderRadius: radius.md, padding: spacing.lg, maxHeight: '80%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontFamily: fonts.bold, flex: 1, fontSize: font.lg, color: colors.primary, paddingRight: spacing.md },
  close: { width: touch.min, height: touch.min, alignItems: 'center', justifyContent: 'center' },
});
