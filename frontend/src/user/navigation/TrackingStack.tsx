import { createNativeStackNavigator } from '@react-navigation/native-stack';
import TrackingScreen from '../screens/TrackingScreen';
import OrderStatusScreen from '../screens/OrderStatusScreen';
import OrderDetailScreen from '../screens/OrderDetailScreen';
import OrderScreen from '../screens/OrderScreen';
import AlertsScreen from '../screens/AlertsScreen';
import OrderPaymentScreen from '../screens/checkout/OrderPaymentScreen';
import OrderPaymentSuccessScreen from '../screens/checkout/OrderPaymentSuccessScreen';

const Stack = createNativeStackNavigator();

export default function TrackingStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="TrackingList" component={TrackingScreen} />
      <Stack.Screen name="OrderStatus" component={OrderStatusScreen} />
      <Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
      <Stack.Screen name="OrderPayment" component={OrderPaymentScreen} />
      <Stack.Screen name="OrderPaymentSuccess" component={OrderPaymentSuccessScreen} />
      <Stack.Screen name="Checkout" component={OrderScreen} />
      <Stack.Screen name="Notifications" component={AlertsScreen} />
    </Stack.Navigator>
  );
}
