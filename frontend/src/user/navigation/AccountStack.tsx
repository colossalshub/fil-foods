import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ProfileScreen from '../screens/ProfileScreen';
import AlertsScreen from '../screens/AlertsScreen';
import FeedbackScreen from '../screens/FeedbackScreen';
import FaqScreen from '../screens/FaqScreen';

const Stack = createNativeStackNavigator();

export default function AccountStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AccountMain" component={ProfileScreen} />
      <Stack.Screen name="Alerts" component={AlertsScreen} />
      <Stack.Screen name="Feedback" component={FeedbackScreen} />
      <Stack.Screen name="Faq" component={FaqScreen} />
    </Stack.Navigator>
  );
}
