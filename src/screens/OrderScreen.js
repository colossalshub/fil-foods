import PlaceholderScreen from './PlaceholderScreen';
import AppButton from '../components/AppButton';

export default function OrderScreen({ navigation }) {
  return (
    <PlaceholderScreen title="Order" icon="cart-outline" message="Your cart is empty. Add meals to get started.">
      <AppButton title="Browse Meals" onPress={() => navigation.navigate('Meals')} style={{ alignSelf: 'stretch' }} />
    </PlaceholderScreen>
  );
}
