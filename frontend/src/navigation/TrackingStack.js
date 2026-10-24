import { createNativeStackNavigator } from '@react-navigation/native-stack';
import TrackingScreen from '../screens/TrackingScreen';
import OrderDetailScreen from '../screens/OrderDetailScreen';

const Stack = createNativeStackNavigator();

export default function TrackingStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="TrackingList" component={TrackingScreen} />
      <Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
    </Stack.Navigator>
  );
}
