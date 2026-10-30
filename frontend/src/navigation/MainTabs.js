import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import HomeScreen from '../screens/HomeScreen';
import MealsStack from './MealsStack';
import AccountStack from './AccountStack';
import { CartProvider } from '../context/CartContext';
import TrackingStack from './TrackingStack';
import { consumePendingDestination } from './pendingDestination';
import { colors, shadow } from '../theme/theme';

const Tab = createBottomTabNavigator();

const styles = StyleSheet.create({
  activeIcon: {
    width: 56,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.soft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
const ICONS = {
  Home: 'home', Meals: 'restaurant', Orders: 'receipt', Account: 'person',
};
// Icon row plus label. The default 49px bar shrinks the label on web and clips it.
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
    <Tab.Navigator
      initialRouteName={initialRoute}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.inactive,
        tabBarLabelStyle: { fontSize: 11, lineHeight: 16, flexShrink: 0 },
        tabBarItemStyle: { marginVertical: 0 },
        tabBarIconStyle: { width: 64, height: 32 },
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopWidth: 0,
          height: TAB_CONTENT_HEIGHT + insets.bottom,
          paddingBottom: insets.bottom,
          ...shadow,
          shadowOffset: { width: 0, height: -4 },
        },
        tabBarIcon: ({ focused, color, size }) => (
          <View style={focused ? styles.activeIcon : null}>
            <Ionicons name={focused ? ICONS[route.name] : `${ICONS[route.name]}-outline`} size={size} color={color} />
          </View>
        ),
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Meals" component={MealsStack} options={{ tabBarLabel: 'Meal' }} />
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
      <Tab.Screen name="Account" component={AccountStack} />
    </Tab.Navigator>
    </CartProvider>
  );
}
