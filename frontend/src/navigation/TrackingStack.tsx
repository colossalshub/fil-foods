import { createNativeStackNavigator } from '@react-navigation/native-stack';
import TrackingScreen from '../screens/TrackingScreen';
import OrderDetailScreen from '../screens/OrderDetailScreen';
import OrderScreen from '../screens/OrderScreen';
import AlertsScreen from '../screens/AlertsScreen';

const Stack = createNativeStackNavigator();

export default function TrackingStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="TrackingList" component={TrackingScreen} />
      <Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
      <Stack.Screen name="Checkout" component={OrderScreen} />
      <Stack.Screen name="Notifications" component={AlertsScreen} />
    </Stack.Navigator>
  );
}
