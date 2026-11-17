import { type ComponentType } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AdminTabBar } from './components/AdminTabBar.js';
import { PhoneFrame } from './components.js';
import { AdminProvider, useAdmin } from './context.js';
import {
  CheckEmailScreen,
  ForgotPasswordScreen,
  ResetPasswordScreen,
  RoleSelectScreen,
  SignInRequiredScreen,
  StaffLoginScreen,
} from './screens/AuthScreens.js';
import { DashboardScreen, NotificationsScreen } from './screens/DashboardScreen.js';
import { MenuFormScreen, MenuScreen } from './screens/MenuScreen.js';
import { OrderDetailScreen, OrdersScreen } from './screens/OrdersScreen.js';
import { RoleHomeScreen } from './screens/RoleHomeScreen.js';
import {
  AboutScreen,
  AuditScreen,
  EditProfileScreen,
  HelpScreen,
  PreferencesScreen,
  SettingsScreen,
} from './screens/SettingsScreen.js';
import { CustomerDetailScreen, CustomersScreen } from './screens/CustomerScreens.js';
import {
  AllergiesPreferencesScreen,
  DietitianDashboardScreen,
  RemovalRequestScreen,
  RemovalRequestsScreen,
} from './screens/DietitianScreens.js';
import { KitchenDashboardScreen } from './screens/KitchenScreens.js';
import { homeRouteFor, type ScreenProps } from './nav.js';
import { NotificationsScreen as InboxScreen } from './screens/InboxScreen.js';
import { StaffNotificationsScreen } from './screens/StaffNotificationsScreen.js';
import { StaffFormScreen, StaffScreen } from './screens/StaffScreen.js';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function screen(component: ComponentType<never>) {
  return component as unknown as ComponentType<object>;
}

function useStackOptions() {
  const { colors } = useAdmin();
  return { headerShown: false, contentStyle: { backgroundColor: colors.page } };
}

function DashboardStack() {
  return (
    <Stack.Navigator screenOptions={useStackOptions()}>
      <Stack.Screen name="DashboardHome" component={screen(DashboardScreen)} />
      <Stack.Screen name="Notifications" component={screen(NotificationsScreen)} />
    </Stack.Navigator>
  );
}

function OrdersStack() {
  return (
    <Stack.Navigator screenOptions={useStackOptions()}>
      <Stack.Screen name="OrdersHome" component={screen(OrdersScreen)} />
    </Stack.Navigator>
  );
}

function MenuStack() {
  return (
    <Stack.Navigator screenOptions={useStackOptions()}>
      <Stack.Screen name="MenuHome" component={screen(MenuScreen)} />
      <Stack.Screen name="MenuForm" component={screen(MenuFormScreen)} />
    </Stack.Navigator>
  );
}

function StaffTabStack() {
  return (
    <Stack.Navigator screenOptions={useStackOptions()}>
      <Stack.Screen name="StaffHome" component={screen(StaffScreen)} />
      <Stack.Screen name="StaffForm" component={screen(StaffFormScreen)} />
    </Stack.Navigator>
  );
}

function SettingsStack() {
  return (
    <Stack.Navigator screenOptions={useStackOptions()}>
      <Stack.Screen name="SettingsHome" component={screen(SettingsScreen)} />
      <Stack.Screen name="EditProfile" component={screen(EditProfileScreen)} />
      <Stack.Screen name="Preferences" component={screen(PreferencesScreen)} />
      <Stack.Screen name="Help" component={screen(HelpScreen)} />
      <Stack.Screen name="About" component={screen(AboutScreen)} />
      <Stack.Screen name="Audit" component={screen(AuditScreen)} />
      <Stack.Screen name="Customers" component={screen(CustomersScreen)} />
    </Stack.Navigator>
  );
}

function AdminTabs() {
  const { colors } = useAdmin();
  return (
    <PhoneFrame>
      <Tab.Navigator
        tabBar={(props) => <AdminTabBar {...props} />}
        screenOptions={{
          headerShown: false,
          sceneStyle: { backgroundColor: colors.page },
        }}
      >
        <Tab.Screen name="Dashboard" component={DashboardStack} />
        <Tab.Screen name="Orders" component={OrdersStack} />
        <Tab.Screen name="Menu" component={MenuStack} />
        <Tab.Screen name="Staff" component={StaffTabStack} />
        <Tab.Screen name="Settings" component={SettingsStack} />
      </Tab.Navigator>
    </PhoneFrame>
  );
}

/** The Dashboard each non-admin role lands on (DIT-10, KIT-10, DEL-10). */
function RoleDashboardHome(props: ScreenProps) {
  const { session } = useAdmin();
  if (session?.role === 'kitchen') return <KitchenDashboardScreen {...props} />;
  return <DietitianDashboardScreen {...props} />;
}

/** Dashboard stack per role (DIT-10, KIT, DEL dashboards). */
function RoleDashboardStack() {
  return (
    <Stack.Navigator screenOptions={useStackOptions()}>
      <Stack.Screen name="RoleDashboard" component={screen(RoleDashboardHome)} />
      <Stack.Screen name="AllergiesPrefs" component={screen(AllergiesPreferencesScreen)} />
      <Stack.Screen name="Customers" component={screen(CustomersScreen)} />
    </Stack.Navigator>
  );
}

function RoleSettingsStack() {
  return (
    <Stack.Navigator screenOptions={useStackOptions()}>
      <Stack.Screen name="SettingsHome" component={screen(SettingsScreen)} />
      <Stack.Screen name="EditProfile" component={screen(EditProfileScreen)} />
      <Stack.Screen name="Preferences" component={screen(PreferencesScreen)} />
      <Stack.Screen name="Help" component={screen(HelpScreen)} />
      <Stack.Screen name="About" component={screen(AboutScreen)} />
    </Stack.Navigator>
  );
}

/** DIT-16 / KIT / DEL: Dashboard, Orders, Menu and Settings only; no Staff tab. */
function RoleTabs() {
  const { colors } = useAdmin();
  return (
    <PhoneFrame>
      <Tab.Navigator
        tabBar={(props) => <AdminTabBar {...props} />}
        screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.page } }}
      >
        <Tab.Screen name="Dashboard" component={RoleDashboardStack} />
        <Tab.Screen name="Orders" component={OrdersStack} />
        <Tab.Screen name="Menu" component={MenuStack} />
        <Tab.Screen name="Settings" component={RoleSettingsStack} />
      </Tab.Navigator>
    </PhoneFrame>
  );
}

function StaffStack() {
  const { ready, session, colors } = useAdmin();
  if (!ready) {
    return (
      <PhoneFrame>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.green} />
        </View>
      </PhoneFrame>
    );
  }
  const initial = session ? homeRouteFor(session.role) : 'RoleSelect';
  return (
    <Stack.Navigator initialRouteName={initial} screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.page } }}>
      <Stack.Screen name="RoleSelect" component={screen(RoleSelectScreen)} />
      <Stack.Screen name="StaffLogin" component={screen(StaffLoginScreen)} />
      <Stack.Screen name="ForgotPassword" component={screen(ForgotPasswordScreen)} />
      <Stack.Screen name="CheckEmail" component={screen(CheckEmailScreen)} />
      <Stack.Screen name="ResetPassword" component={screen(ResetPasswordScreen)} />
      <Stack.Screen name="SignInRequired" component={screen(SignInRequiredScreen)} />
      <Stack.Screen name="AdminApp" component={AdminTabs} />
      <Stack.Screen name="RoleApp" component={RoleTabs} />
      <Stack.Screen name="RoleHome" component={screen(RoleHomeScreen)} />
      <Stack.Screen name="RemovalRequests" component={screen(RemovalRequestsScreen)} />
      <Stack.Screen name="RemovalRequest" component={screen(RemovalRequestScreen)} />
      <Stack.Screen name="OrderDetail" component={screen(OrderDetailScreen)} />
      <Stack.Screen name="CustomerDetail" component={screen(CustomerDetailScreen)} />
      <Stack.Screen name="StaffNotifications" component={screen(StaffNotificationsScreen)} />
      <Stack.Screen name="Inbox" component={screen(InboxScreen)} />
    </Stack.Navigator>
  );
}

export default function StaffNavigator() {
  return (
    <AdminProvider>
      <StaffStack />
    </AdminProvider>
  );
}
