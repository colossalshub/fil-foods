import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Edge, SafeAreaView } from 'react-native-safe-area-context';
import AuthBackgroundDecor from './AuthBackgroundDecor';
import { colors } from '../theme/theme';

type AppPageShellProps = {
  children: ReactNode;
  edges?: Edge[];
  contentStyle?: StyleProp<ViewStyle>;
};

export default function AppPageShell({ children, edges = ['top'], contentStyle }: AppPageShellProps) {
  return (
    <View style={styles.page}>
      <View style={styles.root}>
        <AuthBackgroundDecor />
        <SafeAreaView edges={edges} style={[styles.safe, contentStyle]}>
          {children}
        </SafeAreaView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.authPage,
    alignItems: 'center',
  },
  root: {
    flex: 1,
    width: '100%',
    maxWidth: 430,
    overflow: 'hidden',
    backgroundColor: colors.authPage,
  },
  safe: {
    flex: 1,
  },
});