import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ProfileScreen from '../screens/ProfileScreen';
import AlertsScreen from '../screens/AlertsScreen';
import FeedbackScreen from '../screens/FeedbackScreen';
import FaqScreen from '../screens/FaqScreen';
import PlansScreen from '../screens/visitor/PlansScreen';
import {
  PlanPaymentGatewayScreen,
  PlanPaymentScreen,
  PlanPaymentSuccessScreen,
} from '../screens/checkout/PlanPaymentScreens';

const Stack = createNativeStackNavigator();

export default function AccountStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AccountMain" component={ProfileScreen} />
      <Stack.Screen name="Plans" component={PlansScreen} />
      <Stack.Screen name="PlanPayment" component={PlanPaymentScreen} />
      <Stack.Screen name="PlanPaymentGateway" component={PlanPaymentGatewayScreen} />
      <Stack.Screen name="PlanPaymentSuccess" component={PlanPaymentSuccessScreen} />
      <Stack.Screen name="Alerts" component={AlertsScreen} />
      <Stack.Screen name="Feedback" component={FeedbackScreen} />
      <Stack.Screen name="Faq" component={FaqScreen} />
    </Stack.Navigator>
  );
}
