import { createElement } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, font, radius, spacing, control } from '../theme/theme';

function WebDate({ label, value, onChange, accessibilityLabel }) {
  return (
    <View style={styles.field}>
      <Text style={styles.caption}>{label}</Text>
      {createElement('input', {
        type: 'date',
        value,
        'aria-label': accessibilityLabel,
        onChange: (event) => onChange(event.target.value),
        style: {
          width: '100%',
          minHeight: control.minHeight - 18,
          boxSizing: 'border-box',
          border: 'none',
          padding: 0,
          fontSize: font.body,
          fontFamily: 'inherit',
          color: value ? colors.text : colors.inactive,
          backgroundColor: 'transparent',
        },
      })}
    </View>
  );
}

export default function DateRangeFields({ dateFrom, dateTo, onChangeFrom, onChangeTo }) {
  return (
    <View style={styles.row}>
      <WebDate label="From" value={dateFrom} onChange={onChangeFrom} accessibilityLabel="Date from" />
      <WebDate label="To" value={dateTo} onChange={onChangeTo} accessibilityLabel="Date to" />
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
    paddingVertical: spacing.xs,
    backgroundColor: colors.surface,
    justifyContent: 'center',
  },
  caption: { fontSize: font.xs, color: colors.muted },
});
