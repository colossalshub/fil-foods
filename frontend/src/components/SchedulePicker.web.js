import { createElement } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { dateFromIsoDay, timeFromClock, toClock, toIsoDay } from './scheduleValue';
import { colors, font, radius, spacing, control } from '../theme/theme';

function WebInput({ type, value, onChange, accessibilityLabel }) {
  return createElement('input', {
    type,
    value,
    'aria-label': accessibilityLabel,
    onChange: (event) => onChange(event.target.value),
    style: {
      minHeight: control.minHeight,
      width: '100%',
      boxSizing: 'border-box',
      border: `1px solid ${colors.border}`,
      borderRadius: radius.sm,
      padding: `0 ${spacing.md}px`,
      fontSize: font.body,
      fontFamily: 'inherit',
      color: colors.text,
      backgroundColor: colors.white,
      marginBottom: spacing.md,
    },
  });
}

export default function SchedulePicker({ date, time, onChangeDate, onChangeTime }) {
  return (
    <View>
      <Text style={styles.label}>Date</Text>
      <WebInput
        type="date"
        value={toIsoDay(date)}
        accessibilityLabel="Schedule date"
        onChange={(value) => onChangeDate(dateFromIsoDay(value))}
      />
      <Text style={styles.label}>Time (Monday to Saturday, 7:00 AM to 6:00 PM)</Text>
      <WebInput
        type="time"
        value={toClock(time)}
        accessibilityLabel="Schedule time"
        onChange={(value) => onChangeTime(timeFromClock(value))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: font.md, color: colors.muted, marginBottom: 4 },
});
