import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SPECIAL_REQUEST_COPY } from '../data/messages';
import {
  ADDITIONAL_MEAT,
  SPECIAL_REQUEST_OPTIONS,
  feeForSpecialRequest,
  validateSpecialRequest,
  type SpecialRequestDraft,
} from '../domain/specialRequest';
import { formatPeso } from '../services/orderService';
import { colors, font, radius, spacing, fonts } from '../theme/theme';

export default function SpecialRequestEditor({
  value,
  onChange,
  allergies,
  mealPrice,
}: {
  value: SpecialRequestDraft;
  onChange: (next: SpecialRequestDraft) => void;
  allergies: Array<{ name?: string }>;
  mealPrice: number;
}) {
  const check = validateSpecialRequest(value, allergies);
  const fee = feeForSpecialRequest(value);
  const active = value.options.length > 0 || value.note.trim().length > 0;

  const toggle = (option: string) => {
    const selected = value.options.includes(option);
    onChange({
      ...value,
      options: selected ? value.options.filter((item) => item !== option) : [...value.options, option],
    });
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.heading}>{SPECIAL_REQUEST_COPY.heading}</Text>
      <Text style={styles.group}>{SPECIAL_REQUEST_COPY.prepare}</Text>
      <View style={styles.options}>
        {SPECIAL_REQUEST_OPTIONS.map((option) => {
          const selected = value.options.includes(option);
          return (
            <Pressable
              key={option}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={option}
              onPress={() => toggle(option)}
              style={[styles.option, selected && styles.optionOn]}
            >
              <Text style={[styles.optionText, selected && styles.optionTextOn]}>{option}</Text>
            </Pressable>
          );
        })}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: value.options.includes(ADDITIONAL_MEAT) }}
        accessibilityLabel={ADDITIONAL_MEAT}
        onPress={() => toggle(ADDITIONAL_MEAT)}
        style={[styles.option, styles.meatOption, value.options.includes(ADDITIONAL_MEAT) && styles.optionOn]}
      >
        <Text style={[styles.optionText, value.options.includes(ADDITIONAL_MEAT) && styles.optionTextOn]}>
          {ADDITIONAL_MEAT}
        </Text>
      </Pressable>
      <Text style={styles.noteLabel}>{SPECIAL_REQUEST_COPY.noteLabel}</Text>
      <TextInput
        value={value.note}
        onChangeText={(note) => onChange({ ...value, note })}
        multiline
        accessibilityLabel={SPECIAL_REQUEST_COPY.noteLabel}
        placeholder="Please make the meat extra tender."
        placeholderTextColor={colors.inactive}
        style={styles.note}
      />
      <Text style={styles.count}>{`${value.note.trim().length}/150`}</Text>
      {!check.ok ? <Text style={styles.error}>{check.message}</Text> : null}
      {active && check.ok ? (
        <View style={styles.priceBox}>
          <Text style={styles.priceLine}>{`Meal ${formatPeso(mealPrice)}`}</Text>
          <Text style={styles.priceLine}>{`${SPECIAL_REQUEST_COPY.feeLabel} ${formatPeso(fee)}`}</Text>
          <Text style={styles.priceTotal}>{`${SPECIAL_REQUEST_COPY.mealTotal} ${formatPeso(mealPrice + fee)}`}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.lg },
  heading: { fontFamily: fonts.bold, fontSize: font.lg, color: colors.heading, marginBottom: spacing.sm },
  group: { fontFamily: fonts.bold, fontSize: font.body, color: colors.heading, marginBottom: spacing.sm },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  option: {
    minHeight: 48,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
  },
  meatOption: { alignSelf: 'flex-start', marginTop: spacing.sm },
  optionOn: { borderColor: colors.primary, backgroundColor: colors.primary },
  optionText: { fontFamily: fonts.semibold, fontSize: font.body, color: colors.text },
  optionTextOn: { color: colors.white },
  noteLabel: { fontFamily: fonts.bold, fontSize: font.body, color: colors.heading, marginTop: spacing.md },
  note: {
    marginTop: spacing.sm,
    minHeight: 96,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    padding: spacing.md,
    fontFamily: fonts.regular,
    fontSize: font.body,
    lineHeight: 24,
    color: colors.text,
    textAlignVertical: 'top',
  },
  count: { fontFamily: fonts.regular, fontSize: font.body, color: colors.muted, marginTop: spacing.xs },
  error: { fontFamily: fonts.bold, fontSize: font.body, lineHeight: 24, color: colors.danger, marginTop: spacing.sm },
  priceBox: { marginTop: spacing.md, gap: spacing.xs },
  priceLine: { fontFamily: fonts.regular, fontSize: font.body, lineHeight: 24, color: colors.text },
  priceTotal: { fontFamily: fonts.bold, fontSize: font.body, lineHeight: 24, color: colors.heading },
});
