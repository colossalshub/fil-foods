import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
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
import { colors, shadow } from '../theme/theme';

const Tab = createBottomTabNavigator();

const TAB_CONTENT_HEIGHT = 64;

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
      screenOptions={() => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.inactive,
        tabBarLabelStyle: { fontSize: 16, lineHeight: 20, flexShrink: 0 },
        tabBarItemStyle: { marginVertical: 0 },
        tabBarIconStyle: { height: 0, width: 0 },
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopWidth: 1,
          borderTopColor: '#E6EBE3',
          height: TAB_CONTENT_HEIGHT + insets.bottom,
          paddingBottom: insets.bottom,
          ...shadow,
          shadowOffset: { width: 0, height: -4 },
        },
        tabBarIcon: () => null,
        tabBarLabel: ({ focused, color, children }) => (
          <View style={styles.tabLabel}>
            <Text style={{ color, fontSize: 16, fontWeight: focused ? '700' : '500' }}>{children}</Text>
            <View style={[styles.tabMark, { backgroundColor: focused ? colors.primary : 'transparent' }]} />
          </View>
        ),
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen
        name="Meals"
        component={MealsStack}
        options={{ tabBarLabel: 'Meal' }}
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

const styles = StyleSheet.create({
  tabLabel: { alignItems: 'center', justifyContent: 'center', minHeight: 36 },
  tabMark: { marginTop: 4, width: 22, height: 3, borderRadius: 2 },
});
