import { useState } from 'react';
import { View, Text, Pressable, Platform, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@expo/ui/community/datetime-picker';
import {
  formatScheduleDate,
  formatScheduleTime,
  pickerValue,
  startOfToday,
} from './scheduleValue';
import { colors, font, radius, spacing, control } from '../theme/theme';

function Field({ icon, label, value, open, onPress, accessibilityLabel }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ expanded: open }}
      onPress={onPress}
      style={styles.field}
    >
      <Ionicons name={icon} size={20} color={colors.action} />
      <Text style={[styles.value, !value && styles.placeholder]}>{value || label}</Text>
      <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.muted} />
    </Pressable>
  );
}

export default function SchedulePicker({ date, time, onChangeDate, onChangeTime }) {
  const [dateOpen, setDateOpen] = useState(false);
  const [timeOpen, setTimeOpen] = useState(false);
  const earliest = startOfToday();

  const onDatePicked = (selected) => {
    if (Platform.OS === 'android') setDateOpen(false);
    if (selected instanceof Date && !Number.isNaN(selected.getTime())) onChangeDate(selected);
  };

  const onTimePicked = (selected) => {
    if (Platform.OS === 'android') setTimeOpen(false);
    if (selected instanceof Date && !Number.isNaN(selected.getTime())) onChangeTime(selected);
  };

  return (
    <View>
      <Text style={styles.label}>Date</Text>
      <Field
        icon="calendar-outline"
        label="Choose a date"
        value={date ? formatScheduleDate(date) : ''}
        open={dateOpen}
        onPress={() => {
          setTimeOpen(false);
          setDateOpen((open) => !open);
        }}
        accessibilityLabel="Schedule date"
      />
      {dateOpen && Platform.OS === 'ios' ? (
        <DateTimePicker
          value={pickerValue(date)}
          mode="date"
          display="inline"
          minimumDate={earliest}
          accentColor={colors.primary}
          onValueChange={(_event, selected) => onDatePicked(selected)}
        />
      ) : null}
      {dateOpen && Platform.OS === 'android' ? (
        <DateTimePicker
          value={pickerValue(date)}
          mode="date"
          presentation="dialog"
          minimumDate={earliest}
          accentColor={colors.primary}
          onValueChange={(_event, selected) => onDatePicked(selected)}
          onDismiss={() => setDateOpen(false)}
        />
      ) : null}

      <Text style={styles.label}>Time (Monday to Saturday, 7:00 AM to 6:00 PM)</Text>
      <Field
        icon="time-outline"
        label="Choose a time"
        value={time ? formatScheduleTime(time) : ''}
        open={timeOpen}
        onPress={() => {
          setDateOpen(false);
          setTimeOpen((open) => !open);
        }}
        accessibilityLabel="Schedule time"
      />
      {timeOpen && Platform.OS === 'ios' ? (
        <DateTimePicker
          value={pickerValue(time)}
          mode="time"
          display="spinner"
          accentColor={colors.primary}
          onValueChange={(_event, selected) => onTimePicked(selected)}
        />
      ) : null}
      {timeOpen && Platform.OS === 'android' ? (
        <DateTimePicker
          value={pickerValue(time)}
          mode="time"
          presentation="dialog"
          accentColor={colors.primary}
          onValueChange={(_event, selected) => onTimePicked(selected)}
          onDismiss={() => setTimeOpen(false)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: font.md, color: colors.muted, marginBottom: 4 },
  field: {
    minHeight: control.minHeight,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.white,
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  value: { flex: 1, fontSize: font.body, color: colors.text },
  placeholder: { color: colors.inactive },
});
