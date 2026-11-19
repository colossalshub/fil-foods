import { useState } from 'react';
import { CommonActions, StackActions } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import HomeScreen from '../screens/HomeScreen';
import MealsStack from './MealsStack';
import AccountStack from './AccountStack';
import { CartProvider } from '../context/CartContext';
import { CheckoutProvider } from '../context/CheckoutContext';
import TrackingStack from './TrackingStack';
import { consumePendingDestination } from './pendingDestination';
import { FloatingTabBar, floatingTabScreenOptions } from './floatingTabBar';

const Tab = createBottomTabNavigator();

export default function MainTabs() {
  const insets = useSafeAreaInsets();
  const [initialRoute] = useState(() => {
    const pending = consumePendingDestination();
    return pending === 'Orders' || pending === 'Account' || pending === 'Meals' || pending === 'Home'
      ? pending
      : 'Home';
  });

  return (
    <CartProvider>
    <CheckoutProvider>
    <Tab.Navigator
      initialRouteName={initialRoute}
      tabBar={(props) => <FloatingTabBar {...props} />}
      safeAreaInsets={{ ...insets, bottom: 0 }}
      screenOptions={({ route }) => floatingTabScreenOptions(route, insets)}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen
        name="Meals"
        component={MealsStack}
        listeners={({ navigation }) => ({
          tabPress: (event) => {
            event.preventDefault();
            const state = navigation.getState();
            const meals = state.routes.find((route) => route.name === 'Meals');
            const nested = meals?.state;
            const hasList = nested?.routes?.some((route) => route.name === 'MealsList');
            if (!nested || hasList) {
              navigation.navigate('Meals', { screen: 'MealsList' });
              return;
            }
            navigation.dispatch(
              CommonActions.reset({
                index: state.routes.findIndex((route) => route.name === 'Meals'),
                routes: state.routes.map((route) => (
                  route.name === 'Meals'
                    ? { name: 'Meals', state: { index: 0, routes: [{ name: 'MealsList' }] } }
                    : route
                )),
              } as never),
            );
          },
        })}
      />
      <Tab.Screen
        name="Orders"
        component={TrackingStack}
        listeners={({ navigation }) => ({
          tabPress: (event) => {
            event.preventDefault();
            navigation.navigate('Orders', { screen: 'TrackingList' });
          },
        })}
      />
      <Tab.Screen
        name="Account"
        component={AccountStack}
        listeners={({ navigation }) => ({
          tabPress: (event) => {
            const state = navigation.getState();
            const account = state.routes.find((route) => route.name === 'Account');
            const nested = account?.state;
            const current = nested?.routes?.[nested.index ?? 0]?.name;
            if (!nested || current === 'AccountMain') return;

            event.preventDefault();
            const hasAccountPage = nested.routes.some((route) => route.name === 'AccountMain');
            if (hasAccountPage) {
              navigation.dispatch({ ...StackActions.popToTop(), target: nested.key });
              if (state.routes[state.index]?.name !== 'Account') {
                navigation.navigate('Account');
              }
              return;
            }
            navigation.dispatch(
              CommonActions.reset({
                index: state.routes.findIndex((route) => route.name === 'Account'),
                routes: state.routes.map((route) => (
                  route.name === 'Account'
                    ? { name: 'Account', state: { index: 0, routes: [{ name: 'AccountMain' }] } }
                    : route
                )),
              } as never),
            );
          },
        })}
      />
    </Tab.Navigator>
    </CheckoutProvider>
    </CartProvider>
  );
}