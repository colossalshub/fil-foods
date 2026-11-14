import { createNativeStackNavigator } from '@react-navigation/native-stack';
import BuildTodaysMealsScreen from '../screens/BuildTodaysMealsScreen';
import BuildMealCustomizeScreen from '../screens/BuildMealCustomizeScreen';
import MealsScreen from '../screens/MealsScreen';
import MealDetailScreen from '../screens/MealDetailScreen';
import OrderScreen from '../screens/OrderScreen';
import ChoosePlanScreen from '../screens/checkout/ChoosePlanScreen';
import FulfillmentChoiceScreen from '../screens/checkout/FulfillmentChoiceScreen';
import FulfillmentDetailsScreen from '../screens/checkout/FulfillmentDetailsScreen';
import OrderSummaryScreen from '../screens/checkout/OrderSummaryScreen';
import OrderConfirmScreen from '../screens/checkout/OrderConfirmScreen';
import OrderSubmittedScreen from '../screens/checkout/OrderSubmittedScreen';
import OrderPaymentScreen from '../screens/checkout/OrderPaymentScreen';
import OrderPaymentSuccessScreen from '../screens/checkout/OrderPaymentSuccessScreen';

const Stack = createNativeStackNavigator();

export default function MealsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MealsList" component={BuildTodaysMealsScreen} />
      <Stack.Screen name="BuildMealCustomize" component={BuildMealCustomizeScreen} />
      <Stack.Screen name="MealBrowse" component={MealsScreen} />
      <Stack.Screen name="MealDetail" component={MealDetailScreen} />
      <Stack.Screen name="ChoosePlan" component={ChoosePlanScreen} />
      <Stack.Screen name="FulfillmentChoice" component={FulfillmentChoiceScreen} />
      <Stack.Screen name="FulfillmentDetails" component={FulfillmentDetailsScreen} />
      <Stack.Screen name="OrderSummary" component={OrderSummaryScreen} />
      <Stack.Screen name="OrderConfirm" component={OrderConfirmScreen} />
      <Stack.Screen name="OrderSubmitted" component={OrderSubmittedScreen} />
      <Stack.Screen name="OrderPayment" component={OrderPaymentScreen} />
      <Stack.Screen name="OrderPaymentSuccess" component={OrderPaymentSuccessScreen} />
      <Stack.Screen name="Checkout" component={OrderScreen} />
    </Stack.Navigator>
  );
}
