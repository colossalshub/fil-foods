import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import HomeScreen from '../screens/HomeScreen';
import MealsStack from './MealsStack';
import AccountStack from './AccountStack';
import { CartProvider } from '../context/CartContext';
import TrackingStack from './TrackingStack';
import { colors } from '../theme/theme';

const Tab = createBottomTabNavigator();
const ICONS = {
  Home: 'home', Meals: 'restaurant', Orders: 'receipt', Account: 'person',
};
// Icon row plus label. The default 49px bar shrinks the label on web and clips it.
const TAB_CONTENT_HEIGHT = 64;

export default function MainTabs() {
  const insets = useSafeAreaInsets();

  return (
    <CartProvider>
    <Tab.Navigator
      initialRouteName="Home"
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
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Meals" component={MealsStack} />
      <Tab.Screen name="Orders" component={TrackingStack} />
      <Tab.Screen name="Account" component={AccountStack} />
    </Tab.Navigator>
    </CartProvider>
  );
}
