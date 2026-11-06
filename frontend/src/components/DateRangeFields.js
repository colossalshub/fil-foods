import { useState } from 'react';
import { View, Text, Pressable, Platform, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@expo/ui/community/datetime-picker';
import { dateFromIsoDay, formatScheduleDate, toIsoDay } from './scheduleValue';
import { colors, font, radius, spacing, control } from '../theme/theme';

function pickerStart(iso) {
  const parsed = dateFromIsoDay(iso);
  if (parsed) return parsed;
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  return today;
}

function Field({ label, value, open, onPress, onClear, accessibilityLabel }) {
  const date = dateFromIsoDay(value);
  return (
    <View style={styles.field}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ expanded: open }}
        onPress={onPress}
        style={styles.fieldHit}
      >
        <Ionicons name="calendar-outline" size={18} color={colors.primary} />
        <Text style={[styles.value, !date && styles.placeholder]} numberOfLines={1}>
          {date ? formatScheduleDate(date) : label}
        </Text>
        {value ? null : <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.muted} />}
      </Pressable>
      {value ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Clear ${accessibilityLabel}`}
          onPress={onClear}
          hitSlop={8}
        >
          <Ionicons name="close-circle" size={18} color={colors.muted} />
        </Pressable>
      ) : null}
    </View>
  );
}

export default function DateRangeFields({ dateFrom, dateTo, onChangeFrom, onChangeTo }) {
  const [open, setOpen] = useState(null);
  const activeValue = open === 'to' ? dateTo : dateFrom;

  const onPicked = (selected) => {
    if (!(selected instanceof Date) || Number.isNaN(selected.getTime())) return;
    const iso = toIsoDay(selected);
    if (open === 'to') onChangeTo(iso);
    else onChangeFrom(iso);
    if (Platform.OS === 'android') setOpen(null);
  };

  return (
    <View>
      <View style={styles.row}>
        <Field
          label="From"
          value={dateFrom}
          open={open === 'from'}
          accessibilityLabel="Date from"
          onPress={() => setOpen((current) => (current === 'from' ? null : 'from'))}
          onClear={() => {
            onChangeFrom('');
            setOpen(null);
          }}
        />
        <Field
          label="To"
          value={dateTo}
          open={open === 'to'}
          accessibilityLabel="Date to"
          onPress={() => setOpen((current) => (current === 'to' ? null : 'to'))}
          onClear={() => {
            onChangeTo('');
            setOpen(null);
          }}
        />
      </View>
      {open && Platform.OS === 'ios' ? (
        <DateTimePicker
          value={pickerStart(activeValue)}
          mode="date"
          display="inline"
          accentColor={colors.primary}
          onValueChange={(_event, selected) => onPicked(selected)}
        />
      ) : null}
      {open && Platform.OS === 'android' ? (
        <DateTimePicker
          value={pickerStart(activeValue)}
          mode="date"
          presentation="dialog"
          accentColor={colors.primary}
          onValueChange={(_event, selected) => onPicked(selected)}
          onDismiss={() => setOpen(null)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm },
  field: {
    flex: 1,
    minHeight: control.minHeight,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  fieldHit: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, minHeight: control.minHeight },
  value: { flex: 1, fontSize: font.body, color: colors.text },
  placeholder: { color: colors.inactive },
});
