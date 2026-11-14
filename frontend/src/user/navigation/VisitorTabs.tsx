import type { ComponentProps } from 'react';
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
import { FloatingTabBar, floatingTabScreenOptions } from './floatingTabBar';

const Tab = createBottomTabNavigator();

function GuestGate({ title, icon, destination }: {
  title: string;
  icon: ComponentProps<typeof Ionicons>['name'];
  destination: string;
}) {
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
  return <GuestGate title="My Orders" icon="lock-closed-outline" destination="Orders" />;
}

function GuestAccount() {
  return <GuestGate title="Account" icon="lock-closed-outline" destination="Account" />;
}

export default function VisitorTabs() {
  const insets = useSafeAreaInsets();
  return (
    <CartProvider>
    <Tab.Navigator
      tabBar={(props) => <FloatingTabBar {...props} />}
      safeAreaInsets={{ ...insets, bottom: 0 }}
      screenOptions={({ route }) => floatingTabScreenOptions(route, insets)}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Meals" component={MealsStack} />
      <Tab.Screen name="Orders" component={GuestOrders} />
      <Tab.Screen name="Account" component={GuestAccount} />
    </Tab.Navigator>
    </CartProvider>
  );
}