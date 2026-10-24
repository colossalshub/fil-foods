import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MealsStack from './MealsStack';
import { CartProvider } from '../context/CartContext';
import OrderScreen from '../screens/OrderScreen';
import TrackingStack from './TrackingStack';
import AlertsScreen from '../screens/AlertsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import { colors } from '../theme/theme';

const Tab = createBottomTabNavigator();
const ICONS = {
  Meals: 'restaurant', Order: 'cart', Tracking: 'location', Alerts: 'notifications', Profile: 'person',
};
// Icon row plus label. The default 49px bar shrinks the label on web and clips it.
const TAB_CONTENT_HEIGHT = 64;

export default function MainTabs() {
  const insets = useSafeAreaInsets();

  return (
    <CartProvider>
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.inactive,
        tabBarLabelStyle: { fontSize: 11, lineHeight: 16, flexShrink: 0 },
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopColor: colors.border,
          height: TAB_CONTENT_HEIGHT + insets.bottom,
          paddingBottom: insets.bottom,
        },
        tabBarIcon: ({ focused, color, size }) => (
          <Ionicons name={focused ? ICONS[route.name] : `${ICONS[route.name]}-outline`} size={size} color={color} />
        ),
      })}
    >
      <Tab.Screen name="Meals" component={MealsStack} />
      <Tab.Screen name="Order" component={OrderScreen} />
      <Tab.Screen name="Tracking" component={TrackingStack} />
      <Tab.Screen name="Alerts" component={AlertsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
    </CartProvider>
  );
}
