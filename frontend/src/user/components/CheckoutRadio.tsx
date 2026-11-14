import { View } from 'react-native';
import { checkoutFlow } from '../styles/checkoutFlow';

export default function CheckoutRadio({ selected }: { selected?: boolean }) {
  return (
    <View style={[checkoutFlow.radio, selected && checkoutFlow.radioOn]}>
      {selected ? <View style={checkoutFlow.radioDot} /> : null}
    </View>
  );
}