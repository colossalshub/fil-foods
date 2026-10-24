import { View, Text, StyleSheet } from 'react-native';
import { colors, font, spacing, radius } from '../theme/theme';

export default function FormMessage({ messages, tone = 'error' }) {
  const list = (Array.isArray(messages) ? messages : [messages]).filter(Boolean);
  if (!list.length) return null;
  return (
    <ViewMessage tone={tone}>
      {list.map((message, index) => (
        <Text key={`${message}-${index}`} style={[styles.text, tone === 'ok' && styles.okText]}>
          {message}
        </Text>
      ))}
    </ViewMessage>
  );
}

function ViewMessage({ tone, children }) {
  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[styles.box, tone === 'ok' ? styles.ok : styles.error]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.lg },
  error: { backgroundColor: '#FDECEC' },
  ok: { backgroundColor: colors.tint },
  text: { fontSize: font.body, color: colors.danger, lineHeight: 22 },
  okText: { color: colors.primary },
});
