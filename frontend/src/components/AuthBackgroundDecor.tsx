import { View, StyleSheet } from 'react-native';

export default function AuthBackgroundDecor() {
  return (
    <View pointerEvents="none" style={styles.decor}>
      <View style={styles.topLeafField} />
      <View style={styles.bottomRightField} />
      <View style={styles.bottomLeaves}>
        <View style={[styles.bottomLeaf, styles.bottomLeafOne]} />
        <View style={[styles.bottomLeaf, styles.bottomLeafTwo]} />
        <View style={[styles.bottomLeaf, styles.bottomLeafThree]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  decor: { ...StyleSheet.absoluteFill, overflow: 'hidden' },
  topLeafField: {
    position: 'absolute', top: -150, left: -88, width: 380, height: 290,
    backgroundColor: '#B8D99F', borderBottomRightRadius: 220, transform: [{ rotate: '-13deg' }],
  },
  bottomRightField: {
    position: 'absolute', width: 220, height: 135, right: -88, bottom: -78,
    backgroundColor: '#B8D99F', borderTopLeftRadius: 36, transform: [{ rotate: '-34deg' }],
  },
  bottomLeaves: { position: 'absolute', left: 0, bottom: -4, width: 100, height: 86 },
  bottomLeaf: {
    position: 'absolute', width: 72, height: 30, backgroundColor: '#C6E2AD',
    borderTopLeftRadius: 38, borderBottomRightRadius: 38,
  },
  bottomLeafOne: { left: -34, bottom: 20, transform: [{ rotate: '76deg' }] },
  bottomLeafTwo: { left: 10, bottom: 26, transform: [{ rotate: '-18deg' }] },
  bottomLeafThree: { left: 4, bottom: -1, transform: [{ rotate: '24deg' }] },
});
