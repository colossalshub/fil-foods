import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MealsScreen from '../screens/MealsScreen';
import MealDetailScreen from '../screens/MealDetailScreen';

const Stack = createNativeStackNavigator();

export default function MealsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MealsList" component={MealsScreen} />
      <Stack.Screen name="MealDetail" component={MealDetailScreen} />
    </Stack.Navigator>
  );
}
