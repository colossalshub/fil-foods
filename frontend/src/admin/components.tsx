import { useEffect, useState, type ComponentProps, type ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { Text, TextInput } from './ui/StaffText.js';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COPY } from './copy.js';
import { backendSyncError, isDemoMode, subscribeAdmin, syncStaffDataFromBackend } from './data/store.js';
import { useAdmin } from './context.js';
import { adminListStatusLabel } from './domain/orderDisplay.js';
import type { OrderStatus } from './types';

const GREEN = '#146B38';

export function PhoneFrame({ children }: { children: ReactNode }) {
  const { colors } = useAdmin();
  return (
    <View style={styles.outer}>
      <View style={[styles.inner, { backgroundColor: colors.page }]}>{children}</View>
    </View>
  );
}

export function FlashBanner() {
  const { flash, clearFlash, colors } = useAdmin();
  const success = flash === COPY.loggedIn;
  return (
    <>
      {flash ? (
        <Pressable
          onPress={clearFlash}
          accessibilityRole="button"
          style={[
            styles.banner,
            success
              ? { backgroundColor: colors.mint, borderWidth: 1, borderColor: '#B8DFC3', flexDirection: 'row', alignItems: 'center', gap: 8 }
              : { backgroundColor: colors.green },
          ]}
        >
          {success ? <Ionicons name="checkmark-circle" size={20} color={colors.primary} /> : null}
          <Text style={[styles.bannerText, success && { color: colors.primary, flex: 1, textAlign: 'left' }]}>{flash}</Text>
        </Pressable>
      ) : null}
      <SyncBanner />
    </>
  );
}

/** Live-data status: an error card with Try again when Supabase reads fail, or a Demo label offline. */
export function SyncBanner() {
  const { session, colors } = useAdmin();
  const [busy, setBusy] = useState(false);
  if (!session) return null;
  if (isDemoMode()) {
    return (
      <View style={[styles.demo, { borderColor: colors.border, backgroundColor: colors.card }]} accessibilityRole="text">
        <Ionicons name="flask-outline" size={16} color={colors.muted} />
        <Text style={{ color: colors.muted, fontSize: 12, flex: 1 }}>{COPY.demoMode}</Text>
      </View>
    );
  }
  const error = backendSyncError();
  if (!error) return null;
  return (
    <View style={styles.syncError} accessibilityRole="alert">
      <Ionicons name="cloud-offline-outline" size={20} color="#9B2C2C" />
      <View style={{ flex: 1, gap: 6 }}>
        <Text style={{ color: '#7A1F1F', fontSize: 13 }}>{error}</Text>
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={async () => {
            setBusy(true);
            await syncStaffDataFromBackend();
            setBusy(false);
          }}
        >
          <Text style={{ color: '#7A1F1F', fontWeight: '700', fontSize: 13 }}>{busy ? 'Loading…' : 'Try again'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function useStoreRevision() {
  const { bump, revision } = useAdmin();
  useEffect(() => subscribeAdmin(bump), [bump]);
  return revision;
}

export function PrimaryButton({
  title,
  onPress,
  variant = 'solid',
  disabled,
}: {
  title: string;
  onPress?: () => void;
  variant?: 'solid' | 'outline' | 'danger';
  disabled?: boolean;
}) {
  const danger = variant === 'danger';
  const outline = variant === 'outline';
  const background = danger ? '#D76566' : outline ? 'transparent' : GREEN;
  const color = outline ? GREEN : '#FFFFFF';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: background, borderColor: danger ? '#D76566' : GREEN, borderWidth: outline ? 1.5 : 0 },
        (pressed || disabled) && { opacity: disabled ? 0.5 : 0.88 },
      ]}
    >
      <Text style={[styles.buttonText, { color }]}>{title}</Text>
    </Pressable>
  );
}

export function AdminField({
  icon,
  value,
  onChangeText,
  placeholder,
  secure,
  error,
  keyboardType,
  multiline,
}: {
  icon?: ComponentProps<typeof Ionicons>['name'];
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  secure?: boolean;
  error?: string | null;
  keyboardType?: 'default' | 'email-address' | 'decimal-pad';
  multiline?: boolean;
}) {
  const { colors } = useAdmin();
  return (
    <View style={styles.fieldWrap}>
      <View style={[
        styles.field,
        { backgroundColor: colors.input, borderColor: error ? '#E26A6A' : colors.border },
        multiline && { minHeight: 120, alignItems: 'flex-start' },
      ]}>
        {icon ? <Ionicons name={icon} size={18} color={colors.muted} /> : null}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          secureTextEntry={!!secure}
          keyboardType={keyboardType}
          autoCapitalize="none"
          autoCorrect={false}
          multiline={multiline}
          accessibilityLabel={placeholder}
          style={[styles.input, { color: colors.text }, multiline && { minHeight: 100, textAlignVertical: 'top' }]}
        />
      </View>
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

export function PasswordField({
  value,
  onChangeText,
  placeholder,
  error,
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  error?: string | null;
}) {
  const { colors } = useAdmin();
  const [hidden, setHidden] = useState(true);
  return (
    <View style={styles.fieldWrap}>
      <View style={[styles.field, { backgroundColor: colors.input, borderColor: error ? '#E26A6A' : colors.border }]}>
        <Ionicons name="lock-closed-outline" size={18} color={colors.muted} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          secureTextEntry={hidden}
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel={placeholder}
          style={[styles.input, { color: colors.text }]}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
          onPress={() => setHidden((current) => !current)}
          style={styles.eye}
        >
          <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={20} color={colors.muted} />
        </Pressable>
      </View>
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

export function ConfirmCard({
  visible,
  title,
  body,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  danger,
}: {
  visible: boolean;
  title: string;
  body?: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel?: () => void;
  danger?: boolean;
}) {
  const { colors } = useAdmin();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.modalBackdrop}>
        <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>{title}</Text>
          {typeof body === 'string' ? <Text style={[styles.modalBody, { color: colors.muted }]}>{body}</Text> : body}
          <PrimaryButton title={confirmLabel} onPress={onConfirm} variant={danger ? 'danger' : 'solid'} />
          {cancelLabel && onCancel ? (
            <Pressable onPress={onCancel} style={styles.modalCancel}>
              <Text style={[styles.modalCancelText, { color: colors.green }]}>{cancelLabel}</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

export function GreenHeader({
  title,
  onBack,
  right,
}: {
  title: string;
  onBack?: () => void;
  right?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const { colors } = useAdmin();
  return (
    <View style={[styles.header, { backgroundColor: colors.header, paddingTop: insets.top + 8 }]}>
      {onBack ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={onBack} style={styles.headerSide}>
          <Ionicons name="chevron-back" size={26} color="#FFFFFF" />
        </Pressable>
      ) : <View style={styles.headerSide} />}
      <Text style={styles.headerTitle} accessibilityRole="header">{title}</Text>
      <View style={styles.headerSide}>{right}</View>
    </View>
  );
}

export function FilterChips({
  options,
  value,
  onChange,
}: {
  options: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
}) {
  const { colors } = useAdmin();
  return (
    <View style={styles.chips}>
      {options.map((option) => {
        const selected = option.id === value;
        return (
          <Pressable
            key={option.id}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.id)}
            style={[
              styles.chip,
              { backgroundColor: selected ? colors.green : colors.chip, borderColor: selected ? colors.green : colors.border },
            ]}
          >
            <Text style={{ color: selected ? '#FFFFFF' : colors.text, fontWeight: '700', fontSize: 13 }}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const BADGE: Record<OrderStatus, { bg: string; fg: string }> = {
  'For Dietitian Review': { bg: '#FFDDBF', fg: '#8A4B12' },
  'Awaiting Payment': { bg: '#FFE8A3', fg: '#7A5B00' },
  Paid: { bg: '#CDE9FF', fg: '#1456A0' },
  Confirmed: { bg: '#B8E0CF', fg: '#0D5C36' },
  Preparing: { bg: '#D8F3DC', fg: '#146B38' },
  'Ready for Delivery': { bg: '#C8E8FF', fg: '#0F4F8C' },
  'Out for Delivery': { bg: '#C8E8FF', fg: '#0F4F8C' },
  'Ready for Pickup': { bg: '#C8E8FF', fg: '#0F4F8C' },
  Completed: { bg: '#1C773A', fg: '#FFFFFF' },
  Cancelled: { bg: '#D76566', fg: '#FFFFFF' },
};

const FALLBACK_BADGE = { bg: '#E8ECE9', fg: '#2A3B30' };

const LIST_BADGE: Record<string, { bg: string; fg: string }> = {
  Pending: { bg: '#FFDDBF', fg: '#8A4B12' },
  Preparing: { bg: '#D8F3DC', fg: '#146B38' },
  Delivered: { bg: '#1C773A', fg: '#FFFFFF' },
  Cancelled: { bg: '#D76566', fg: '#FFFFFF' },
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  const tone = BADGE[status] ?? FALLBACK_BADGE;
  return (
    <View style={[styles.badge, { backgroundColor: tone.bg }]}>
      <Text style={{ color: tone.fg, fontSize: 12, fontWeight: '700' }}>{status}</Text>
    </View>
  );
}

/** ADM-10 / ADM-11 list badges: Pending, Preparing, Delivered, Cancelled. */
export function AdminListStatusBadge({ status }: { status: OrderStatus }) {
  const label = adminListStatusLabel(status);
  const tone = LIST_BADGE[label] ?? BADGE[status] ?? FALLBACK_BADGE;
  return (
    <View style={[styles.badge, { backgroundColor: tone.bg }]}>
      <Text style={{ color: tone.fg, fontSize: 12, fontWeight: '700' }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  syncError: { flexDirection: 'row', gap: 10, padding: 12, borderRadius: 14, backgroundColor: '#FDECEC', borderWidth: 1, borderColor: '#F3C1C1', marginBottom: 10 },
  demo: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1, marginBottom: 8, alignSelf: 'flex-start' },
  outer: { flex: 1, backgroundColor: '#1E2A22', alignItems: 'center' },
  inner: { flex: 1, width: '100%', maxWidth: 430 },
  banner: { marginTop: 4, borderRadius: 12, paddingVertical: 11, paddingHorizontal: 14 },
  bannerText: { color: '#FFFFFF', fontWeight: '700', textAlign: 'center', fontSize: 15 },
  button: { minHeight: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  buttonText: { fontSize: 16, fontWeight: '700' },
  fieldWrap: { marginBottom: 12 },
  field: {
    minHeight: 52,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: { flex: 1, fontSize: 16, paddingVertical: 12 },
  eye: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  fieldError: { color: '#D64545', fontSize: 13, marginTop: 6, lineHeight: 18 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(16, 22, 18, 0.45)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  modalCard: { width: '100%', maxWidth: 360, borderRadius: 20, padding: 20, gap: 12 },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  modalBody: { fontSize: 15, lineHeight: 22 },
  modalCancel: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  modalCancelText: { fontWeight: '700', fontSize: 16 },
  header: { flexDirection: 'row', alignItems: 'center', paddingBottom: 14, paddingHorizontal: 4 },
  headerSide: { width: 48, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 8 },
  badge: { borderRadius: 999, paddingHorizontal: 11, paddingVertical: 5, minHeight: 26, justifyContent: 'center' },
});
