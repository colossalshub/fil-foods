import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import HomeScreen from '../screens/visitor/HomeScreen';
import MealsStack from './MealsStack';
import PlaceholderScreen from '../screens/PlaceholderScreen';
import AppButton from '../components/AppButton';
import { MSG } from '../data/messages';
import { setPendingDestination } from './pendingDestination';
import { CartProvider } from '../context/CartContext';
import { colors, shadow } from '../theme/theme';

const Tab = createBottomTabNavigator();
const ICONS = { Home: 'home', Meals: 'restaurant', Orders: 'receipt', Account: 'person' };
const TAB_CONTENT_HEIGHT = 64;

function GuestGate({ title, icon, destination }) {
  const navigation = useNavigation();
  return (
    <PlaceholderScreen title={title} icon={icon} message={MSG.guestGate}>
      <AppButton
        title="Log in"
        onPress={() => {
          setPendingDestination(destination);
          navigation.getParent()?.navigate('Login');
        }}
        style={{ alignSelf: 'stretch' }}
      />
    </PlaceholderScreen>
  );
}

function GuestOrders() {
  return <GuestGate title="Orders" icon="receipt-outline" destination="Orders" />;
}

function GuestAccount() {
  return <GuestGate title="Account" icon="person-outline" destination="Account" />;
}

export default function VisitorTabs() {
  const insets = useSafeAreaInsets();
  return (
    <CartProvider>
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.inactive,
        tabBarLabelStyle: { fontSize: 12, lineHeight: 16, flexShrink: 0 },
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopWidth: 0,
          height: TAB_CONTENT_HEIGHT + insets.bottom,
          paddingBottom: insets.bottom,
          ...shadow,
          shadowOffset: { width: 0, height: -4 },
        },
        tabBarIcon: ({ focused, color, size }) => (
          <Ionicons name={focused ? ICONS[route.name] : `${ICONS[route.name]}-outline`} size={size} color={color} />
        ),
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Meals" component={MealsStack} options={{ tabBarLabel: 'Meal' }} />
      <Tab.Screen name="Orders" component={GuestOrders} />
      <Tab.Screen name="Account" component={GuestAccount} />
    </Tab.Navigator>
    </CartProvider>
  );
}
