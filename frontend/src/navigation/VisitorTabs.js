import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import HomeScreen from '../screens/visitor/HomeScreen';
import AboutScreen from '../screens/visitor/AboutScreen';
import MealsStack from './MealsStack';
import { CartProvider } from '../context/CartContext';
import PlaceholderScreen from '../screens/PlaceholderScreen';
import AppButton from '../components/AppButton';
import { colors } from '../theme/theme';

const Tab = createBottomTabNavigator();
const ICONS = { Home: 'home', Meals: 'restaurant', About: 'information-circle', Account: 'person' };
const TAB_CONTENT_HEIGHT = 64;

function VisitorAccount({ navigation }) {
  return (
    <PlaceholderScreen title="Account" icon="person-outline" message="Log in to view your account.">
      <AppButton title="Log in" onPress={() => navigation.getParent()?.navigate('Login')} style={{ alignSelf: 'stretch' }} />
    </PlaceholderScreen>
  );
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
      <Tab.Screen name="About" component={AboutScreen} />
      <Tab.Screen
        name="Account"
        component={VisitorAccount}
        listeners={({ navigation }) => ({
          tabPress: (event) => {
            event.preventDefault();
            navigation.getParent()?.navigate('Login');
          },
        })}
      />
    </Tab.Navigator>
    </CartProvider>
  );
}
